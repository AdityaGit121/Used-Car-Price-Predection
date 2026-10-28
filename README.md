# CarValue — Production-Oriented Used-Car Market Value System

## Current model experiment
The supplied dataset contains **9,582 records** after target cleaning.

A fixed **80/20 train-test split** (`random_state=42`) was used for model comparison.

| Algorithm | RMSE | MAE | R² |
|---|---:|---:|---:|
| Linear Regression | ₹776,145 | ₹336,124 | 0.7753 |
| Ridge Regression | ₹779,603 | ₹336,617 | 0.7733 |
| Lasso Regression | ₹778,619 | ₹335,944 | 0.7738 |
| Random Forest | ₹652,066 | ₹199,858 | 0.8414 |
| XGBoost | ₹582,112 | ₹213,098 | 0.8736 |
| LightGBM | ₹959,456 | ₹326,110 | 0.6566 |

**Current best candidate:** XGBoost (lowest RMSE, with MAE/R² considered as secondary metrics).

The production copy is fit on the full dataset **after** model selection. The reported test metrics remain the held-out 20% metrics.

## User features
- Brand → Model dependent dropdown
- Manufacturing year and car age
- Kilometres driven
- Fuel type
- Transmission
- Ownership
- Optional seller asking price
- Estimated used-car market value
- Estimated market range / model-error band
- Market assessment: below / fair / above estimated value
- Buyer/seller recommendation based on the asking-price difference
- Decision popup showing estimate, asking price, difference percentage, and separate buyer/seller guidance
- Explanation of the attributes considered

The interface intentionally does **not** expose the train/test split or algorithm name.

## Admin features
Open `/admin` with HTTP Basic authentication:
- Upload a new CSV
- Validate required columns
- Retrain Linear, Ridge, Lasso, Random Forest, XGBoost and LightGBM
- Compare RMSE, MAE and R²
- Create versioned model candidates
- Activate a candidate only when it improves production RMSE

Dataset updates are **appended and deduplicated** before retraining.

## Required dataset columns
`Brand, model, Year, Age, kmDriven, Transmission, Owner, FuelType, AskPrice`

`PostedDate` and `AdditionInfo` may remain in the CSV, but are not currently model features.

## Run locally
```powershell
py -m venv venv
.env\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload
```
Open `http://127.0.0.1:8000`

Admin:
`http://127.0.0.1:8000/admin`

Set secure environment variables before deployment:
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, and preferably `DATABASE_URL`.

## Production architecture
Frontend → FastAPI → production model
                     ↘ PostgreSQL (optional audit/logging)

Containerization is included with `Dockerfile`.

## Important valuation note
The current target is `AskPrice`, so the system estimates a **listing/asking-price-based market value**, not a guaranteed final transaction price. The range currently uses prediction ± test-set MAE as a practical prototype error band. For a production-grade uncertainty interval, use a separate calibration set or conformal prediction.

## Recommended production hardening
- HTTPS/TLS
- Strong admin authentication (prefer SSO/OAuth over Basic Auth)
- Rate limiting / WAF
- Environment-based secrets
- PostgreSQL with backups
- Centralized logs and monitoring
- Model version registry and rollback
- Automated tests and CI/CD
- Data drift / model performance monitoring
- Time-aware validation using newer listings as the future test set
# Used-Car-Price-Predection
