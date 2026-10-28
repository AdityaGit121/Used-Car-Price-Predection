"""
CarValue — Production FastAPI Backend Service
Provides offline-capable REST API endpoints for fair used-car price predictions,
dataset uploading, automated retraining, and candidate deployment.
"""

import os
import json
import shutil
import secrets
import datetime as dt
from pathlib import Path
from typing import Optional, Dict, Any, List

import joblib
import pandas as pd
from fastapi import FastAPI, Request, UploadFile, File, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
    from sqlalchemy.orm import declarative_base, sessionmaker
    SQLA_AVAILABLE = True
except ImportError:
    SQLA_AVAILABLE = False

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
REGISTRY_DIR = MODELS_DIR / "registry"
PRODUCTION_DIR = MODELS_DIR / "production"
UPLOADS_DIR = BASE_DIR / "uploads"
DATA_FILE = DATA_DIR / "used_car_dataset.csv"

FEATURES = ["Brand", "model", "Year", "Age", "kmDriven_num", "Transmission", "Owner", "FuelType"]

app = FastAPI(
    title="CarValue API",
    description="Offline-Ready Used Car Market Valuation and Model Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder if present
static_dir = BASE_DIR / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

security = HTTPBasic()

# Fallback brand models in case production artifacts have not been generated yet
DEFAULT_BRAND_MODELS = {
    "Maruti": ["Swift", "Baleno", "Dzire", "Alto", "Wagon R", "Ertiga", "Vitara Brezza", "Celerio", "Ignis", "Ciaz"],
    "Hyundai": ["i20", "Creta", "Grand i10", "Verna", "Venue", "Santro", "Aura", "Tucson", "Elantra"],
    "Honda": ["City", "Amaze", "Civic", "Jazz", "WR-V", "BR-V", "Brio", "CR-V"],
    "Toyota": ["Innova Crysta", "Fortuner", "Corolla Altis", "Etios", "Glanza", "Camry"],
    "Tata": ["Nexon", "Tiago", "Harrier", "Altroz", "Safari", "Punch", "Tigor"],
    "Mahindra": ["Scorpio", "XUV500", "Thar", "Bolero", "XUV700", "XUV300"],
    "Ford": ["EcoSport", "Figo", "Endeavour", "Aspire"],
    "Volkswagen": ["Polo", "Vento", "Taigun", "Jetta"],
    "Kia": ["Seltos", "Sonet", "Carens", "Carnival"],
    "BMW": ["3 Series", "5 Series", "X1", "X3", "X5"],
    "Mercedes-Benz": ["C-Class", "E-Class", "GLA", "GLC", "S-Class"],
    "Audi": ["A4", "A6", "Q3", "Q5"]
}

# Offline SQLite Database for prediction audit logging
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'carvalue.db'}")
SessionLocal = None
if SQLA_AVAILABLE:
    connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    Base = declarative_base()

    class PredictionLog(Base):
        __tablename__ = "prediction_logs"
        id = Column(Integer, primary_key=True, index=True)
        created_at = Column(DateTime, default=dt.datetime.utcnow)
        brand = Column(String(100))
        model = Column(String(150))
        predicted_price = Column(Float)
        asking_price = Column(Float, nullable=True)
        assessment = Column(String(100), nullable=True)

    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def admin_auth(credentials: HTTPBasicCredentials = Depends(security)):
    user = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "change-me-now")
    is_valid = secrets.compare_digest(credentials.username, user) and secrets.compare_digest(credentials.password, password)
    if not is_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid administrative credentials",
            headers={"WWW-Authenticate": "Basic"}
        )
    return credentials.username


class PredictionInput(BaseModel):
    Brand: str
    model: str
    Year: int = Field(ge=1950, le=2035)
    Age: int = Field(ge=0, le=80)
    kmDriven_num: float = Field(ge=0)
    Transmission: str
    Owner: str
    FuelType: str
    asking_price: Optional[float] = Field(default=None, ge=0)


def get_production_brand_models() -> Dict[str, List[str]]:
    path = PRODUCTION_DIR / "brand_models.json"
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return DEFAULT_BRAND_MODELS


def get_production_metadata() -> Dict[str, Any]:
    path = PRODUCTION_DIR / "metadata.json"
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "version": "v1-fallback",
        "algorithm": "XGBoost (Production Champion)",
        "dataset_rows": 9582,
        "evaluation": {"RMSE": 582112, "MAE": 213098, "R2": 0.8736}
    }


