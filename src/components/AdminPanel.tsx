import React, { useState } from 'react';
import { ModelComparisonData, ModelMetric } from '../types';
import { ValuationService } from '../services/valuationEngine';

interface AdminPanelProps {
  activeModel: ModelComparisonData;
  onModelUpdate: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  activeModel,
  onModelUpdate
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [consoleOutput, setConsoleOutput] = useState<string>('Ready.');
  const [candidateModel, setCandidateModel] = useState<ModelComparisonData | null>(
    ValuationService.getCandidateModel()
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const displayOutput = (data: any) => {
    if (typeof data === 'string') {
      setConsoleOutput(data);
    } else {
      setConsoleOutput(JSON.stringify(data, null, 2));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        displayOutput('Error: Only CSV files are supported.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string || '');
      };
      reader.readAsText(file);
      displayOutput(`File selected: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    }
  };

  const handleUploadAndValidate = () => {
    if (!selectedFile || !fileContent) {
      displayOutput('Choose a CSV first.');
      return;
    }

    const report = ValuationService.validateDatasetText(fileContent);
    if (!report.valid) {
      displayOutput({
        error: report.error || 'Dataset validation failed.',
        missing_required: report.validation.missing_required
      });
      return;
    }

    displayOutput({
      message: 'Dataset uploaded and validated.',
      filename: selectedFile.name,
      rows: report.rows,
      validation: report.validation
    });
  };

  const handleValidateLatest = () => {
    if (!fileContent) {
      displayOutput('Upload a dataset first.');
      return;
    }

    const report = ValuationService.validateDatasetText(fileContent);
    if (!report.valid) {
      displayOutput({
        valid: false,
        error: report.error
      });
      return;
    }

    displayOutput({
      valid: true,
      rows: report.rows,
      validation: report.validation,
      columns: report.columns
    });
  };

  const handleRetrain = () => {
    setIsProcessing(true);
    displayOutput('Training Linear, Ridge, Lasso, Random Forest, XGBoost and LightGBM...');

    setTimeout(() => {
      let additionalRows = 240;
      if (fileContent) {
        const report = ValuationService.validateDatasetText(fileContent);
        if (report.valid) {
          additionalRows = report.rows;
        }
      }

      const comparison = ValuationService.retrainModels(additionalRows);
      setCandidateModel(comparison);
      setIsProcessing(false);

      displayOutput({
        message: 'Training complete.',
        version: comparison.version,
        best: comparison.best,
        results: comparison.results,
        dataset_rows: comparison.dataset_rows
      });
    }, 800);
  };

  const handleRefreshComparison = () => {
    const candidate = ValuationService.getCandidateModel();
    setCandidateModel(candidate);
    displayOutput('Refreshed model comparison metrics.');
  };

  const handleDeployCandidate = () => {
    if (!candidateModel) {
      displayOutput('No candidate model available to deploy.');
      return;
    }

    const deployResult = ValuationService.deployCandidate(candidateModel);
    displayOutput(deployResult);

    if (deployResult.deployed) {
      setCandidateModel(null);
      onModelUpdate();
    }
  };

  const handleLoadSampleCSV = () => {
    const sampleCSV = `Brand,model,Year,Age,kmDriven,Transmission,Owner,FuelType,AskPrice,PostedDate
Maruti,Swift,2019,5,42000,Manual,First Owner,Petrol,560000,2024-01-10
Hyundai,Creta,2021,3,28000,Automatic,First Owner,Diesel,1420000,2024-01-12
Honda,City,2018,6,65000,Manual,Second Owner,Petrol,720000,2024-01-15
Toyota,Innova Crysta,2020,4,55000,Automatic,First Owner,Diesel,2150000,2024-01-18
Tata,Nexon,2022,2,19000,Manual,First Owner,Petrol,980000,2024-01-20
Mahindra,Thar,2021,3,31000,Manual,First Owner,Diesel,1350000,2024-01-22
Kia,Seltos,2020,4,48000,Automatic,First Owner,Petrol,1280000,2024-01-25
Volkswagen,Polo,2017,7,78000,Manual,Second Owner,Petrol,510000,2024-01-28`;

    setFileContent(sampleCSV);
    const blob = new File([sampleCSV], 'used_cars_batch_q1.csv', { type: 'text/csv' });
    setSelectedFile(blob);
    displayOutput('Loaded sample used car batch CSV (8 records) with all required schema headers.');
  };

  const displayedComparison = candidateModel || activeModel;
  const sortedResults = [...displayedComparison.results].sort((a, b) => a.RMSE - b.RMSE);

  return (
    <div>
      <section className="hero">
        <div>
          <div className="eyebrow">ADMINISTRATION</div>
          <h1>Model & Dataset Management</h1>
          <p>
            Upload data, validate it, retrain candidates, compare metrics, and activate only a better production model.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Dataset management</h2>
            <p>Upload a new batch of used car listings (CSV format with required columns).</p>
          </div>
        </div>

        <div className="admin-actions">
          <input
            id="file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />
          <button type="button" onClick={handleUploadAndValidate} disabled={isProcessing}>
            Upload & Validate
          </button>
          <button type="button" onClick={handleValidateLatest} disabled={isProcessing}>
            Validate Latest Upload
          </button>
          <button type="button" onClick={handleRetrain} disabled={isProcessing}>
            {isProcessing ? 'Retraining...' : 'Retrain All Models'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleLoadSampleCSV}
            title="Load an in-memory sample CSV with valid columns"
          >
            Load Sample CSV
          </button>
        </div>

        <pre id="out">{consoleOutput}</pre>
      </section>

      {candidateModel && (
        <section className="panel" style={{ border: '1px solid #90cdf4', background: '#f7fafc' }}>
          <div className="candidate-banner">
            <div className="candidate-info">
              <h3>New Model Candidate Ready: {candidateModel.version}</h3>
              <p>
                Best algorithm: <b>{candidateModel.best.algorithm}</b> with RMSE ₹
                {candidateModel.best.RMSE.toLocaleString('en-IN', { maximumFractionDigits: 0 })} vs Production RMSE ₹
                {activeModel.best.RMSE.toLocaleString('en-IN', { maximumFractionDigits: 0 })}.
              </p>
            </div>
            <button
              type="button"
              className="btn-success"
              onClick={handleDeployCandidate}
            >
              Deploy {candidateModel.version} to Production
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Model comparison</h2>
            <p>
              Showing {candidateModel ? `candidate (${candidateModel.version})` : `production (${activeModel.version || 'v1'})`} evaluated on 80/20 held-out test split.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={handleRefreshComparison}>
            Refresh Comparison
          </button>
        </div>

        <div id="table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Algorithm</th>
                <th>RMSE (₹)</th>
                <th>MAE (₹)</th>
                <th>R²</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((r, i) => {
                const isBest = r.key === displayedComparison.best.key;
                return (
                  <tr key={r.key} className={isBest ? 'highlight-best' : ''}>
                    <td>{i + 1}</td>
                    <td>
                      {r.algorithm} {isBest ? '⭐ (Best)' : ''}
                    </td>
                    <td>{r.RMSE.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td>{r.MAE.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td>{r.R2.toFixed(4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p style={{ marginTop: '16px', color: '#46515b', fontSize: '14px' }}>
            <b>Best candidate:</b> {displayedComparison.best.algorithm} (Lowest RMSE, secondary MAE / R²).
          </p>
        </div>
      </section>
    </div>
  );
};
