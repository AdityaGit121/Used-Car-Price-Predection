import React, { useState } from 'react';
import { PredictionResult, PredictionInput } from '../types';

interface ValuationResultProps {
  result: PredictionResult;
  input?: PredictionInput | null;
  onOpenModal: () => void;
}

export const formatMoney = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n)) return '₹ —';
  return '₹' + Math.round(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const ValuationResult: React.FC<ValuationResultProps> = ({
  result,
  input,
  onOpenModal
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const handleDownloadReport = () => {
    const reportData = {
      title: "CarValue — Used Car Market Valuation Report",
      generated_at: new Date().toISOString(),
      model_version: result.model_version,
      vehicle_specifications: input ? {
        brand: input.Brand,
        model: input.model,
        year: input.Year,
        age_years: input.Age,
        km_driven: input.kmDriven_num,
        fuel_type: input.FuelType,
        transmission: input.Transmission,
        ownership: input.Owner
      } : null,
      market_valuation: {
        estimated_fair_value_inr: result.estimated_value,
        market_error_range: {
          low_inr: result.estimated_range.low,
          high_inr: result.estimated_range.high
        },
        seller_asking_price_inr: result.asking_price,
        variance_amount_inr: result.difference,
        variance_percentage: result.difference_percent,
        market_assessment: result.assessment,
        recommendation: result.recommendation,
        buyer_guidance: result.buyer_action,
        seller_guidance: result.seller_action
      },
      disclaimer: "The estimated range represents a model-based market-error band from historical listings. It is for decision support and not a guarantee of resale or purchase price."
    };

    const fileName = `carvalue-report-${input?.Brand || 'car'}-${input?.model || 'valuation'}-${Date.now()}.json`;
    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <section id="result" className="result">
      <div className="result-main">
        <div className="eyebrow">ESTIMATED USED-CAR MARKET VALUE</div>
        <div id="price" className="price">
          {formatMoney(result.estimated_value)}
        </div>
        <div className="range-label">Estimated market range</div>
        <div className="range">
          <span id="low">{formatMoney(result.estimated_range.low)}</span>
          <div className="line">
            <i></i>
          </div>
          <span id="high">{formatMoney(result.estimated_range.high)}</span>
        </div>
        <p className="small">
          The range represents a model-based market-error band; it is an estimate, not a guaranteed transaction price.
        </p>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-download"
            onClick={handleDownloadReport}
            title="Export full valuation data and advice as JSON"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              fontSize: '13px'
            }}
          >
            <span>📥</span>
            <span>{downloadSuccess ? 'Downloaded JSON ✓' : 'Download Report'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrintReport}
            title="Print or Save as PDF"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              fontSize: '13px'
            }}
          >
            <span>🖨️</span>
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      <div className="assessment">
        <div className="eyebrow">MARKET ASSESSMENT</div>
        <div id="assessment" className="assessment-title">
          {result.assessment || 'Add asking price to compare'}
        </div>
        <div id="comparison" className="comparison">
          {result.asking_price !== null && result.asking_price !== undefined ? (
            <>
              <div>
                Seller asking price <b>{formatMoney(result.asking_price)}</b>
              </div>
              <div>
                Difference from estimate{' '}
                <b>{formatMoney(result.difference)}</b> ({result.difference_percent}%)
              </div>
            </>
          ) : (
            <div>Add a seller asking price above to see the market comparison.</div>
          )}
        </div>

        {result.recommendation && (
          <div id="recommendation" className="recommendation">
            <strong>Recommendation</strong>
            <p>{result.recommendation}</p>
          </div>
        )}

        {result.asking_price !== null && result.asking_price !== undefined && (
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', fontSize: '13px', padding: '10px 14px' }}
              onClick={onOpenModal}
            >
              View Full Decision Guidance ↗
            </button>
          </div>
        )}
      </div>

      <div className="why">
        <h3>Why this valuation?</h3>
        <div className="chips">
          <span>✓ Brand & model</span>
          <span>✓ Vehicle age</span>
          <span>✓ Kilometres driven</span>
          <span>✓ Fuel type</span>
          <span>✓ Transmission</span>
          <span>✓ Ownership history</span>
        </div>
        <p>
          These are the vehicle attributes used by the valuation model. The estimate is based on historical listings in the supplied dataset.
        </p>
      </div>
    </section>
  );
};
