import React, { useState, useEffect } from 'react';
import { PredictionInput } from '../types';
import { FUEL_TYPES, TRANSMISSIONS, OWNERS } from '../data/carData';

interface ValuationFormProps {
  brandModels: Record<string, string[]>;
  onSubmit: (data: PredictionInput) => void;
  isLoading?: boolean;
  externalError?: string;
}

export const ValuationForm: React.FC<ValuationFormProps> = ({
  brandModels,
  onSubmit,
  isLoading = false,
  externalError = ''
}) => {
  const currentYear = new Date().getFullYear();

  const [brand, setBrand] = useState<string>('Maruti');
  const [model, setModel] = useState<string>('Swift');
  const [year, setYear] = useState<number>(2020);
  const [age, setAge] = useState<number>(Math.max(0, currentYear - 2020));
  const [kmDriven, setKmDriven] = useState<string>('45000');
  const [fuelType, setFuelType] = useState<string>('Petrol');
  const [transmission, setTransmission] = useState<string>('Manual');
  const [owner, setOwner] = useState<string>('First Owner');
  const [askingPrice, setAskingPrice] = useState<string>('580000');
  const [error, setError] = useState<string>('');

  const availableModels = brand && brandModels[brand] ? brandModels[brand] : [];

  // When brand changes, default to first model of that brand
  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBrand = e.target.value;
    setBrand(selectedBrand);
    const models = brandModels[selectedBrand] || [];
    setModel(models[0] || '');
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setYear(val);
    if (!isNaN(val) && val >= 1950 && val <= 2035) {
      setAge(Math.max(0, currentYear - val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!brand || !model) {
      setError('Please select both a brand and a model.');
      return;
    }

    const km = parseFloat(kmDriven);
    if (isNaN(km) || km < 0) {
      setError('Please enter a valid kilometres driven number.');
      return;
    }

    const asking = askingPrice ? parseFloat(askingPrice) : null;
    if (asking !== null && (isNaN(asking) || asking < 0)) {
      setError('Please enter a valid asking price or leave it empty.');
      return;
    }

    const payload: PredictionInput = {
      Brand: brand,
      model,
      Year: year,
      Age: age,
      kmDriven_num: km,
      FuelType: fuelType,
      Transmission: transmission,
      Owner: owner,
      asking_price: asking
    };

    onSubmit(payload);
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Vehicle details</h2>
          <p>Use the details shown in the listing or vehicle documents.</p>
        </div>
      </div>

      <form id="form" onSubmit={handleSubmit}>
        <div className="fields">
          <label>
            Brand
            <select
              id="Brand"
              value={brand}
              onChange={handleBrandChange}
              required
            >
              <option value="">Select brand</option>
              {Object.keys(brandModels).map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label>
            Model
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
            >
              <option value="">Select model</option>
              {availableModels.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label>
            Manufacturing Year
            <input
              id="Year"
              type="number"
              min="1950"
              max="2035"
              value={year}
              onChange={handleYearChange}
              required
            />
          </label>

          <label>
            Car Age
            <input
              id="Age"
              type="number"
              min="0"
              max="80"
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
              required
            />
          </label>

          <label>
            Kilometres Driven
            <input
              id="kmDriven_num"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 45000"
              value={kmDriven}
              onChange={(e) => setKmDriven(e.target.value)}
              required
            />
          </label>

          <label>
            Fuel Type
            <select
              id="FuelType"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              required
            >
              <option value="">Select</option>
              {FUEL_TYPES.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label>
            Transmission
            <select
              id="Transmission"
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              required
            >
              <option value="">Select</option>
              {TRANSMISSIONS.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            Number of Owners
            <select
              id="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              required
            >
              <option value="">Select</option>
              {OWNERS.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="wide">
            Current Seller Asking Price{' '}
            <span className="muted">(optional — enables market comparison)</span>
            <input
              id="asking_price"
              type="number"
              min="0"
              step="1000"
              placeholder="e.g. 620000"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
            />
          </label>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Estimating Fair Value...' : 'Check Fair Value'}
        </button>

        {(error || externalError) && (
          <div id="error" className="error-msg">
            {error || externalError}
          </div>
        )}
      </form>
    </section>
  );
};
