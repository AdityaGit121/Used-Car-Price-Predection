import os, json, shutil, secrets, datetime as dt
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, Request, UploadFile, File, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

try:
    from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
    from sqlalchemy.orm import declarative_base, sessionmaker
    DATABASE_ENABLED = True
except Exception:
    DATABASE_ENABLED = False

BASE = Path(__file__).resolve().parent
DATA_PATH = BASE / "data" / "used_car_dataset.csv"
REGISTRY = BASE / "models" / "registry"
PRODUCTION = BASE / "models" / "production"
UPLOADS = BASE / "uploads"
FEATURES = ["Brand","model","Year","Age","kmDriven_num","Transmission","Owner","FuelType"]
NUM = ["Year","Age","kmDriven_num"]
CAT = ["Brand","model","Transmission","Owner","FuelType"]

app = FastAPI(title="Used Car Value API", version="1.0.0")
app.mount("/static", StaticFiles(directory=str(BASE / "static")), name="static")
security = HTTPBasic()

def admin_auth(credentials: HTTPBasicCredentials = Depends(security)):
    user = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "change-me-now")
    ok = secrets.compare_digest(credentials.username, user) and secrets.compare_digest(credentials.password, password)
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid admin credentials",
                            headers={"WWW-Authenticate":"Basic"})
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

def load_meta():
    with open(PRODUCTION / "metadata.json", encoding="utf-8") as f:
        return json.load(f)

def load_model():
    return joblib.load(PRODUCTION / "model.joblib")

def clean_dataset(path=DATA_PATH):
    df = pd.read_csv(path)
    required = ["Brand","model","Year","Age","kmDriven","Transmission","Owner","FuelType","AskPrice"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError("Missing required columns: " + ", ".join(missing))
    df["kmDriven_num"] = pd.to_numeric(df["kmDriven"].astype(str).str.replace(r"[^\d.]","",regex=True), errors="coerce")
    df["price_num"] = pd.to_numeric(df["AskPrice"].astype(str).str.replace(r"[^\d.]","",regex=True), errors="coerce")
    before = len(df)
    df = df.dropna(subset=["price_num"]).copy()
    df = df.drop_duplicates().copy()
    return df, {"rows_before": before, "rows_after": len(df),
                "missing_required": missing,
                "invalid_or_missing_price_removed": before-len(df)}

def make_preprocessor(scale=False):
    nums = [("imputer", SimpleImputer(strategy="median"))]
    if scale: nums.append(("scaler", StandardScaler()))
    return ColumnTransformer([
        ("num", Pipeline(nums), NUM),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=2, sparse_output=False))
        ]), CAT)
    ])

def algorithm_specs():
    return [
        ("linear_regression","Linear Regression",LinearRegression(),True),
        ("ridge_regression","Ridge Regression",Ridge(alpha=0.01),True),
        ("lasso_regression","Lasso Regression",Lasso(alpha=10,max_iter=30000,tol=1e-3),True),
        ("random_forest","Random Forest",RandomForestRegressor(n_estimators=300,random_state=42,n_jobs=-1,max_features=.8),False),
        ("xgboost","XGBoost",XGBRegressor(n_estimators=500,max_depth=7,learning_rate=.05,subsample=.85,colsample_bytree=.85,objective="reg:squarederror",random_state=42,n_jobs=-1),False),
        ("lightgbm","LightGBM",LGBMRegressor(n_estimators=500,max_depth=-1,num_leaves=31,learning_rate=.05,subsample=.85,colsample_bytree=.85,random_state=42,n_jobs=-1,verbosity=-1),False)
    ]

def train_all(data_path=DATA_PATH, version=None):
    df, validation = clean_dataset(data_path)
    X, y = df[FEATURES], df["price_num"].astype(float)
    X_train, X_test, y_train, y_test = train_test_split(X,y,test_size=.20,random_state=42)
    if version is None:
        existing=[p.name for p in REGISTRY.iterdir() if p.is_dir() and p.name.startswith("v")]
        nums=[int(p[1:]) for p in existing if p[1:].isdigit()]
        version=f"v{max(nums,default=0)+1}"
    vdir=REGISTRY/version
    vdir.mkdir(parents=True,exist_ok=True)
    results=[]
    for key,name,est,scale in algorithm_specs():
        pipe=Pipeline([("preprocessor",make_preprocessor(scale)),("model",est)])
        pipe.fit(X_train,y_train)
        pred=pipe.predict(X_test)
        row={"key":key,"algorithm":name,
             "RMSE":float(np.sqrt(mean_squared_error(y_test,pred))),
             "MAE":float(mean_absolute_error(y_test,pred)),
             "R2":float(r2_score(y_test,pred))}
        results.append(row)
        joblib.dump(pipe,vdir/f"{key}.joblib")
    best=min(results,key=lambda r:(r["RMSE"],r["MAE"],-r["R2"]))
    comparison={"version":version,"trained_at":dt.datetime.now(dt.timezone.utc).isoformat(),
                "dataset_rows":len(df),"train_rows":len(X_train),"test_rows":len(X_test),
                "split":"80/20","random_state":42,"features":FEATURES,
                "validation":validation,"results":results,"best":best}
    with open(vdir/"comparison.json","w") as f: json.dump(comparison,f,indent=2)

    # Production candidate: after selection, fit best algorithm on all available records.
    est_specs={k:(e,s) for k,n,e,s in algorithm_specs()}
    est,scale=est_specs[best["key"]]
    prod_pipe=Pipeline([("preprocessor",make_preprocessor(scale)),("model",est)])
    prod_pipe.fit(X,y)
    candidate=vdir/"production.joblib"
    joblib.dump(prod_pipe,candidate)
    with open(vdir/"brand_models.json","w",encoding="utf-8") as f:
        json.dump({b:sorted(df.loc[df.Brand==b,"model"].dropna().unique().tolist())
                   for b in sorted(df.Brand.dropna().unique())},f,ensure_ascii=False,indent=2)

    return comparison

