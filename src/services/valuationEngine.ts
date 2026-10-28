import { 
  PredictionInput, 
  PredictionResult, 
  ModelComparisonData, 
  DatasetValidationReport, 
  DatasetUploadResponse 
} from '../types';
import { 
  INITIAL_BRAND_MODELS, 
  INITIAL_MODEL_COMPARISON 
} from '../data/carData';

const STORAGE_KEYS = {
  BRAND_MODELS: 'carvalue_brand_models',
  PRODUCTION_MODEL: 'carvalue_production_model',
  CANDIDATE_MODEL: 'carvalue_candidate_model',
  TRAINED_VERSIONS: 'carvalue_trained_versions',
  DATASET_ROWS: 'carvalue_dataset_rows',
};

// Model baseline values in INR for typical brand models
const MODEL_BASE_PRICES: Record<string, number> = {
  // Luxury
  "3 Series": 4500000, "5 Series": 6500000, "7 Series": 11000000, "X1": 4200000, "X3": 6500000, "X5": 8500000,
  "C-Class": 4800000, "E-Class": 7000000, "S-Class": 14000000, "GLA": 4400000, "GLC": 6800000, "GLE": 8800000, "A-Class": 3800000,
  "A4": 4300000, "A6": 6200000, "Q3": 4200000, "Q5": 6300000, "Q7": 8500000,
  "Range Rover Evoque": 6500000, "Discovery Sport": 6800000, "Freelander 2": 4500000,
  "Wrangler": 6200000,

  // High / Full-Size SUV & MPV
  "Fortuner": 3600000, "Innova Crysta": 2400000, "Innova": 1600000, "Camry": 4200000,
  "Endeavour": 3400000, "Gloster": 3800000, "Carnival": 3200000, "Kodiaq": 3700000, "Superb": 3400000,
  "Octavia": 2800000, "Meridian": 3400000,

  // Mid-Size SUV & Premium Sedans
  "Creta": 1500000, "Seltos": 1550000, "Harrier": 1900000, "Safari": 2000000,
  "Scorpio": 1600000, "XUV500": 1600000, "XUV700": 2100000, "Thar": 1600000,
  "Hector": 1800000, "Compass": 2200000, "City": 1400000, "Civic": 2000000,
  "Corolla Altis": 1700000, "Verna": 1450000, "Slavia": 1400000, "Kushaq": 1500000,
  "Taigun": 1550000, "Duster": 1200000,

  // Compact SUV & Premium Hatchbacks
  "Nexon": 1150000, "Venue": 1100000, "Sonet": 1150000, "Vitara Brezza": 1050000,
  "EcoSport": 1050000, "XUV300": 1150000, "Urban Cruiser": 1050000, "WR-V": 1000000,
  "Baleno": 850000, "i20": 900000, "Polo": 850000, "Altroz": 850000, "Jazz": 850000,
  "Amaze": 850000, "Dzire": 850000, "Aura": 800000, "Rapid": 950000, "Vento": 950000,
  "Yaris": 980000, "Kicks": 1100000, "Astor": 1300000, "ZS EV": 2400000,

  // Budget Hatchbacks & Compacts
  "Swift": 750000, "Grand i10": 700000, "Tiago": 680000, "Ignis": 680000, "Wagon R": 650000,
  "Celerio": 600000, "Triber": 700000, "Kiger": 750000, "Punch": 750000, "Tigor": 720000,
  "Alto": 420000, "Santro": 480000, "Eon": 380000, "Kwid": 480000, "redi-GO": 380000,
  "GO": 450000, "GO Plus": 520000, "Micra": 600000, "Figo": 650000, "Beat": 480000,
  "Spark": 380000, "Sail": 580000, "Tavera": 750000, "Bolero": 900000, "KUV100": 650000,
  "Marazzo": 1250000, "Xylo": 900000, "Etios": 750000, "Glanza": 850000, "Brio": 550000,
  "Ritz": 550000, "Zen Estilo": 420000, "Indica": 450000
};

const BRAND_DEPRECIATION_RATE: Record<string, number> = {
  "Toyota": 0.065,
  "Maruti": 0.075,
  "Hyundai": 0.082,
  "Honda": 0.085,
  "Kia": 0.085,
  "Mahindra": 0.088,
  "Tata": 0.089,
  "Ford": 0.105,
  "Volkswagen": 0.105,
  "Skoda": 0.108,
  "Renault": 0.11,
  "Nissan": 0.11,
  "MG": 0.10,
  "BMW": 0.125,
  "Mercedes-Benz": 0.125,
  "Audi": 0.13,
  "Jeep": 0.115,
  "Land Rover": 0.135,
  "Chevrolet": 0.14,
  "Datsun": 0.13
};

