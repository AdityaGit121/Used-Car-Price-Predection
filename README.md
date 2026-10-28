# CarValue — Used Car Market Value Platform

A React + TypeScript application rewritten from the original Python/FastAPI CarValue service, providing transparent used-car market valuations, buyer/seller decision support, and ML model benchmarking and deployment.

## Features

### 1. Fair Value Estimation
- **Brand & Model Filtering**: Dependent dropdown mapping dozens of Indian vehicle makes and models.
- **Vehicle Characteristics**: Year of manufacture, calculated car age, kilometres driven, fuel type (Petrol, Diesel, CNG, LPG, Electric), transmission (Manual, Automatic), and ownership tier.
- **Market Valuation**: Real-time valuation based on historical transaction attributes with market error band range (low/high).
- **Asking Price Comparison**: Real-time assessment of whether an asking price is **Below Market Value**, **Fair Market Price**, or **Above Market Value** with percentage divergence.
- **Buyer & Seller Decision Guidance**: Context-specific advice and full popup decision report.

### 2. Model & Dataset Management (Admin)
- **Dataset Validation**: Upload batches in CSV format to check required schema columns (`Brand, model, Year, Age, kmDriven, Transmission, Owner, FuelType, AskPrice`), row counts, and cleaning statistics.
- **Model Comparison Table**: Benchmarks 6 regression algorithms:
  - Linear Regression
  - Ridge Regression
  - Lasso Regression
  - Random Forest
  - XGBoost (Production Champion)
  - LightGBM
- **Retraining & Versioning**: Candidate version generation (`v1`, `v2`, etc.) with evaluation metrics (RMSE, MAE, R²).
- **Controlled Deployment**: Evaluates candidate RMSE against active production RMSE and deploys only candidates with strictly better performance.

## Tech Stack
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Styling**: Pure semantic CSS adhering faithfully to original design specifications
- **State & Storage**: Client-side storage persistence with reactive updates
