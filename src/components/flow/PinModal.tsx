"use client";

import { useState } from 'react';
import { LocationData, getCoordinatesFromCityCountry } from '@/lib/location';

interface PinModalProps {
  isOpen: boolean;
  onPin: (data: { email: string; location: LocationData | null; name?: string }) => void;
  onCancel: () => void;
  initialLocation?: LocationData | null;
}

export default function PinModal({
  isOpen,
  onPin,
  onCancel,
  initialLocation,
}: PinModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState(initialLocation?.name || '');
  const [manualCity, setManualCity] = useState(initialLocation?.city || '');
  const [manualCountry, setManualCountry] = useState(initialLocation?.country || '');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleManualSubmit = async () => {
    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }

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
      
      setIsSubmitting(true);
      onPin({
        email,
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: manualCity.trim() || undefined,
          country: manualCountry.trim() || undefined,
          name: name.trim() || undefined,
        },
        name: name.trim() || undefined,
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to find location. Please try again.');
      setIsGeocoding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-labelledby="pin-modal-title">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md" 
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl border border-white/20 bg-black/80 backdrop-blur-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: '#e5ddc7' }}
          aria-label="Close pin modal"
        >
          ✕
        </button>
        
        <h2 id="pin-modal-title" className="text-2xl font-semibold mb-2" style={{ color: '#e5ddc7' }}>
          Add Your Memory to the Globe
        </h2>
        
        <p className="text-sm mb-6" style={{ color: '#e5ddc7' }}>
          Your story will appear as a glowing window that anyone can discover. Plus, you&apos;ll get your personalized song to keep forever.
        </p>

        <div className="space-y-4">
          {/* Email Input - Required */}
          <div>
            <label className="block text-sm mb-1" style={{ color: '#e5ddc7' }}>
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 rounded bg-gray-900/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
              disabled={isSubmitting || isGeocoding}
              required
            />
            <p className="text-xs mt-1" style={{ color: '#e5ddc7' }}>Lets you download your song from your window on the globe anytime</p>
          </div>

          {/* Name Input - Optional */}
          <div>
            <label className="block text-sm mb-1" style={{ color: '#e5ddc7' }}>
              Name <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (or stay anonymous)"
              className="w-full px-3 py-2 rounded bg-gray-900/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
              disabled={isSubmitting || isGeocoding}
            />
          </div>

          {/* Location Section - Only show if location not already provided */}
          {!initialLocation && (
            <div>
              <label className="block text-sm mb-2" style={{ color: '#e5ddc7' }}>
                Location <span className="text-gray-500">(where should your window glow?)</span>
              </label>

              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder="City (e.g., London)"
                    className="w-full px-3 py-2 rounded bg-gray-900/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
                    disabled={isGeocoding || isSubmitting}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={manualCountry}
                    onChange={(e) => setManualCountry(e.target.value)}
                    placeholder="Country (e.g., United Kingdom)"
                    className="w-full px-3 py-2 rounded bg-gray-900/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
                    disabled={isGeocoding || isSubmitting}
                  />
                </div>
                <button
                  onClick={handleManualSubmit}
                  disabled={isGeocoding || isSubmitting || !isValidEmail(email) || (!manualCity.trim() && !manualCountry.trim())}
                  className="w-full px-4 py-2 rounded bg-white text-black hover:bg-gray-100 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeocoding ? 'Finding location...' : isSubmitting ? 'Pinning...' : 'Pin My Memory'}
                </button>
                <button
                  onClick={onCancel}
                  disabled={isSubmitting || isGeocoding}
                  className="w-full px-4 py-2 rounded transition-colors text-sm disabled:opacity-50"
                  style={{ color: '#e5ddc7' }}
                >
                  Exit
                </button>
              </div>
            </div>
          )}
          
          {/* Show location info if already provided */}
          {initialLocation && (initialLocation.city || initialLocation.country) && (
            <div className="bg-white/10 border border-white/20 rounded p-3">
              <p className="text-sm" style={{ color: '#e5ddc7' }}>
                📍 Location: <strong>{initialLocation.city || ''}{initialLocation.city && initialLocation.country ? ', ' : ''}{initialLocation.country || ''}</strong>
              </p>
            </div>
          )}
          
          {/* Pin button when location is already provided */}
          {initialLocation && (
            <button
              onClick={() => {
                if (!isValidEmail(email)) {
                  alert('Please enter a valid email address.');
                  return;
                }
                setIsSubmitting(true);
                onPin({ 
                  email, 
                  location: initialLocation, 
                  name: name.trim() || undefined 
                });
              }}
              disabled={!isValidEmail(email) || isSubmitting}
              className="w-full px-6 py-3 rounded bg-white text-black hover:bg-gray-100 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Pinning...' : 'Pin My Memory'}
            </button>
          )}

          {/* Benefits */}
          <div className="pt-4 border-t border-white/20">
            <p className="text-sm mb-2" style={{ color: '#e5ddc7' }}>Benefits:</p>
            <ul className="text-sm space-y-1" style={{ color: '#e5ddc7' }}>
              <li>✓ See your window on the globe</li>
              <li>✓ Download your unique song</li>
              <li>✓ Return anytime to listen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

