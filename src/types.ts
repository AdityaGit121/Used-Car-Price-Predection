export interface PredictionInput {
  Brand: string;
  model: string;
  Year: number;
  Age: number;
  kmDriven_num: number;
  Transmission: string;
  Owner: string;
  FuelType: string;
  asking_price: number | null;
}

export interface EstimatedRange {
  low: number;
  high: number;
}

export interface PredictionResult {
  estimated_value: number;
  estimated_range: EstimatedRange;
  asking_price: number | null;
  difference: number | null;
  difference_percent: number | null;
  assessment: string | null;
  recommendation: string | null;
  buyer_action: string | null;
  seller_action: string | null;
  model_version: string;
}

export interface ModelMetric {
  key: string;
  algorithm: string;
  RMSE: number;
  MAE: number;
  R2: number;
}

export interface ModelComparisonData {
  dataset_rows: number;
  results: ModelMetric[];
  best: ModelMetric;
  version?: string;
  trained_at?: string;
  split?: string;
  random_state?: number;
}

export interface DatasetValidationReport {
  rows_before: number;
  rows_after: number;
  missing_required: string[];
  invalid_or_missing_price_removed: number;
}

export interface DatasetUploadResponse {
  message: string;
  filename: string;
  rows: number;
  validation: DatasetValidationReport;
}