export class ValuationService {
  private static getStoredData<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private static setStoredData(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  public static getBrandModels(): Record<string, string[]> {
    return this.getStoredData(STORAGE_KEYS.BRAND_MODELS, INITIAL_BRAND_MODELS);
  }

  public static getActiveModel(): ModelComparisonData {
    return this.getStoredData(STORAGE_KEYS.PRODUCTION_MODEL, INITIAL_MODEL_COMPARISON);
  }

  public static getCandidateModel(): ModelComparisonData | null {
    return this.getStoredData(STORAGE_KEYS.CANDIDATE_MODEL, null);
  }

  public static predict(input: PredictionInput): PredictionResult {
    const activeModel = this.getActiveModel();
    const brandModels = this.getBrandModels();

    if (!brandModels[input.Brand] || !brandModels[input.Brand].includes(input.model)) {
      throw new Error(`Selected model "${input.model}" does not belong to selected brand "${input.Brand}".`);
    }

    // Baseline calculation based on model brand & segment
    let basePrice = MODEL_BASE_PRICES[input.model] || 800000;
    
    // Brand depreciation factor
    const depRate = BRAND_DEPRECIATION_RATE[input.Brand] || 0.09;
    
    // Age depreciation (compounded depreciation curve)
    const age = Math.max(0, input.Age);
    let depreciated = basePrice * Math.pow(1 - depRate, age);

    // Mileage adjustment (standard usage ~12,000 km/year)
    const expectedKm = age * 12000;
    const kmDelta = input.kmDriven_num - expectedKm;
    // For every 10,000 km above/below expected, deduct or add ~1.8% of depreciated value
    const mileageFactor = 1 - (kmDelta / 10000) * 0.018;
    depreciated *= Math.max(0.65, Math.min(1.25, mileageFactor));

    // Fuel Type Adjustment
    if (input.FuelType === 'Diesel') {
      depreciated *= 1.05;
    } else if (input.FuelType === 'CNG') {
      depreciated *= 1.02;
    } else if (input.FuelType === 'Electric') {
      depreciated *= 1.08;
    } else if (input.FuelType === 'LPG') {
      depreciated *= 0.94;
    }

    // Transmission Adjustment
    if (input.Transmission === 'Automatic') {
      depreciated += 65000;
    }

    // Ownership Adjustment
    if (input.Owner === 'First Owner') {
      // standard
    } else if (input.Owner === 'Second Owner') {
      depreciated *= 0.88;
    } else if (input.Owner === 'Third Owner') {
      depreciated *= 0.77;
    } else if (input.Owner === 'Fourth & Above Owner') {
      depreciated *= 0.65;
    } else if (input.Owner === 'Test Drive Car') {
      depreciated *= 0.92;
    }

    // Floor price at 30,000 INR
    const finalPrice = Math.max(30000, Math.round(depreciated / 500) * 500);
    const mae = activeModel.best?.MAE || 213098;
    const low = Math.max(10000, Math.round((finalPrice - mae) / 500) * 500);
    const high = Math.round((finalPrice + mae) / 500) * 500;

    let assessment: string | null = null;
    let recommendation: string | null = null;
    let buyer_action: string | null = null;
    let seller_action: string | null = null;
    let difference: number | null = null;
    let difference_percent: number | null = null;

    if (input.asking_price !== null && input.asking_price !== undefined) {
      difference = input.asking_price - finalPrice;
      difference_percent = finalPrice ? Math.round((Math.abs(difference) / finalPrice) * 1000) / 10 : 0;

      if (difference_percent <= 5) {
        assessment = "Fair market price";
        recommendation = "The asking price is close to the estimated market value.";
        buyer_action = "Consider buying or negotiate slightly.";
        seller_action = "The asking price is reasonable for the market.";
      } else if (difference > 0) {
        assessment = "Above market value";
        recommendation = "Don't buy at this asking price. Try negotiating closer to the estimated value.";
        buyer_action = "Don't buy at this asking price. Try negotiating closer to the estimated value.";
        seller_action = "Consider reducing the asking price to attract buyers.";
      } else {
        assessment = "Below market value";
        recommendation = "Good opportunity for a buyer. A seller may consider increasing the asking price.";
        buyer_action = "Good opportunity to consider buying, subject to the vehicle's condition.";
        seller_action = "Consider increasing the asking price toward the estimated market value.";
      }
    }

    return {
      estimated_value: finalPrice,
      estimated_range: { low, high },
      asking_price: input.asking_price,
      difference,
      difference_percent,
      assessment,
      recommendation,
      buyer_action,
      seller_action,
      model_version: activeModel.version || "v1"
    };
  }

  public static validateDatasetText(csvContent: string): { valid: boolean; rows: number; columns: string[]; validation: DatasetValidationReport; error?: string } {
    const lines = csvContent.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      return {
        valid: false,
        rows: 0,
        columns: [],
        validation: { rows_before: 0, rows_after: 0, missing_required: [], invalid_or_missing_price_removed: 0 },
        error: "CSV file is empty or missing data rows."
      };
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const required = ["Brand", "model", "Year", "Age", "kmDriven", "Transmission", "Owner", "FuelType", "AskPrice"];
    const missing = required.filter(r => !headers.includes(r));

    if (missing.length > 0) {
      return {
        valid: false,
        rows: 0,
        columns: headers,
        validation: {
          rows_before: lines.length - 1,
          rows_after: 0,
          missing_required: missing,
          invalid_or_missing_price_removed: 0
        },
        error: `Missing required columns: ${missing.join(', ')}`
      };
    }

    const priceIdx = headers.indexOf("AskPrice");
    const brandIdx = headers.indexOf("Brand");
    const modelIdx = headers.indexOf("model");

    let validRows = 0;
    let removedPrices = 0;
    const uniqueKeys = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length <= priceIdx) {
        removedPrices++;
        continue;
      }
      const rawPrice = parts[priceIdx].replace(/[^\d.]/g, '');
      const numPrice = parseFloat(rawPrice);
      if (isNaN(numPrice) || numPrice <= 0) {
        removedPrices++;
        continue;
      }

      // deduplicate
      const rowKey = parts.join('|');
      if (uniqueKeys.has(rowKey)) {
        continue;
      }
      uniqueKeys.add(rowKey);
      validRows++;
    }

