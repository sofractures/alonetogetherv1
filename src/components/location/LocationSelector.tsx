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
  const [manualCity, setManualCity] = useState(initialLocation?.city || '');
  const [manualCountry, setManualCountry] = useState(initialLocation?.country || '');
  const [manualName, setManualName] = useState(initialLocation?.name || '');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleUseCurrentLocation = () => {
    onLocationSelected(null); // Let parent handle browser geolocation
  };

  const handleManualSubmit = async () => {
    // Validate that at least city or country is provided
    if (!manualCity.trim() && !manualCountry.trim()) {
      alert('Please enter at least a city or country.');
      return;
    }

    setIsGeocoding(true);
    try {
      // Geocode city/country to coordinates
      const coords = await getCoordinatesFromCityCountry(
        manualCity?.trim() || undefined,
        manualCountry?.trim() || undefined
      );
      
      if (!coords) {
        alert('Could not find that place. Please try a more specific city name (e.g., "London, United Kingdom").');
        setIsGeocoding(false);
        return;
      }
      
      onLocationSelected({
        latitude: coords.latitude,
        longitude: coords.longitude,
        city: manualCity.trim() || undefined,
        country: manualCountry.trim() || undefined,
        name: manualName.trim() || undefined,
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to find location. Please try again.');
      setIsGeocoding(false);
    }
  };

  const handleSkip = () => {
    onLocationSelected(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl border border-purple-400/30 bg-gray-900/95 backdrop-blur p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#e5ddc7' }}>Set Your Location</h2>
        <p className="text-sm mb-6" style={{ color: '#e5ddc7' }}>
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
              className="w-full px-4 py-2 rounded transition-colors text-sm"
              style={{ color: '#e5ddc7' }}
            >
              Skip (No Location)
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: '#e5ddc7' }}>
                City <span className="text-gray-500">(at least city or country required)</span>
              </label>
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="e.g., London"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                disabled={isGeocoding}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#e5ddc7' }}>
                Country <span className="text-gray-500">(at least city or country required)</span>
              </label>
              <input
                type="text"
                value={manualCountry}
                onChange={(e) => setManualCountry(e.target.value)}
                placeholder="e.g., United Kingdom"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                disabled={isGeocoding}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: '#e5ddc7' }}>Name <span className="text-gray-500">(optional)</span></label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Your name or alias"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                disabled={isGeocoding}
              />
              <p className="text-xs mt-1" style={{ color: '#e5ddc7' }}>This name will be shown when others listen to your memory</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleManualSubmit}
                disabled={isGeocoding || (!manualCity.trim() && !manualCountry.trim())}
                className="flex-1 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeocoding ? 'Finding location...' : 'Use This Location'}
              </button>
              <button
                onClick={() => setUseManual(false)}
                disabled={isGeocoding}
                className="px-4 py-2 rounded border border-gray-600 hover:bg-gray-800 transition-colors disabled:opacity-50"
                style={{ color: '#e5ddc7' }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onCancel}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: '#e5ddc7' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