def estimate_fallback(payload: PredictionInput) -> float:
    """Robust fallback valuation formula when joblib artifact is compiling or absent."""
    base = 800000
    if payload.Brand in ["BMW", "Mercedes-Benz", "Audi"]: base = 4500000
    elif payload.Brand in ["Toyota", "Mahindra"]: base = 1600000
    elif payload.Brand in ["Hyundai", "Kia", "Honda", "Tata"]: base = 1100000
    
    val = base * ((1 - 0.08) ** max(0, payload.Age))
    val *= max(0.65, 1 - (payload.kmDriven_num - payload.Age * 12000) * 0.0000015)
    if payload.Transmission == "Automatic": val += 60000
    if payload.FuelType == "Diesel": val *= 1.05
    if payload.Owner in ["Second Owner", "Third Owner"]: val *= 0.85
    return max(40000.0, float(round(val / 500) * 500))


@app.get("/", response_class=HTMLResponse)
def home():
    index_file = BASE_DIR / "templates" / "index.html"
    if index_file.exists():
        return index_file.read_text(encoding="utf-8")
    return "<h1>CarValue API is running. Visit /api/options or /docs.</h1>"


@app.get("/presentation", response_class=HTMLResponse)
@app.get("/ppt", response_class=HTMLResponse)
def presentation():
    ppt_file = BASE_DIR / "templates" / "presentation.html"
    if ppt_file.exists():
        return ppt_file.read_text(encoding="utf-8")
    return "<h1>Presentation file not found at templates/presentation.html</h1>"


@app.get("/api/options")
def get_options():
    brand_models = get_production_brand_models()
    return {
        "brand_models": brand_models,
        "transmissions": ["Automatic", "Manual"],
        "owners": ["First Owner", "Second Owner", "Third Owner", "Fourth & Above Owner", "Test Drive Car"],
        "fuel_types": ["CNG", "Diesel", "Electric", "LPG", "Petrol"]
    }


@app.post("/api/predict")
def predict_value(payload: PredictionInput):
    brand_models = get_production_brand_models()
    if payload.Brand not in brand_models or payload.model not in brand_models[payload.Brand]:
        raise HTTPException(
            status_code=400,
            detail=f"Selected model '{payload.model}' does not belong to brand '{payload.Brand}'."
        )

    model_file = PRODUCTION_DIR / "model.joblib"
    meta = get_production_metadata()
    mae = float(meta.get("evaluation", {}).get("MAE", 213098))

    if model_file.exists():
        try:
            model = joblib.load(model_file)
            input_df = pd.DataFrame([payload.model_dump(exclude={"asking_price"})])[FEATURES]
            price = max(0.0, float(model.predict(input_df)[0]))
        except Exception:
            price = estimate_fallback(payload)
    else:
        price = estimate_fallback(payload)

    low = max(0.0, price - mae)
    high = price + mae

    diff = None
    diff_pct = None
    assessment = None
    recommendation = None
    buyer_action = None
    seller_action = None

    if payload.asking_price is not None:
        diff = payload.asking_price - price
        diff_pct = round((abs(diff) / price * 100), 1) if price > 0 else 0

        if diff_pct <= 5:
            assessment = "Fair market price"
            recommendation = "The asking price is close to the estimated market value."
            buyer_action = "Consider buying or negotiate slightly."
            seller_action = "The asking price is reasonable for the market."
        elif diff > 0:
            assessment = "Above market value"
            recommendation = "Don't buy at this asking price. Try negotiating closer to the estimated value."
            buyer_action = "Don't buy at this asking price. Try negotiating closer to the estimated value."
            seller_action = "Consider reducing the asking price to attract buyers."
        else:
            assessment = "Below market value"
            recommendation = "Good opportunity for a buyer. A seller may consider increasing the asking price."
            buyer_action = "Good opportunity to consider buying, subject to vehicle condition."
            seller_action = "Consider increasing the asking price toward the estimated market value."

    # Offline logging to local SQLite
    if SessionLocal:
        try:
            db = SessionLocal()
            log_entry = PredictionLog(
                brand=payload.Brand,
                model=payload.model,
                predicted_price=round(price, 2),
                asking_price=payload.asking_price,
                assessment=assessment
            )
            db.add(log_entry)
            db.commit()
            db.close()
        except Exception:
            pass

    return {
        "estimated_value": round(price, 2),
        "estimated_range": {"low": round(low, 2), "high": round(high, 2)},
        "asking_price": payload.asking_price,
        "difference": round(diff, 2) if diff is not None else None,
        "difference_percent": diff_pct,
        "assessment": assessment,
        "recommendation": recommendation,
        "buyer_action": buyer_action,
        "seller_action": seller_action,
        "model_version": meta.get("version", "v1")
    }


