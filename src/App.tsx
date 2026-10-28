import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ValuationForm } from './components/ValuationForm';
import { ValuationResult } from './components/ValuationResult';
import { DecisionModal } from './components/DecisionModal';
import { AdminPanel } from './components/AdminPanel';
import { Presentation3D } from './components/Presentation3D';
import { ValuationService } from './services/valuationEngine';
import { PredictionInput, PredictionResult, ModelComparisonData } from './types';
import './styles.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'valuation' | 'admin' | 'presentation'>('valuation');
  const [brandModels, setBrandModels] = useState<Record<string, string[]>>(() => ValuationService.getBrandModels());
  const [activeModel, setActiveModel] = useState<ModelComparisonData>(() => ValuationService.getActiveModel());
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [lastInput, setLastInput] = useState<PredictionInput | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBrandModels(ValuationService.getBrandModels());
    setActiveModel(ValuationService.getActiveModel());
  }, []);

  const handlePredict = (payload: PredictionInput) => {
    try {
      setFormError('');
      const pred = ValuationService.predict(payload);
      setLastInput(payload);
      setResult(pred);

      // If asking price provided, open the decision modal automatically as in original app
      if (pred.asking_price !== null && pred.asking_price !== undefined) {
        setIsModalOpen(true);
      }

      // Smooth scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e: any) {
      setFormError(e.message || 'Prediction failed');
    }
  };

  const handleModelUpdate = () => {
    setActiveModel(ValuationService.getActiveModel());
  };

  return (
    <div>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        modelVersion={activeModel.version || 'v1'}
        bestAlgorithm={activeModel.best?.algorithm}
      />

      <main className="wrap">
        {activeTab === 'valuation' ? (
          <>
            <section className="hero">
              <div>
                <div className="eyebrow">USED-CAR MARKET VALUE</div>
                <h1>Know the fair value before you buy or sell.</h1>
                <p>
                  Enter the vehicle details to estimate a data-driven market value from historical used-car listings.
                </p>
              </div>
            </section>

            <ValuationForm
              brandModels={brandModels}
              onSubmit={handlePredict}
              externalError={formError}
            />

            <div ref={resultRef}>
              {result && (
                <ValuationResult
                  result={result}
                  input={lastInput}
                  onOpenModal={() => setIsModalOpen(true)}
                />
              )}
            </div>

            {result && (
              <DecisionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                result={result}
              />
            )}
          </>
        ) : activeTab === 'admin' ? (
          <AdminPanel
            activeModel={activeModel}
            onModelUpdate={handleModelUpdate}
          />
        ) : (
          <Presentation3D />
        )}

        <footer>
          For transparency and decision support. Not a guarantee of resale or purchase price.
        </footer>
      </main>
    </div>
  );
};

export default App;
