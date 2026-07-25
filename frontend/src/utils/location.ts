import type { LocationData } from "../types";

export type LocationErrorType = "permission_denied" | "timeout" | "unavailable" | "unsupported" | "unknown";

export interface LocationResult {
  success: boolean;
  data?: LocationData;
  error?: {
    type: LocationErrorType;
    message: string;
  };
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  city: string;
}

const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
    if (!res.ok) throw new Error("Nominatim failed");
    const data = await res.json();
    const formattedAddress = data.display_name || "";
    const addr = data?.address || {};
    const city = addr.city || addr.town || addr.village || addr.suburb || addr.neighbourhood || addr.county || (data.display_name ? data.display_name.split(",")[0] : "");
    return { formattedAddress: formattedAddress || "Current Location", city: city || "Your Location" };
  } catch {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
      if (!res.ok) throw new Error("BigDataCloud fallback failed");
      const data = await res.json();
      const parts: string[] = [];
      if (data.locality) parts.push(data.locality);
      if (data.city) parts.push(data.city);
      if (data.principalSubdivision) parts.push(data.principalSubdivision);
      if (data.countryName) parts.push(data.countryName);
      const formattedAddress = parts.join(", ");
      const city = data.city || data.locality || "";
      return { formattedAddress: formattedAddress || "Current Location", city: city || "Your Location" };
    } catch {
      return { formattedAddress: "Current Location", city: "Your Location" };
    }
  }
}

export async function getLiveLocation(maxRetries = MAX_RETRIES): Promise<LocationResult> {
  if (!navigator.geolocation) {
    return {
      success: false,
      error: { type: "unsupported", message: "Geolocation is not supported by your browser." },
    };
  }

  let lastError: GeolocationPositionError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, HIGH_ACCURACY_OPTIONS);
      });

      const { latitude, longitude, accuracy } = position.coords;
      const geocode = await reverseGeocode(latitude, longitude);

      return {
        success: true,
        data: {
          latitude,
          longitude,
          formattedAddress: geocode.formattedAddress,
          accuracy: accuracy ?? undefined,
        },
      };
    } catch (err) {
      lastError = err as GeolocationPositionError;

      if (lastError.code === lastError.PERMISSION_DENIED) {
        return {
          success: false,
          error: { type: "permission_denied", message: "Location permission denied. Please allow location access or pick a location manually on the map." },
        };
      }

      if (lastError.code === lastError.TIMEOUT && attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      if (lastError.code === lastError.POSITION_UNAVAILABLE && attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      break;
    }
  }

  const errorMessage = lastError
    ? getGeolocationErrorMessage(lastError)
    : "Unable to retrieve location.";

  return {
    success: false,
    error: { type: getGeolocationErrorType(lastError), message: errorMessage },
  };
}

export async function startLiveTracking(
  onUpdate: (data: LocationData) => void,
  onError: (result: LocationResult) => void
): Promise<number | undefined> {
  if (!navigator.geolocation) {
    onError({
      success: false,
      error: { type: "unsupported", message: "Geolocation is not supported by your browser." },
    });
    return;
  }

  return navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const geocode = await reverseGeocode(latitude, longitude);
      onUpdate({
        latitude,
        longitude,
        formattedAddress: geocode.formattedAddress,
        accuracy: position.coords.accuracy ?? undefined,
      });
    },
    (err) => {
      onError({
        success: false,
        error: { type: getGeolocationErrorType(err), message: getGeolocationErrorMessage(err) },
      });
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

export function stopLiveTracking(watchId: number) {
  navigator.geolocation.clearWatch(watchId);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeolocationErrorType(error: GeolocationPositionError | null): LocationErrorType {
  if (!error) return "unknown";
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "permission_denied";
    case error.POSITION_UNAVAILABLE:
      return "unavailable";
    case error.TIMEOUT:
      return "timeout";
    default:
      return "unknown";
  }
}

function getGeolocationErrorMessage(error: GeolocationPositionError | null): string {
  if (!error) return "Unknown location error.";
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied. Please allow location access in your browser settings or pick a location manually.";
    case error.POSITION_UNAVAILABLE:
      return "Location unavailable. Please try again or pick a location manually on the map.";
    case error.TIMEOUT:
      return "Location request timed out. Please try again or pick a location manually.";
    default:
      return "Unable to retrieve location. Please pick a location manually on the map.";
  }
}
