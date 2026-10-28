import { ModelComparisonData } from '../types';

export const INITIAL_BRAND_MODELS: Record<string, string[]> = {
  "Maruti": [
    "Swift", "Baleno", "Dzire", "Alto", "Wagon R", "Ertiga", 
    "Vitara Brezza", "Celerio", "Ignis", "S-Cross", "Ciaz", "Ritz", "Zen Estilo"
  ],
  "Hyundai": [
    "i20", "Creta", "Grand i10", "Verna", "Venue", "Santro", 
    "Aura", "Tucson", "Elantra", "Eon", "i10"
  ],
  "Honda": [
    "City", "Amaze", "Civic", "Jazz", "WR-V", "BR-V", "Brio", "CR-V", "Accord"
  ],
  "Toyota": [
    "Innova", "Innova Crysta", "Fortuner", "Corolla Altis", "Etios", 
    "Glanza", "Urban Cruiser", "Yaris", "Camry"
  ],
  "Tata": [
    "Nexon", "Tiago", "Harrier", "Altroz", "Safari", "Tigor", "Punch", "Hexa", "Indica"
  ],
  "Mahindra": [
    "Scorpio", "XUV500", "Thar", "Bolero", "XUV300", "XUV700", "KUV100", "Marazzo"
  ],
  "Ford": [
    "EcoSport", "Figo", "Endeavour", "Aspire", "Freestyle", "Fiesta"
  ],
  "Volkswagen": [
    "Polo", "Vento", "Ameo", "Taigun", "Jetta", "Passat", "Tiguan"
  ],
  "Renault": [
    "Kwid", "Duster", "Triber", "Kiger", "Lodgy", "Pulse"
  ],
  "Skoda": [
    "Rapid", "Octavia", "Superb", "Kushaq", "Slavia", "Laura", "Kodiaq"
  ],
  "Kia": [
    "Seltos", "Sonet", "Carens", "Carnival"
  ],
  "BMW": [
    "3 Series", "5 Series", "X1", "X3", "X5", "7 Series"
  ],
  "Mercedes-Benz": [
    "C-Class", "E-Class", "GLA", "GLC", "GLE", "S-Class", "A-Class"
  ],
  "Audi": [
    "A4", "A6", "Q3", "Q5", "Q7"
  ],
  "MG": [
    "Hector", "ZS EV", "Astor", "Gloster"
  ],
  "Nissan": [
    "Micra", "Magnite", "Sunny", "Terrano", "Kicks"
  ],
  "Chevrolet": [
    "Beat", "Cruze", "Spark", "Sail", "Tavera"
  ],
  "Jeep": [
    "Compass", "Wrangler", "Meridian"
  ],
  "Datsun": [
    "GO", "GO Plus", "redi-GO"
  ]
};

export const FUEL_TYPES = [
  "Petrol",
  "Diesel",
  "CNG",
  "LPG",
  "Electric"
];

export const TRANSMISSIONS = [
  "Manual",
  "Automatic"
];

export const OWNERS = [
  "First Owner",
  "Second Owner",
  "Third Owner",
  "Fourth & Above Owner",
  "Test Drive Car"
];

export const INITIAL_MODEL_COMPARISON: ModelComparisonData = {
  dataset_rows: 9582,
  version: "v1",
  trained_at: "2024-03-15T12:00:00.000Z",
  split: "80/20",
  random_state: 42,
  results: [
    {
      key: "linear_regression",
      algorithm: "Linear Regression",
      RMSE: 776144.5054681825,
      MAE: 336123.6817694927,
      R2: 0.7752698883175495
    },
    {
      key: "ridge_regression",
      algorithm: "Ridge Regression",
      RMSE: 779602.9889846253,
      MAE: 336616.5474790226,
      R2: 0.7732626408749282
    },
    {
      key: "lasso_regression",
      algorithm: "Lasso Regression",
      RMSE: 778618.6022840721,
      MAE: 335943.8715515823,
      R2: 0.7738348714358437
    },
    {
      key: "random_forest",
      algorithm: "Random Forest",
      RMSE: 652066.2247941633,
      MAE: 199858.3818663431,
      R2: 0.8413794307838369
    },
    {
      key: "xgboost",
      algorithm: "XGBoost",
      RMSE: 582112.1856547078,
      MAE: 213098.28518732477,
      R2: 0.8735876589104478
    },
    {
      key: "lightgbm",
      algorithm: "LightGBM",
      RMSE: 959455.9453092457,
      MAE: 326110.06473054376,
      R2: 0.6565795368661937
    }
  ],
  best: {
    key: "xgboost",
    algorithm: "XGBoost",
    RMSE: 582112.1856547078,
    MAE: 213098.28518732477,
    R2: 0.8735876589104478
  }
};
