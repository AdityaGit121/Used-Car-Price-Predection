"""
CarValue — Automated Model Training & Production Deployment Pipeline
Trains, evaluates, and registers 6 regression models for used car fair-market valuation.
"""

import os
import sys
import json
import shutil
import random
import datetime as dt
from pathlib import Path
from typing import Dict, Any, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    from lightgbm import LGBMRegressor
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
REGISTRY_DIR = MODELS_DIR / "registry"
PRODUCTION_DIR = MODELS_DIR / "production"
DATA_FILE = DATA_DIR / "used_car_dataset.csv"

FEATURES = ["Brand", "model", "Year", "Age", "kmDriven_num", "Transmission", "Owner", "FuelType"]
NUM_COLS = ["Year", "Age", "kmDriven_num"]
CAT_COLS = ["Brand", "model", "Transmission", "Owner", "FuelType"]

SEED_BRAND_MODELS = {
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

BASE_PRICES = {
    "Alto": 420000, "Wagon R": 650000, "Swift": 750000, "Baleno": 850000, "Dzire": 850000, "Ertiga": 1100000, "Vitara Brezza": 1050000,
    "Grand i10": 700000, "i20": 900000, "Venue": 1100000, "Creta": 1500000, "Verna": 1450000,
    "City": 1400000, "Amaze": 850000, "Civic": 2000000, "Jazz": 850000,
    "Innova Crysta": 2400000, "Fortuner": 3600000, "Corolla Altis": 1700000, "Glanza": 850000,
    "Tiago": 680000, "Nexon": 1150000, "Harrier": 1900000, "Safari": 2000000,
    "Scorpio": 1600000, "Thar": 1600000, "XUV700": 2100000, "Bolero": 900000,
    "EcoSport": 1050000, "Endeavour": 3400000, "Figo": 650000,
    "Polo": 850000, "Vento": 950000, "Taigun": 1550000,
    "Seltos": 1550000, "Sonet": 1150000, "Carnival": 3200000,
    "3 Series": 4500000, "5 Series": 6500000, "X1": 4200000, "X5": 8500000,
    "C-Class": 4800000, "E-Class": 7000000, "GLA": 4400000, "GLC": 6800000,
    "A4": 4300000, "A6": 6200000, "Q3": 4200000, "Q5": 6300000
}


def create_synthetic_dataset(output_path: Path, count: int = 4000):
    """Generates a realistic historical dataset if used_car_dataset.csv is absent."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    random.seed(42)
    rows = []
    current_year = dt.datetime.now().year

    transmissions = ["Manual", "Automatic"]
    owners = ["First Owner", "Second Owner", "Third Owner", "Fourth & Above Owner"]
    fuel_types = ["Petrol", "Diesel", "CNG"]

    for _ in range(count):
        brand = random.choice(list(SEED_BRAND_MODELS.keys()))
        model = random.choice(SEED_BRAND_MODELS[brand])
        year = random.randint(2010, current_year)
        age = max(0, current_year - year)
        km = int(random.gauss(age * 12500, 15000))
        km = max(3000, min(250000, km))
        
        trans = "Automatic" if random.random() < 0.3 else "Manual"
        owner = "First Owner" if age <= 3 else random.choice(owners)
        fuel = "Diesel" if brand in ["Toyota", "Mahindra", "BMW", "Mercedes-Benz"] and random.random() < 0.7 else random.choice(fuel_types)
        
        base = BASE_PRICES.get(model, 900000)
        dep_rate = 0.08 if brand in ["Toyota", "Maruti"] else 0.10
        val = base * ((1 - dep_rate) ** age)
        val *= max(0.7, 1 - (km - age * 12500) * 0.000002)
        if trans == "Automatic": val += 50000
        if owner == "Second Owner": val *= 0.88
        elif owner == "Third Owner": val *= 0.76
        
        # Add market spread
        ask_price = max(45000, int(random.gauss(val, val * 0.08)))

        rows.append({
            "Brand": brand,
            "model": model,
            "Year": year,
            "Age": age,
            "kmDriven": f"{km} km",
            "Transmission": trans,
            "Owner": owner,
            "FuelType": fuel,
            "AskPrice": ask_price
        })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    print(f"Generated realistic offline dataset with {len(df)} records at {output_path}")


def clean_dataset(path: Path = DATA_FILE) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Validates schema, cleans numeric fields, and deduplicates records."""
    if not path.exists():
        create_synthetic_dataset(path)

    df = pd.read_csv(path)
    required = ["Brand", "model", "Year", "Age", "kmDriven", "Transmission", "Owner", "FuelType", "AskPrice"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in dataset: {', '.join(missing)}")

    before = len(df)
    # Extract clean numbers from strings
    df["kmDriven_num"] = pd.to_numeric(
        df["kmDriven"].astype(str).str.replace(r"[^\d.]", "", regex=True), errors="coerce"
    )
    df["price_num"] = pd.to_numeric(
        df["AskPrice"].astype(str).str.replace(r"[^\d.]", "", regex=True), errors="coerce"
    )

    df = df.dropna(subset=["price_num", "kmDriven_num"]).copy()
    df = df[df["price_num"] > 10000].copy()
    df = df.drop_duplicates(subset=FEATURES + ["price_num"]).copy()

    return df, {
        "rows_before": before,
        "rows_after": len(df),
        "missing_required": missing,
        "invalid_or_missing_price_removed": before - len(df)
    }


def make_preprocessor(scale: bool = False) -> ColumnTransformer:
    num_steps = [("imputer", SimpleImputer(strategy="median"))]
    if scale:
        num_steps.append(("scaler", StandardScaler()))

    return ColumnTransformer([
        ("num", Pipeline(num_steps), NUM_COLS),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=2, sparse_output=False))
        ]), CAT_COLS)
    ])