    const report: DatasetValidationReport = {
      rows_before: lines.length - 1,
      rows_after: validRows,
      missing_required: [],
      invalid_or_missing_price_removed: removedPrices
    };

    return {
      valid: true,
      rows: validRows,
      columns: headers,
      validation: report
    };
  }

  public static retrainModels(newRowsCount: number = 240): ModelComparisonData {
    const currentActive = this.getActiveModel();
    const currentVersionNum = parseInt((currentActive.version || "v1").replace("v", ""), 10) || 1;
    const nextVersion = `v${currentVersionNum + 1}`;
    const totalRows = (currentActive.dataset_rows || 9582) + newRowsCount;

    // Simulate realistic performance across the 6 algorithms
    // XGBoost remains top contender with subtle variations
    const seed = Date.now() % 1000;
    const baseVariation = (seed - 500) / 5000; // ±10%

    const results = [
      {
        key: "linear_regression",
        algorithm: "Linear Regression",
        RMSE: Math.round(776144 * (1 + baseVariation * 0.4)),
        MAE: Math.round(336123 * (1 + baseVariation * 0.3)),
        R2: Math.min(0.85, Math.max(0.70, 0.7753 - baseVariation * 0.05))
      },
      {
        key: "ridge_regression",
        algorithm: "Ridge Regression",
        RMSE: Math.round(779602 * (1 + baseVariation * 0.4)),
        MAE: Math.round(336616 * (1 + baseVariation * 0.3)),
        R2: Math.min(0.85, Math.max(0.70, 0.7733 - baseVariation * 0.05))
      },
      {
        key: "lasso_regression",
        algorithm: "Lasso Regression",
        RMSE: Math.round(778618 * (1 + baseVariation * 0.4)),
        MAE: Math.round(335943 * (1 + baseVariation * 0.3)),
        R2: Math.min(0.85, Math.max(0.70, 0.7738 - baseVariation * 0.05))
      },
      {
        key: "random_forest",
        algorithm: "Random Forest",
        RMSE: Math.round(652066 * (1 + baseVariation * 0.3)),
        MAE: Math.round(199858 * (1 + baseVariation * 0.2)),
        R2: Math.min(0.89, Math.max(0.80, 0.8414 - baseVariation * 0.03))
      },
      {
        key: "xgboost",
        algorithm: "XGBoost",
        RMSE: Math.round(582112 * (1 - Math.abs(baseVariation) * 0.05)), // tends to improve slightly
        MAE: Math.round(213098 * (1 - Math.abs(baseVariation) * 0.04)),
        R2: Math.min(0.92, Math.max(0.84, 0.8736 + Math.abs(baseVariation) * 0.02))
      },
      {
        key: "lightgbm",
        algorithm: "LightGBM",
        RMSE: Math.round(959455 * (1 + baseVariation * 0.2)),
        MAE: Math.round(326110 * (1 + baseVariation * 0.2)),
        R2: Math.min(0.78, Math.max(0.60, 0.6566 - baseVariation * 0.04))
      }
    ];

    const best = results.reduce((prev, curr) => (curr.RMSE < prev.RMSE ? curr : prev), results[0]);

    const comparison: ModelComparisonData = {
      dataset_rows: totalRows,
      version: nextVersion,
      trained_at: new Date().toISOString(),
      split: "80/20",
      random_state: 42,
      results,
      best
    };

    // Store candidate
    this.setStoredData(STORAGE_KEYS.CANDIDATE_MODEL, comparison);
    return comparison;
  }

  public static deployCandidate(candidate: ModelComparisonData): { deployed: boolean; version: string; previous_rmse: number; candidate_rmse: number; message: string } {
    const active = this.getActiveModel();
    const previous_rmse = active.best.RMSE;
    const candidate_rmse = candidate.best.RMSE;

    if (candidate_rmse >= previous_rmse) {
      return {
        deployed: false,
        version: candidate.version || "unknown",
        previous_rmse,
        candidate_rmse,
        message: "Candidate rejected because its RMSE is not better than production."
      };
    }

    this.setStoredData(STORAGE_KEYS.PRODUCTION_MODEL, candidate);
    this.setStoredData(STORAGE_KEYS.CANDIDATE_MODEL, null);

    return {
      deployed: true,
      version: candidate.version || "unknown",
      previous_rmse,
      candidate_rmse,
      message: "New model activated."
    };
  }
}
