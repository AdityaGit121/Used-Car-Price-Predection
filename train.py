# Retrain all configured algorithms and create a new model version.
# Run: python train.py
from app import train_all, activate_if_better
result = train_all()
print("\nMODEL COMPARISON")
for r in sorted(result["results"], key=lambda x: x["RMSE"]):
    print(f'{r["algorithm"]:20s} RMSE=₹{r["RMSE"]:,.0f}  MAE=₹{r["MAE"]:,.0f}  R²={r["R2"]:.4f}')
print(f'\nBest candidate: {result["best"]["algorithm"]} ({result["version"]})')
ok, old, new = activate_if_better(result["version"])
print("Production update:", "ACTIVATED" if ok else "REJECTED — existing production model is better/equal")