@app.get("/api/model-info")
def model_info():
    meta = get_production_metadata()
    return {
        "dataset_rows": meta.get("dataset_rows", 9582),
        "model_version": meta.get("version", "v1"),
        "evaluation": meta.get("evaluation", {}),
        "algorithm": meta.get("algorithm", "XGBoost")
    }


@app.get("/admin", response_class=HTMLResponse)
def admin_portal(_: str = Depends(admin_auth)):
    admin_file = BASE_DIR / "templates" / "admin.html"
    if admin_file.exists():
        return admin_file.read_text(encoding="utf-8")
    return "<h1>Admin Portal</h1><p>templates/admin.html not found.</p>"


@app.post("/admin/upload")
async def upload_dataset_batch(file: UploadFile = File(...), _: str = Depends(admin_auth)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOADS_DIR / "latest.csv"
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    from train import clean_dataset
    try:
        cleaned, validation = clean_dataset(dest)
        return {
            "message": "Dataset uploaded and validated successfully.",
            "filename": file.filename,
            "rows": len(cleaned),
            "validation": validation
        }
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/admin/validate")
def validate_uploaded_dataset(_: str = Depends(admin_auth)):
    latest = UPLOADS_DIR / "latest.csv"
    if not latest.exists():
        raise HTTPException(status_code=404, detail="No uploaded dataset found. Upload a CSV first.")
    
    from train import clean_dataset
    try:
        cleaned, validation = clean_dataset(latest)
        columns = pd.read_csv(latest, nrows=0).columns.tolist()
        return {
            "valid": True,
            "rows": len(cleaned),
            "validation": validation,
            "columns": columns
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"valid": False, "error": str(e)})


@app.post("/admin/retrain")
def retrain_model_pipeline(_: str = Depends(admin_auth)):
    from train import train_all
    latest = UPLOADS_DIR / "latest.csv"
    
    try:
        if latest.exists():
            existing = pd.read_csv(DATA_FILE) if DATA_FILE.exists() else pd.DataFrame()
            new_df = pd.read_csv(latest)
            combined = pd.concat([existing, new_df], ignore_index=True).drop_duplicates()
            combined.to_csv(DATA_FILE, index=False)
            
        comp = train_all(DATA_FILE)
        return {
            "message": "Model retraining across 6 algorithms completed.",
            "version": comp["version"],
            "best": comp["best"],
            "results": comp["results"],
            "dataset_rows": comp["dataset_rows"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")


@app.get("/admin/comparison")
def get_model_comparison(_: str = Depends(admin_auth)):
    comp_file = PRODUCTION_DIR / "comparison.json"
    if comp_file.exists():
        with open(comp_file, encoding="utf-8") as f:
            return json.load(f)
    
    # Check registry
    versions = [p for p in REGISTRY_DIR.iterdir() if p.is_dir() and (p / "comparison.json").exists()]
    if versions:
        latest = max(versions, key=lambda p: int(p.name[1:]) if p.name[1:].isdigit() else 0)
        with open(latest / "comparison.json", encoding="utf-8") as f:
            return json.load(f)
            
    # Default model comparison
    return {
        "dataset_rows": 9582,
        "version": "v1",
        "results": [
            {"algorithm": "XGBoost", "RMSE": 582112, "MAE": 213098, "R2": 0.8736},
            {"algorithm": "Random Forest", "RMSE": 652066, "MAE": 199858, "R2": 0.8414},
            {"algorithm": "Linear Regression", "RMSE": 776145, "MAE": 336124, "R2": 0.7753},
            {"algorithm": "Lasso Regression", "RMSE": 778619, "MAE": 335944, "R2": 0.7738},
            {"algorithm": "Ridge Regression", "RMSE": 779603, "MAE": 336617, "R2": 0.7733},
            {"algorithm": "LightGBM", "RMSE": 959456, "MAE": 326110, "R2": 0.6566}
        ],
        "best": {"algorithm": "XGBoost", "RMSE": 582112, "MAE": 213098, "R2": 0.8736}
    }


@app.post("/admin/deploy/{version}")
def deploy_candidate_version(version: str, _: str = Depends(admin_auth)):
    from train import activate_if_better
    try:
        ok, old_r, new_r = activate_if_better(version)
        return {
            "deployed": ok,
            "version": version,
            "previous_rmse": old_r,
            "candidate_rmse": new_r,
            "message": "New model version activated in production." if ok else "Candidate rejected: RMSE is not better than current production champion."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
