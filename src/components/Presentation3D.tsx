import React, { useState, useEffect } from 'react';

export const Presentation3D: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(-1);
  const [simLog, setSimLog] = useState<string>("Ready. Click 'Trace Pipeline Flow' below to simulate a real-time request.");
  const [simResult, setSimResult] = useState<any>(null);

  const [simBrand, setSimBrand] = useState<string>('Toyota');
  const [simModel, setSimModel] = useState<string>('Innova Crysta');
  const [simYear, setSimYear] = useState<number>(2020);
  const [simKm, setSimKm] = useState<number>(45000);
  const [simAsk, setSimAsk] = useState<number>(2200000);

  const TOTAL_SLIDES = 7;

  useEffect(() => {
    let timer: any = null;
    if (autoPlay) {
      timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES);
      }, 5500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoPlay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES);
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSimulate = () => {
    const age = Math.max(0, new Date().getFullYear() - simYear);
    setSimStep(0);
    setSimLog(`[Step 1 Client] Serialized JSON: { Brand: "${simBrand}", model: "${simModel}", Year: ${simYear}, km: ${simKm} }`);
    setSimResult(null);

    const steps = [
      () => {
        setSimStep(1);
        setSimLog(`[Step 2 Gateway] FastAPI Pydantic schema validated. Age computed as ${age} years. Non-negative constraints passed.`);
      },
      () => {
        setSimStep(2);
        setSimLog(`[Step 3 Preprocessor] ColumnTransformer: OneHot encoded categorical vectors + standard scaled numerical inputs.`);
      },
      () => {
        setSimStep(3);
        setSimLog(`[Step 4 XGBoost Core] Decision trees traversed. Point prediction estimated.`);
      },
      () => {
        setSimStep(4);
        let base = 1200000;
        if (simBrand === 'Toyota') base = 2100000;
        else if (simBrand === 'BMW') base = 4200000;
        else if (simBrand === 'Maruti') base = 650000;
        else if (simBrand === 'Hyundai') base = 1100000;

        const est = Math.round(base * Math.pow(0.92, age));
        const diff = simAsk - est;
        const diffPct = ((Math.abs(diff) / est) * 100).toFixed(1);
        const verdict = Number(diffPct) <= 5 ? 'Fair Market Price' : diff > 0 ? 'Above Market Value' : 'Below Market Value';

        setSimResult({
          est,
          low: Math.max(10000, est - 180000),
          high: est + 180000,
          diff,
          diffPct,
          verdict
        });
        setSimLog(`[Step 5 Decision Matrix] Market error range, divergence, and buyer/seller recommendations computed.`);
      }
    ];

    steps.forEach((fn, idx) => {
      setTimeout(fn, (idx + 1) * 600);
    });
  };

  const slides = [
    // Slide 1
    {
      tag: "01 / EXECUTIVE OVERVIEW",
      title: "CarValue: Used Car Market Value Prediction System",
      subtitle: "A production-grade machine learning platform delivering transparent used-car valuations and negotiation guidance.",
      content: (
        <div className="ppt-grid-3">
          <div className="ppt-card">
            <span className="ppt-card-icon">🎯</span>
            <h3>The Core Problem</h3>
            <p>Used car transactions suffer from extreme information asymmetry. Buyers overpay and sellers underprice due to opaque dealership margins and volatile market rates.</p>
            <span className="ppt-card-badge">Market Inefficiency</span>
          </div>
          <div className="ppt-card">
            <span className="ppt-card-icon">⚡</span>
            <h3>Algorithmic Solution</h3>
            <p>Empirical regression pipeline benchmarked across 6 distinct algorithms with automated feature engineering, robust error banding, and actionable buyer/seller advisories.</p>
            <span className="ppt-card-badge">6 ML Algorithms</span>
          </div>
          <div className="ppt-card">
            <span className="ppt-card-icon">🛡️</span>
            <h3>Production & Offline First</h3>
            <p>100% self-contained architecture with zero external cloud dependencies. Bundled local SQLite audit logging, automated CSV retraining, and one-click execution.</p>
            <span className="ppt-card-badge">100% Offline Capable</span>
          </div>
        </div>
      )
    },
    // Slide 2
    {
      tag: "02 / SYSTEM ARCHITECTURE",
      title: "Modular Multi-Tier Software Architecture",
      subtitle: "Clean separation of concerns across Client Presentation, API Gateway, Machine Learning Pipelines, and Persistence.",
      content: (
        <div className="ppt-grid-2">
          <div className="ppt-card">
            <span className="ppt-card-icon">💻</span>
            <h3>Module 1: Client Layer (SPA / Templates)</h3>
            <p>Built with React 18, TypeScript, and semantic responsive styling. Handles dynamic model selection, auto age derivation, real-time variance calculations, decision popups, and JSON/PDF exports.</p>
            <span className="ppt-card-badge">React + TypeScript / HTML5</span>
          </div>
          <div className="ppt-card">
            <span className="ppt-card-icon">⚙️</span>
            <h3>Module 2: API Gateway (FastAPI)</h3>
            <p>High-performance asynchronous REST backend. Performs strict schema validation via Pydantic models, handles CORS, and exposes <code>/api/predict</code>, <code>/api/options</code>, and <code>/admin/*</code> routes.</p>
            <span className="ppt-card-badge">FastAPI + Uvicorn</span>
          </div>
          <div className="ppt-card">
            <span className="ppt-card-icon">🧠</span>
            <h3>Module 3: Scikit-learn & XGBoost Engine</h3>
            <p>Encapsulated ColumnTransformer preprocessing (median imputer + standard scaler + one-hot encoder) serialised with Joblib for zero data leakage between training and inference.</p>
            <span className="ppt-card-badge">Joblib Pipeline Artifacts</span>
          </div>
          <div className="ppt-card">
            <span className="ppt-card-icon">🗄️</span>
            <h3>Module 4: Storage & Audit Logs</h3>
            <p>Local SQLite database with SQLAlchemy ORM capturing all prediction requests and assessment outcomes without requiring external servers or credentials.</p>
            <span className="ppt-card-badge">SQLite + SQLAlchemy</span>
          </div>
        </div>
      )
    },
    // Slide 3
    {
      tag: "03 / INTEGRATION & DATA CONTRACT",
      title: "How Frontend & Backend Connect in Real-Time",
      subtitle: "Step-by-step lifecycle of an inference request from user interaction to decision advisory.",
      content: (
        <div>
          <div className="flow-diagram">
            <div className="flow-node">
              <div className="node-icon">📝</div>
              <div className="node-title">1. User Input</div>
              <div className="node-desc">Brand, Model, Year, km, Fuel, Trans</div>
            </div>
            <div className="flow-arrow">➔</div>
            <div className="flow-node">
              <div className="node-icon">🌐</div>
              <div className="node-title">2. HTTP POST</div>
              <div className="node-desc">/api/predict (JSON Payload)</div>
            </div>
            <div className="flow-arrow">➔</div>
            <div className="flow-node">
              <div className="node-icon">🛡️</div>
              <div className="node-title">3. Pydantic Guard</div>
              <div className="node-desc">Validates Types & Brand Model hierarchy</div>
            </div>
            <div className="flow-arrow">➔</div>
            <div className="flow-node">
              <div className="node-icon">⚡</div>
              <div className="node-title">4. ML Transform</div>
              <div className="node-desc">Pipeline Preprocessor + XGBoost</div>
            </div>
            <div className="flow-arrow">➔</div>
            <div className="flow-node">
              <div className="node-icon">📊</div>
              <div className="node-title">5. Market Advisory</div>
              <div className="node-desc">Fair Value, ±MAE Band, Buyer/Seller Tips</div>
            </div>
          </div>
          <div className="ppt-card" style={{ marginTop: '20px' }}>
            <h3>Data Contract Schema</h3>
            <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#38bdf8' }}>
              POST /api/predict ➔ &#123; Brand, model, Year, Age, kmDriven_num, Transmission, Owner, FuelType, asking_price &#125;<br />
              RESPONSE ➔ &#123; estimated_value, estimated_range: &#123; low, high &#125;, difference, difference_percent, assessment, recommendation, buyer_action, seller_action &#125;
            </p>
          </div>
        </div>
      )
    },
    // Slide 4
    {
      tag: "04 / MACHINE LEARNING PIPELINE",
      title: "6 Algorithms Benchmarked & Evaluated",
      subtitle: "Rigorous 80/20 train-test split evaluating Root Mean Squared Error (RMSE), Mean Absolute Error (MAE), and R² Score.",
      content: (
        <div>
          <table className="ppt-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Type</th>
                <th>RMSE (₹)</th>
                <th>MAE (₹)</th>
                <th>R² Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="champion-row">
                <td><b>XGBoost Regressor</b></td>
                <td>Gradient Boosted Trees</td>
                <td>₹582,112</td>
                <td>₹213,098</td>
                <td>0.8736</td>
                <td>⭐ Production Champion</td>
              </tr>
              <tr>
                <td>Random Forest Regressor</td>
                <td>Bagged Ensembles (300 trees)</td>
                <td>₹652,066</td>
                <td>₹199,858</td>
                <td>0.8414</td>
                <td>Runner-up Candidate</td>
              </tr>
              <tr>
                <td>Linear Regression</td>
                <td>OLS Baseline</td>
                <td>₹776,145</td>
                <td>₹336,124</td>
                <td>0.7753</td>
                <td>Parametric Baseline</td>
              </tr>
              <tr>
                <td>Lasso Regression</td>
                <td>L1 Regularized (alpha=50)</td>
                <td>₹778,619</td>
                <td>₹335,944</td>
                <td>0.7738</td>
                <td>Feature-sparse Baseline</td>
              </tr>
              <tr>
                <td>Ridge Regression</td>
                <td>L2 Regularized (alpha=1.0)</td>
                <td>₹779,603</td>
                <td>₹336,617</td>
                <td>0.7733</td>
                <td>Collinearity-dampened</td>
              </tr>
              <tr>
                <td>LightGBM Regressor</td>
                <td>Leaf-wise Tree Growth</td>
                <td>₹959,456</td>
                <td>₹326,110</td>
                <td>0.6566</td>
                <td>Speed-optimized Candidate</td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: '14px', color: '#94a3b8', fontSize: '13px' }}>
            <b>Production Retraining Rule:</b> Following model tournament evaluation, the winning algorithm (XGBoost) is refit on 100% of the dataset to maximize real-world precision.
          </p>
        </div>
      )
    },
    // Slide 5
    {
      tag: "05 / MATHEMATICAL FORMULATION",
      title: "Prediction Calculation & Decision Engine",
      subtitle: "Translating raw regression outputs into practical negotiation strategies for buyers and sellers.",
      content: (
        <div className="ppt-grid-3">
          <div className="ppt-card">
            <span className="ppt-card-icon">📐</span>
            <h3>1. Fair Value & Error Band</h3>
            <p>The model infers fair market value <code>Ŷ</code>. The error band is defined as <code>[max(0, Ŷ - MAE), Ŷ + MAE]</code>, providing an honest confidence band reflecting dataset dispersion.</p>
          </div>
          <div className="ppt-card">
            <span className="ppt-card-icon">⚖️</span>
            <h3>2. Asking Price Divergence</h3>
            <p>Calculates variance: <code>Δ = Asking Price - Ŷ</code>.<br />Percentage difference: <code>|Δ| / Ŷ × 100%</code>.<br />Divergences within 5% are classified as <b>Fair Market Price</b>.</p>
          </div>
          <div className="ppt-card">
            <span className="ppt-card-icon">🤝</span>
            <h3>3. Dual Guidance Strategy</h3>
            <p><b>If Above (&gt;5%):</b> Buyer is cautioned to negotiate closer to <code>Ŷ</code>. Seller is advised to lower price.<br /><b>If Below (&lt;-5%):</b> Buyer alert for high deal value. Seller notified of potential underpricing.</p>
          </div>
        </div>
      )
    },
    // Slide 6
    {
      tag: "06 / MLOPS & RETRAINING",
      title: "Admin Management & Production Deployment Gate",
      subtitle: "Ensures continuous model improvement without risking regressions in production accuracy.",
      content: (
        <div className="ppt-grid-2">
          <div className="ppt-card">
            <span className="ppt-card-icon">📂</span>
            <h3>Batch Data Ingestion & Hygiene</h3>
            <p>Admins upload batch CSVs at <code>/admin</code>. The system enforces required schema columns (Brand, Model, Year, Age, kmDriven, Transmission, Owner, FuelType, AskPrice), parses mixed currency and mileage strings, and removes duplicate listings.</p>
          </div>
          <div className="ppt-card">
            <span className="ppt-card-icon">🔒</span>
            <h3>The Automated Safety Gate</h3>
            <p>When retraining is triggered, candidate models are stored in <code>models/registry/v&#123;N&#125;</code>. Activation endpoint <code>/admin/deploy/&#123;v&#125;</code> strictly evaluates: <code>Candidate RMSE &lt; Production RMSE</code>. If the candidate does not beat the champion, it is rejected!</p>
          </div>
        </div>
      )
    },
    // Slide 7
    {
      tag: "07 / LIVE HANDS-ON DEMO",
      title: "Interactive Pipeline Flow Simulator",
      subtitle: "Trigger a live simulated inference request and watch the packet travel across every internal module.",
      content: (
        <div className="simulator-box">
          <div className="sim-controls">
            <select
              className="sim-select"
              value={simBrand}
              onChange={(e) => setSimBrand(e.target.value)}
            >
              <option value="Toyota">Toyota</option>
              <option value="Maruti">Maruti</option>
              <option value="Hyundai">Hyundai</option>
              <option value="BMW">BMW</option>
            </select>
            <select
              className="sim-select"
              value={simModel}
              onChange={(e) => setSimModel(e.target.value)}
            >
              <option value="Innova Crysta">Innova Crysta</option>
              <option value="Swift">Swift</option>
              <option value="Creta">Creta</option>
              <option value="3 Series">3 Series</option>
            </select>
            <input
              type="number"
              className="sim-input"
              value={simYear}
              onChange={(e) => setSimYear(parseInt(e.target.value, 10))}
              style={{ width: '100px' }}
              title="Manufacturing Year"
            />
            <input
              type="number"
              className="sim-input"
              value={simKm}
              onChange={(e) => setSimKm(parseInt(e.target.value, 10))}
              style={{ width: '120px' }}
              title="Kilometres Driven"
            />
            <input
              type="number"
              className="sim-input"
              value={simAsk}
              onChange={(e) => setSimAsk(parseFloat(e.target.value))}
              style={{ width: '140px' }}
              title="Seller Asking Price"
            />
            <button
              type="button"
              className="ppt-btn primary"
              onClick={handleSimulate}
            >
              ⚡ Trace Pipeline Flow
            </button>
          </div>

          <div className="flow-diagram" style={{ marginTop: '24px' }}>
            <div className={`flow-node ${simStep === 0 ? 'active-pulse' : ''}`}>
              <div className="node-icon">📥</div>
              <div className="node-title">1. Client Request</div>
              <div className="node-desc">Payload Prepared</div>
            </div>
            <div className="flow-arrow">➔</div>
            <div className={`flow-node ${simStep === 1 ? 'active-pulse' : ''}`}>
              <div className="node-icon">🛡️</div>
              <div className="node-title">2. API Schema</div>
              <div className="node-desc">Pydantic Cleaned</div>
            </div>
            <div className="flow-arrow">➔</div>
            <div className={`flow-node ${simStep === 2 ? 'active-pulse' : ''}`}>
              <div className="node-icon">⚙️</div>
              <div className="node-title">3. Preprocessor</div>
              <div className="node-desc">OneHot + Imputer</div>
            </div>
            <div className="flow-arrow">➔</div>
            <div className={`flow-node ${simStep === 3 ? 'active-pulse' : ''}`}>
              <div className="node-icon">🌲</div>
              <div className="node-title">4. XGBoost Core</div>
              <div className="node-desc">Inference Executed</div>
            </div>
            <div className="flow-arrow">➔</div>
            <div className={`flow-node ${simStep === 4 ? 'active-pulse' : ''}`}>
              <div className="node-icon">🎯</div>
              <div className="node-title">5. Market Decision</div>
              <div className="node-desc">Band & Advisory</div>
            </div>
          </div>

          <div className="sim-result-box">
            {simResult ? (
              <div style={{ textAlign: 'center', lineHeight: '1.7' }}>
                <div>
                  Estimated Fair Market Value: <b>₹{simResult.est.toLocaleString('en-IN')}</b> | Range: <b>₹{simResult.low.toLocaleString('en-IN')} - ₹{simResult.high.toLocaleString('en-IN')}</b>
                </div>
                <div>
                  Asking Price: <b>₹{simAsk.toLocaleString('en-IN')}</b> (Diff: <b>₹{simResult.diff.toLocaleString('en-IN')}</b>, {simResult.diffPct}%)
                </div>
                <div>
                  Assessment:{' '}
                  <b style={{ color: simResult.diff > 0 ? '#f87171' : '#34d399' }}>
                    {simResult.verdict}
                  </b>
                </div>
              </div>
            ) : (
              <div>{simLog}</div>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="ppt-body" style={{ minHeight: '85vh', borderRadius: '20px', overflow: 'hidden' }}>
      <div className="ppt-container">
        <header className="ppt-topbar">
          <div className="ppt-logo">
            <span>🚗</span>
            <span>CarValue 3D Interactive Walkthrough</span>
            <span className="badge">LIVE DEMO</span>
          </div>
          <div className="ppt-controls">
            <button
              type="button"
              className="ppt-btn"
              onClick={() => setCurrentSlide((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES)}
            >
              Previous (←)
            </button>
            <button
              type="button"
              className="ppt-btn primary"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES)}
            >
              Next (→)
            </button>
            <button
              type="button"
              className={`ppt-btn ${autoPlay ? 'primary' : ''}`}
              onClick={() => setAutoPlay(!autoPlay)}
            >
              {autoPlay ? '⏸ Pause' : '▶ Auto Play'}
            </button>
          </div>
        </header>

        <main className="ppt-viewport">
          <section className="ppt-slide-card active-slide">
            <div className="slide-header">
              <span className="slide-tag">{slides[currentSlide].tag}</span>
              <h2 className="slide-title">{slides[currentSlide].title}</h2>
              <p className="slide-subtitle">{slides[currentSlide].subtitle}</p>
            </div>
            {slides[currentSlide].content}
          </section>
        </main>

        <footer className="ppt-bottombar">
          <div className="slide-dots">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <div
                key={i}
                className={`slide-dot ${i === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(i)}
              />
            ))}
          </div>
          <div className="slide-number">
            Slide {currentSlide + 1} of {TOTAL_SLIDES} (Use Arrow Keys ← / →)
          </div>
        </footer>
      </div>
    </div>
  );
};