def get_algorithms():
    algos = [
        ("linear_regression", "Linear Regression", LinearRegression(), True),
        ("ridge_regression", "Ridge Regression", Ridge(alpha=1.0), True),
        ("lasso_regression", "Lasso Regression", Lasso(alpha=50.0, max_iter=20000), True),
        ("random_forest", "Random Forest", RandomForestRegressor(n_estimators=150, max_depth=15, random_state=42, n_jobs=-1), False)
    ]
    if HAS_XGB:
        algos.append((
            "xgboost", "XGBoost",
            XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.08, subsample=0.85, random_state=42, n_jobs=-1),
            False
        ))
    if HAS_LGBM:
        algos.append((
            "lightgbm", "LightGBM",
            LGBMRegressor(n_estimators=300, max_depth=8, learning_rate=0.08, subsample=0.85, random_state=42, verbosity=-1),
            False
        ))
    return algos


def train_all(data_path: Path = DATA_FILE, version: str = None) -> Dict[str, Any]:
    df, validation = clean_dataset(data_path)
    X = df[FEATURES]
    y = df["price_num"].astype(float)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)

    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    if version is None:
        existing = [p.name for p in REGISTRY_DIR.iterdir() if p.is_dir() and p.name.startswith("v")]
        nums = [int(p[1:]) for p in existing if p[1:].isdigit()]
        version = f"v{max(nums, default=0) + 1}"

    vdir = REGISTRY_DIR / version
    vdir.mkdir(parents=True, exist_ok=True)

    results = []
    specs = get_algorithms()

    for key, name, model_instance, scale in specs:
        print(f"  Fitting {name}...")
        pipe = Pipeline([
            ("preprocessor", make_preprocessor(scale)),
            ("model", model_instance)
        ])
        pipe.fit(X_train, y_train)
        pred = pipe.predict(X_test)
        
        rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
        mae = float(mean_absolute_error(y_test, pred))
        r2 = float(r2_score(y_test, pred))

        results.append({
            "key": key,
            "algorithm": name,
            "RMSE": round(rmse, 2),
            "MAE": round(mae, 2),
            "R2": round(r2, 4)
        })
        joblib.dump(pipe, vdir / f"{key}.joblib")

    # Select best candidate (lowest RMSE)
    best = min(results, key=lambda r: (r["RMSE"], r["MAE"], -r["R2"]))

    comparison = {
        "version": version,
        "trained_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "dataset_rows": len(df),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "split": "80/20",
        "random_state": 42,
        "features": FEATURES,
        "validation": validation,
        "results": results,
        "best": best
    }

    with open(vdir / "comparison.json", "w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2)

    # Train production model on 100% of available data
    best_spec = next((item for item in specs if item[0] == best["key"]), specs[0])
    _, _, best_estimator, best_scale = best_spec
    prod_pipe = Pipeline([
        ("preprocessor", make_preprocessor(best_scale)),
        ("model", best_estimator)
    ])
    prod_pipe.fit(X, y)
    joblib.dump(prod_pipe, vdir / "production.joblib")

    # Save mapping of Brand -> Models
    brand_models = {
        b: sorted(df.loc[df["Brand"] == b, "model"].dropna().unique().tolist())
        for b in sorted(df["Brand"].dropna().unique())
    }
    with open(vdir / "brand_models.json", "w", encoding="utf-8") as f:
        json.dump(brand_models, f, ensure_ascii=False, indent=2)

    return comparison


def activate_if_better(version: str) -> Tuple[bool, float, float]:
    candidate_comp = REGISTRY_DIR / version / "comparison.json"
    if not candidate_comp.exists():
        raise ValueError(f"Version {version} comparison file does not exist.")

    with open(candidate_comp, encoding="utf-8") as f:
        new_data = json.load(f)

    old_rmse = None
    prod_meta = PRODUCTION_DIR / "metadata.json"
    if prod_meta.exists():
        with open(prod_meta, encoding="utf-8") as f:
            old_meta = json.load(f)
            old_rmse = old_meta.get("evaluation", {}).get("RMSE")

    new_rmse = new_data["best"]["RMSE"]
    if old_rmse is not None and new_rmse >= old_rmse:
        return False, old_rmse, new_rmse

    PRODUCTION_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(REGISTRY_DIR / version / "production.joblib", PRODUCTION_DIR / "model.joblib")
    shutil.copy2(candidate_comp, PRODUCTION_DIR / "comparison.json")
    shutil.copy2(REGISTRY_DIR / version / "brand_models.json", PRODUCTION_DIR / "brand_models.json")

    metadata = {
        "version": version,
        "algorithm": new_data["best"]["algorithm"],
        "model_key": new_data["best"]["key"],
        "trained_at": new_data["trained_at"],
        "dataset_rows": new_data["dataset_rows"],
        "evaluation": new_data["best"],
        "range_method": "Prediction ± test-set MAE",
        "features": FEATURES
    }
    with open(PRODUCTION_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return True, old_rmse, new_rmse


if __name__ == "__main__":
    print("\n=======================================================")
    print("  CarValue Model Training & Benchmark Pipeline")
    print("=======================================================\n")
    comp = train_all()
    print("\nBENCHMARK RESULTS (Test Split 20%):")
    print(f"{'Algorithm':25s} | {'RMSE':>14s} | {'MAE':>14s} | {'R2':>8s}")
    print("-" * 70)
    for r in sorted(comp["results"], key=lambda x: x["RMSE"]):
        print(f"{r['algorithm']:25s} | ₹{r['RMSE']:>13,.0f} | ₹{r['MAE']:>13,.0f} | {r['R2']:>8.4f}")

    print(f"\nBest Candidate: {comp['best']['algorithm']} ({comp['version']})")
    activated, old_r, new_r = activate_if_better(comp["version"])
    if activated:
        print(f"Production Status: ACTIVATED (RMSE: ₹{new_r:,.0f})\n")
    else:
        print(f"Production Status: REJECTED (Existing RMSE ₹{old_r:,.0f} <= Candidate ₹{new_r:,.0f})\n")
