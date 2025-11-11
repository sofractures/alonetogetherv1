"use client";

import { useState } from 'react';
import { LocationData, getCoordinatesFromCityCountry } from '@/lib/location';

interface LocationSelectorProps {
  onLocationSelected: (location: LocationData | null) => void;
  onCancel: () => void;
  initialLocation?: LocationData | null;
}

export default function LocationSelector({
  onLocationSelected,
  onCancel,
  initialLocation,
}: LocationSelectorProps) {
  const [useManual, setUseManual] = useState(false);
  const [manualLat, setManualLat] = useState(initialLocation?.latitude?.toString() || '');
  const [manualLon, setManualLon] = useState(initialLocation?.longitude?.toString() || '');
  const [manualCity, setManualCity] = useState(initialLocation?.city || '');
  const [manualCountry, setManualCountry] = useState(initialLocation?.country || '');
  const [manualName, setManualName] = useState(initialLocation?.name || '');

  const handleUseCurrentLocation = () => {
    onLocationSelected(null); // Let parent handle browser geolocation
  };

  const handleManualSubmit = async () => {
    // If user provided lat/lon, validate and use them directly
    if (manualLat.trim() !== '' && manualLon.trim() !== '') {
      const lat = parseFloat(manualLat);
      const lon = parseFloat(manualLon);
      if (isNaN(lat) || isNaN(lon)) {
        alert('Please enter valid latitude and longitude values');
        return;
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        alert('Latitude must be between -90 and 90, Longitude between -180 and 180');
        return;
      }
      onLocationSelected({
        latitude: lat,
        longitude: lon,
        city: manualCity || undefined,
        country: manualCountry || undefined,
        name: manualName || undefined,
      });
      return;
    }

    // Otherwise, allow city/country only and geocode them
    if ((manualCity && manualCity.trim() !== '') || (manualCountry && manualCountry.trim() !== '')) {
      const coords = await getCoordinatesFromCityCountry(
        manualCity?.trim() || undefined,
        manualCountry?.trim() || undefined
      );
      if (!coords) {
        alert('Could not find that place. Try a more specific city name (e.g., city, country).');
        return;
      }
      onLocationSelected({
        latitude: coords.latitude,
        longitude: coords.longitude,
        city: manualCity || undefined,
        country: manualCountry || undefined,
        name: manualName || undefined,
      });
      return;
    }

    // If nothing provided, prompt user
    alert('Please enter either latitude/longitude OR a city and/or country.');
  };

  const handleSkip = () => {
    onLocationSelected(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl border border-purple-400/30 bg-gray-900/95 backdrop-blur p-6">
        <h2 className="text-white text-xl font-semibold mb-4">Set Your Location</h2>
        <p className="text-gray-300 text-sm mb-6">
          Your memory will be pinned to the globe at this location. You can use your current location or set a custom one.
        </p>

        {!useManual ? (
          <div className="space-y-3">
            <button
              onClick={handleUseCurrentLocation}
              className="w-full px-4 py-3 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors font-semibold"
            >
              Use Current Location
            </button>
            <button
              onClick={() => setUseManual(true)}
              className="w-full px-4 py-3 rounded border border-purple-400/40 text-purple-200 hover:bg-purple-800/30 transition-colors"
            >
              Set Custom Location
            </button>
            <button
              onClick={handleSkip}
              className="w-full px-4 py-2 rounded text-gray-400 hover:text-gray-200 transition-colors text-sm"
            >
              Skip (No Location)
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Latitude (optional)</label>
              <input
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="e.g., 51.5074"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">Longitude (optional)</label>
              <input
                type="number"
                step="any"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
                placeholder="e.g., -0.1278"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">City (optional)</label>
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="e.g., London"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">Country (optional)</label>
              <input
                type="text"
                value={manualCountry}
                onChange={(e) => setManualCountry(e.target.value)}
                placeholder="e.g., United Kingdom"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">Name (optional)</label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Your name or alias"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleManualSubmit}
                className="flex-1 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors font-semibold"
              >
                Use This Location
              </button>
              <button
                onClick={() => setUseManual(false)}
                className="px-4 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