def current_version():
    versions=[p for p in REGISTRY.iterdir() if p.is_dir() and (p/"comparison.json").exists()]
    if not versions: return None
    return max(versions,key=lambda p:int(p.name[1:]) if p.name[1:].isdigit() else 0)

def activate_if_better(version):
    candidate=REGISTRY/version/"comparison.json"
    if not candidate.exists(): raise ValueError("Training version not found.")
    with open(candidate) as f: new=json.load(f)
    old=None
    if (PRODUCTION/"metadata.json").exists():
        with open(PRODUCTION/"metadata.json") as f: old=json.load(f)
    if old:
        old_score=old["evaluation"]["RMSE"]
        if new["best"]["RMSE"] >= old_score:
            return False, old_score, new["best"]["RMSE"]
    PRODUCTION.mkdir(parents=True,exist_ok=True)
    shutil.copy2(REGISTRY/version/"production.joblib",PRODUCTION/"model.joblib")
    shutil.copy2(candidate,PRODUCTION/"comparison.json")
    shutil.copy2(REGISTRY/version/"brand_models.json",PRODUCTION/"brand_models.json")
    meta={"version":version,"algorithm":new["best"]["algorithm"],"model_key":new["best"]["key"],
          "trained_at":new["trained_at"],"dataset_rows":new["dataset_rows"],
          "evaluation":new["best"],
          "range_method":"Prediction ± test-set MAE (prototype market-error band; not a guaranteed confidence interval).",
          "features":FEATURES}
    with open(PRODUCTION/"metadata.json","w") as f: json.dump(meta,f,indent=2)
    return True, old["evaluation"]["RMSE"] if old else None, new["best"]["RMSE"]

@app.get("/", response_class=HTMLResponse)
def home():
    return (BASE/"templates"/"index.html").read_text(encoding="utf-8")

@app.get("/api/options")
def options():
    with open(PRODUCTION/"brand_models.json",encoding="utf-8") as f:
        brand_models=json.load(f)
    df=pd.read_csv(DATA_PATH)
    return {"brand_models":brand_models,
            "transmissions":sorted(df["Transmission"].dropna().unique().tolist()),
            "owners":sorted(df["Owner"].dropna().unique().tolist()),
            "fuel_types":sorted(df["FuelType"].dropna().unique().tolist())}

@app.post("/api/predict")
def predict(payload: PredictionInput):
    meta=load_meta()
    model=load_model()
    # Require a valid Brand->model relationship.
    with open(PRODUCTION/"brand_models.json",encoding="utf-8") as f: mapping=json.load(f)
    if payload.Brand not in mapping or payload.model not in mapping[payload.Brand]:
        raise HTTPException(400,"Selected model does not belong to selected brand.")
    row=pd.DataFrame([payload.model_dump(exclude={"asking_price"})])
    price=max(0.0,float(model.predict(row)[0]))
    mae=float(meta["evaluation"]["MAE"])
    low=max(0.0,price-mae); high=price+mae
    assessment=None
    recommendation=None
    buyer_action=None
    seller_action=None
    diff=None
    difference_percent=None
    if payload.asking_price is not None:
        diff=payload.asking_price-price
        difference_percent=(abs(diff)/price*100) if price else 0
        if difference_percent <= 5:
            assessment="Fair market price"
            recommendation="The asking price is close to the estimated market value."
            buyer_action="Consider buying or negotiate slightly."
            seller_action="The asking price is reasonable for the market."
        elif diff > 0:
            assessment="Above market value"
            recommendation="Don't buy at this asking price. Try negotiating closer to the estimated value."
            buyer_action="Don't buy at this asking price. Try negotiating closer to the estimated value."
            seller_action="Consider reducing the asking price to attract buyers."
        else:
            assessment="Below market value"
            recommendation="Good opportunity for a buyer. A seller may consider increasing the asking price."
            buyer_action="Good opportunity to consider buying, subject to the vehicle's condition."
            seller_action="Consider increasing the asking price toward the estimated market value."
    if DATABASE_ENABLED and DATABASE_URL:
        db = SessionLocal()
        try:
            db.add(PredictionLog(
                brand=payload.Brand, model=payload.model,
                predicted_price=price, asking_price=payload.asking_price,
                assessment=assessment
            ))
            db.commit()
        finally:
            db.close()

    return {"estimated_value":round(price,2),
            "estimated_range":{"low":round(low,2),"high":round(high,2)},
            "asking_price":payload.asking_price,
            "difference":round(diff,2) if diff is not None else None,
            "difference_percent":round(difference_percent,2) if difference_percent is not None else None,
            "assessment":assessment,
            "recommendation":recommendation,
            "buyer_action":buyer_action,
            "seller_action":seller_action,
            "model_version":meta["version"]}

