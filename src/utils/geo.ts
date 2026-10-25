/**
 * Real device geolocation, proximity calculations, and Malaysian region detection for ONY.
 * Production-ready for market deployment.
 */

export interface UserCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
  regionName?: string;
  stateCode?: string;
}

export interface RegionInfo {
  state: string;
  country: string;
  labelEn: string;
  labelBm: string;
  labelZh: string;
  lat: number;
  lng: number;
}

// Centroids of Malaysian states and territories
export const MALAYSIAN_STATES: RegionInfo[] = [
  {
    state: "Kuala Lumpur",
    country: "Malaysia",
    labelEn: "Kuala Lumpur (Federal Territory)",
    labelBm: "Kuala Lumpur (Wilayah Persekutuan)",
    labelZh: "吉隆坡（联邦直辖区）",
    lat: 3.1390,
    lng: 101.6869,
  },
  {
    state: "Selangor",
    country: "Malaysia",
    labelEn: "Selangor (Klang Valley)",
    labelBm: "Selangor (Lembah Klang)",
    labelZh: "雪兰莪（巴生谷）",
    lat: 3.0738,
    lng: 101.5183,
  },
  {
    state: "Putrajaya",
    country: "Malaysia",
    labelEn: "Putrajaya",
    labelBm: "Putrajaya",
    labelZh: "布城",
    lat: 2.9264,
    lng: 101.6964,
  },
  {
    state: "Pulau Pinang",
    country: "Malaysia",
    labelEn: "Penang (Pulau Pinang)",
    labelBm: "Pulau Pinang",
    labelZh: "槟城",
    lat: 5.4164,
    lng: 100.3327,
  },
  {
    state: "Johor",
    country: "Malaysia",
    labelEn: "Johor",
    labelBm: "Johor",
    labelZh: "柔佛",
    lat: 1.4927,
    lng: 103.7414,
  },
  {
    state: "Perak",
    country: "Malaysia",
    labelEn: "Perak",
    labelBm: "Perak",
    labelZh: "霹雳",
    lat: 4.5975,
    lng: 101.0901,
  },
  {
    state: "Kedah",
    country: "Malaysia",
    labelEn: "Kedah",
    labelBm: "Kedah",
    labelZh: "吉打",
    lat: 6.1184,
    lng: 100.3685,
  },
  {
    state: "Melaka",
    country: "Malaysia",
    labelEn: "Melaka (Malacca)",
    labelBm: "Melaka",
    labelZh: "马六甲",
    lat: 2.1896,
    lng: 102.2501,
  },
  {
    state: "Negeri Sembilan",
    country: "Malaysia",
    labelEn: "Negeri Sembilan",
    labelBm: "Negeri Sembilan",
    labelZh: "森美兰",
    lat: 2.7258,
    lng: 101.9424,
  },
  {
    state: "Pahang",
    country: "Malaysia",
    labelEn: "Pahang",
    labelBm: "Pahang",
    labelZh: "彭亨",
    lat: 3.8126,
    lng: 103.3256,
  },
  {
    state: "Terengganu",
    country: "Malaysia",
    labelEn: "Terengganu",
    labelBm: "Terengganu",
    labelZh: "登嘉楼",
    lat: 5.3117,
    lng: 103.1324,
  },
  {
    state: "Kelantan",
    country: "Malaysia",
    labelEn: "Kelantan",
    labelBm: "Kelantan",
    labelZh: "吉兰丹",
    lat: 6.1254,
    lng: 102.2386,
  },
  {
    state: "Perlis",
    country: "Malaysia",
    labelEn: "Perlis",
    labelBm: "Perlis",
    labelZh: "玻璃市",
    lat: 6.4449,
    lng: 100.2048,
  },
  {
    state: "Sabah",
    country: "Malaysia",
    labelEn: "Sabah",
    labelBm: "Sabah",
    labelZh: "沙巴",
    lat: 5.9804,
    lng: 116.0735,
  },
  {
    state: "Sarawak",
    country: "Malaysia",
    labelEn: "Sarawak",
    labelBm: "Sarawak",
    labelZh: "砂拉越",
    lat: 1.5533,
    lng: 110.3592,
  },
  {
    state: "Labuan",
    country: "Malaysia",
    labelEn: "Labuan",
    labelBm: "Labuan",
    labelZh: "纳闽",
    lat: 5.2831,
    lng: 115.2308,
  },
];

/**
 * Calculates the great-circle distance between two points on the Earth
 * using the Haversine formula. Returns distance in kilometers (km).
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

/**
 * Format distance in a human-friendly way:
 * e.g. "850 m away", "2.4 km away", "34 km away"
 */
export function formatDistanceString(
  km: number,
  language: "English" | "Bahasa Melayu" | "中文" = "English",
): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    if (language === "Bahasa Melayu") return `~${meters} m berdekatan`;
    if (language === "中文") return `约 ${meters} 米`;
    return `~${meters} m away`;
  }
  const formatted = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  if (language === "Bahasa Melayu") return `${formatted} km dari anda`;
  if (language === "中文") return `距离约 ${formatted} 公里`;
  return `${formatted} km away`;
}

/**
 * Resolves the closest Malaysian state/territory from GPS coordinates.
 */
export function resolveMalaysianRegion(lat: number, lng: number): RegionInfo {
  // If coordinates are clearly within Malaysia (Lat: 0.8 - 7.5, Lng: 99.5 - 119.5)
  let closest = MALAYSIAN_STATES[0];
  let minDistance = Infinity;

  for (const s of MALAYSIAN_STATES) {
    const dist = haversineDistanceKm(lat, lng, s.lat, s.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = s;
    }
  }

  return closest;
}

/**
 * Requests device GPS location via HTML5 Geolocation API with high accuracy.
 */
export function requestDeviceLocation(): Promise<UserCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by your browser or environment."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const region = resolveMalaysianRegion(latitude, longitude);
        const result: UserCoordinates = {
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy || 0),
          timestamp: position.timestamp,
          regionName: region.labelEn,
          stateCode: region.state,
        };

        // Cache in localStorage for session persistence
        try {
          localStorage.setItem("ony_user_location", JSON.stringify(result));
        } catch {
          // ignore
        }

        resolve(result);
      },
      (error) => {
        let msg = "Could not retrieve your device location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = "Location access was denied. Please allow location permissions in your browser or device settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            msg = "Location information is unavailable on this device or network.";
            break;
          case error.TIMEOUT:
            msg = "The request to get your device location timed out. Please try again.";
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  });
}

/**
 * Loads cached user coordinates from localStorage if available.
 */
export function loadCachedLocation(): UserCoordinates | null {
  try {
    const raw = localStorage.getItem("ony_user_location");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
      return parsed as UserCoordinates;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Clears stored user location cache.
 */
export function clearCachedLocation(): void {
  try {
    localStorage.removeItem("ony_user_location");
  } catch {
    // ignore
  }
}
