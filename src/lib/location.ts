export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

/**
 * Get user's location using browser geolocation API
 */
export async function getBrowserLocation(): Promise<LocationData | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Try to get city/country from reverse geocoding (optional)
        try {
          const cityCountry = await getCityFromCoordinates(latitude, longitude);
          resolve({
            latitude,
            longitude,
            city: cityCountry.city,
            country: cityCountry.country,
          });
        } catch {
          // If reverse geocoding fails, still return coordinates
          resolve({
            latitude,
            longitude,
          });
        }
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Get city and country from coordinates using a free reverse geocoding service
 */
async function getCityFromCoordinates(
  lat: number,
  lng: number
): Promise<{ city?: string; country?: string }> {
  try {
    // Using OpenStreetMap Nominatim (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AloneTogether/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    const address = data.address || {};

    return {
      city: address.city || address.town || address.village || address.municipality,
      country: address.country,
    };
  } catch (error) {
    console.warn('Reverse geocoding error:', error);
    return {};
  }
}

/**
 * Get approximate location from IP address (fallback)
 */
export async function getIPLocation(): Promise<LocationData | null> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();

    if (data.latitude && data.longitude) {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country_name,
      };
    }
  } catch (error) {
    console.warn('IP geolocation error:', error);
  }

  return null;
}