@app.get("/api/model-info")
def model_info():
    meta=load_meta()
    return {"dataset_rows":meta["dataset_rows"],"model_version":meta["version"],
            "evaluation":meta["evaluation"],"algorithm":meta["algorithm"]}

@app.get("/admin",response_class=HTMLResponse)
def admin_page(_: str=Depends(admin_auth)):
    return (BASE/"templates"/"admin.html").read_text(encoding="utf-8")

@app.post("/admin/upload")
async def upload_dataset(file: UploadFile=File(...), _: str=Depends(admin_auth)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400,"Only CSV files are supported.")
    UPLOADS.mkdir(exist_ok=True)
    dest=UPLOADS/"latest.csv"
    with open(dest,"wb") as out: shutil.copyfileobj(file.file,out)
    try:
        cleaned, validation=clean_dataset(dest)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(400,str(e))
    return {"message":"Dataset uploaded and validated.","filename":file.filename,
            "rows":len(cleaned),"validation":validation}

@app.post("/admin/validate")
def validate_dataset(_: str=Depends(admin_auth)):
    path=UPLOADS/"latest.csv"
    if not path.exists(): raise HTTPException(404,"Upload a dataset first.")
    try:
        cleaned,validation=clean_dataset(path)
        return {"valid":True,"rows":len(cleaned),"validation":validation,
                "columns":pd.read_csv(path,nrows=0).columns.tolist()}
    except Exception as e:
        return JSONResponse(status_code=400,content={"valid":False,"error":str(e)})

@app.post("/admin/retrain")
def retrain(_: str=Depends(admin_auth)):
    path=UPLOADS/"latest.csv"
    if not path.exists(): raise HTTPException(404,"Upload a dataset first.")
    try:
        # Append uploaded records to the active dataset, then deduplicate.
        existing=pd.read_csv(DATA_PATH)
        new=pd.read_csv(path)
        combined=pd.concat([existing,new],ignore_index=True).drop_duplicates()
        tmp=UPLOADS/"combined.csv"; combined.to_csv(tmp,index=False)
        comparison=train_all(tmp)
        version=comparison["version"]
        shutil.copy2(tmp,DATA_PATH)
        return {"message":"Training complete.","version":version,
                "best":comparison["best"],"results":comparison["results"],
                "dataset_rows":comparison["dataset_rows"]}
    except Exception as e:
        raise HTTPException(500,f"Retraining failed: {e}")

@app.get("/admin/comparison")
def admin_comparison(_: str=Depends(admin_auth)):
    v=current_version()
    if not v: raise HTTPException(404,"No training versions.")
    return json.loads((v/"comparison.json").read_text())

@app.post("/admin/deploy/{version}")
def deploy(version:str, _:str=Depends(admin_auth)):
    ok,old,new=activate_if_better(version)
    return {"deployed":ok,"version":version,"previous_rmse":old,"candidate_rmse":new,
            "message":"New model activated." if ok else "Candidate rejected because its RMSE is not better than production."}

# Optional database setup for prediction/training audit logs.
DATABASE_URL=os.getenv("DATABASE_URL")
if DATABASE_ENABLED and DATABASE_URL:
    engine=create_engine(DATABASE_URL,pool_pre_ping=True)
    Base=declarative_base()
    SessionLocal=sessionmaker(bind=engine)
    class PredictionLog(Base):
        __tablename__="prediction_logs"
        id=Column(Integer,primary_key=True)
        created_at=Column(DateTime,default=dt.datetime.utcnow)
        brand=Column(String(100)); model=Column(String(150)); predicted_price=Column(Float)
        asking_price=Column(Float,nullable=True); assessment=Column(String(100),nullable=True)
    Base.metadata.create_all(engine)
