import React from 'react';

interface HeaderProps {
  activeTab: 'valuation' | 'admin' | 'presentation';
  setActiveTab: (tab: 'valuation' | 'admin' | 'presentation') => void;
  modelVersion: string;
  bestAlgorithm?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  modelVersion,
  bestAlgorithm
}) => {
  return (
    <header className="topbar">
      <div className="brand-wrapper">
        <div className="brand" onClick={() => setActiveTab('valuation')}>
          <span>🚗</span>
          <span>CarValue</span>
          <span className="version-pill" title={`Active model: ${bestAlgorithm || 'XGBoost'}`}>
            {modelVersion}
          </span>
        </div>
        <div className="tagline">Transparent used-car valuation</div>
      </div>

      <nav className="topbar-nav">
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'valuation' ? 'active' : ''}`}
          onClick={() => setActiveTab('valuation')}
        >
          Valuation
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin')}
        >
          Admin
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeTab === 'presentation' ? 'active' : ''}`}
          onClick={() => setActiveTab('presentation')}
          style={{
            background: activeTab === 'presentation' ? 'linear-gradient(135deg, #0284c7, #4f46e5)' : undefined,
            color: activeTab === 'presentation' ? '#ffffff' : '#0369a1',
            fontWeight: 800
          }}
        >
          ✨ 3D Project PPT
        </button>
      </nav>
    </header>
  );
};
