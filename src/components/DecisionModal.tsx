import React from 'react';
import { PredictionResult } from '../types';
import { formatMoney } from './ValuationResult';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: PredictionResult;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  onClose,
  result
}) => {
  if (!isOpen) return null;

  const diff = result.difference ?? 0;
  const isAbove = diff > 0;
  const isBelow = diff < 0;

  const badgeText = isAbove
    ? '⚠️ ABOVE MARKET VALUE'
    : isBelow
    ? '✓ BELOW MARKET VALUE'
    : '— FAIR MARKET PRICE';

  const badgeColor = isAbove ? '#b42318' : isBelow ? '#027a48' : '#344054';

  const diffText = `${formatMoney(diff)} (${result.difference_percent}% ${
    isAbove ? 'above' : isBelow ? 'below' : 'relative to'
  } estimate)`;

  return (
    <div
      id="decisionModal"
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decisionTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <button
          type="button"
          className="modal-close"
          id="closeModal"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        <div
          id="modalBadge"
          className="modal-badge"
          style={{ color: badgeColor }}
        >
          {badgeText}
        </div>

        <h2 id="decisionTitle">{result.assessment || 'Market Assessment'}</h2>

        <p id="modalSummary">{result.recommendation}</p>

        <div className="modal-stat">
          <span>Estimated value</span>
          <b id="modalEstimate">{formatMoney(result.estimated_value)}</b>
        </div>

        <div className="modal-stat">
          <span>Seller asking price</span>
          <b id="modalAsking">{formatMoney(result.asking_price)}</b>
        </div>

        <div className="modal-stat">
          <span>Difference</span>
          <b id="modalDifference">{diffText}</b>
        </div>

        <div className="modal-actions">
          <div>
            <strong>Buyer:</strong>{' '}
            <span id="modalBuyer">{result.buyer_action || '—'}</span>
          </div>
          <div>
            <strong>Seller:</strong>{' '}
            <span id="modalSeller">{result.seller_action || '—'}</span>
          </div>
        </div>

        <button
          type="button"
          className="modal-ok"
          id="modalOk"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  );
};
