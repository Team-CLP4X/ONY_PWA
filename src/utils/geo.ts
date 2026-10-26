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
  isManual?: boolean;
  areaName?: string;
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

export interface MalaysianAreaItem {
  id: string;
  nameEn: string;
  nameBm: string;
  nameZh: string;
  state: string;
  category: "district" | "city" | "state";
  lat: number;
  lng: number;
  popular?: boolean;
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

// Curated list of Malaysian cities, towns, and districts for quick search & manual area discovery
export const MALAYSIAN_AREAS: MalaysianAreaItem[] = [
  // Klang Valley / Selangor / KL / Putrajaya
  {
    id: "kl-city",
    nameEn: "Kuala Lumpur (City Centre)",
    nameBm: "Pusat Bandar Kuala Lumpur",
    nameZh: "吉隆坡市中心",
    state: "Kuala Lumpur",
    category: "city",
    lat: 3.1478,
    lng: 101.6953,
    popular: true,
  },
  {
    id: "pj",
    nameEn: "Petaling Jaya",
    nameBm: "Petaling Jaya",
    nameZh: "八打灵再也 (PJ)",
    state: "Selangor",
    category: "city",
    lat: 3.1073,
    lng: 101.6067,
    popular: true,
  },
  {
    id: "subang",
    nameEn: "Subang Jaya / Sunway",
    nameBm: "Subang Jaya / Bandar Sunway",
    nameZh: "梳邦再也 / 双威",
    state: "Selangor",
    category: "district",
    lat: 3.0567,
    lng: 101.5851,
    popular: true,
  },
  {
    id: "shah-alam",
    nameEn: "Shah Alam",
    nameBm: "Shah Alam",
    nameZh: "莎阿南",
    state: "Selangor",
    category: "city",
    lat: 3.0738,
    lng: 101.5183,
    popular: true,
  },
  {
    id: "cheras",
    nameEn: "Cheras",
    nameBm: "Cheras",
    nameZh: "蕉赖",
    state: "Kuala Lumpur",
    category: "district",
    lat: 3.0982,
    lng: 101.7371,
    popular: false,
  },
  {
    id: "ampang",
    nameEn: "Ampang",
    nameBm: "Ampang",
    nameZh: "安邦",
    state: "Selangor",
    category: "district",
    lat: 3.1485,
    lng: 101.7615,
    popular: false,
  },
  {
    id: "klang-town",
    nameEn: "Klang (Bandar Diraja)",
    nameBm: "Klang",
    nameZh: "巴生",
    state: "Selangor",
    category: "city",
    lat: 3.0449,
    lng: 101.4456,
    popular: true,
  },
  {
    id: "selayang",
    nameEn: "Selayang / Batu Caves",
    nameBm: "Selayang / Batu Caves",
    nameZh: "士拉央 / 黑风洞",
    state: "Selangor",
    category: "district",
    lat: 3.2370,
    lng: 101.6700,
    popular: false,
  },
  {
    id: "puchong",
    nameEn: "Puchong",
    nameBm: "Puchong",
    nameZh: "蒲种",
    state: "Selangor",
    category: "district",
    lat: 3.0333,
    lng: 101.6167,
    popular: true,
  },
  {
    id: "bangi-kajang",
    nameEn: "Bangi / Kajang",
    nameBm: "Bandar Baru Bangi / Kajang",
    nameZh: "万宜 / 加影",
    state: "Selangor",
    category: "district",
    lat: 2.9927,
    lng: 101.7909,
    popular: false,
  },
  {
    id: "putrajaya-cyberjaya",
    nameEn: "Putrajaya & Cyberjaya",
    nameBm: "Putrajaya & Cyberjaya",
    nameZh: "布城 & 赛城",
    state: "Putrajaya",
    category: "city",
    lat: 2.9264,
    lng: 101.6964,
    popular: true,
  },

  // Northern Region
  {
    id: "george-town",
    nameEn: "Penang (George Town)",
    nameBm: "Pulau Pinang (George Town)",
    nameZh: "槟城（乔治市）",
    state: "Pulau Pinang",
    category: "city",
    lat: 5.4164,
    lng: 100.3327,
    popular: true,
  },
  {
    id: "bayan-lepas",
    nameEn: "Bayan Lepas (Penang Island)",
    nameBm: "Bayan Lepas",
    nameZh: "峇六拜（槟岛南部）",
    state: "Pulau Pinang",
    category: "district",
    lat: 5.2955,
    lng: 100.2657,
    popular: false,
  },
  {
    id: "seberang-perai",
    nameEn: "Butterworth / Seberang Perai",
    nameBm: "Butterworth / Seberang Perai",
    nameZh: "北海 / 威省",
    state: "Pulau Pinang",
    category: "city",
    lat: 5.3991,
    lng: 100.3638,
    popular: false,
  },
  {
    id: "ipoh",
    nameEn: "Ipoh",
    nameBm: "Ipoh",
    nameZh: "怡保",
    state: "Perak",
    category: "city",
    lat: 4.5975,
    lng: 101.0901,
    popular: true,
  },
  {
    id: "taiping",
    nameEn: "Taiping",
    nameBm: "Taiping",
    nameZh: "太平",
    state: "Perak",
    category: "district",
    lat: 4.8500,
    lng: 100.7333,
    popular: false,
  },
  {
    id: "alor-setar",
    nameEn: "Alor Setar",
    nameBm: "Alor Setar",
    nameZh: "亚罗士打",
    state: "Kedah",
    category: "city",
    lat: 6.1184,
    lng: 100.3685,
    popular: false,
  },
  {
    id: "sungai-petani",
    nameEn: "Sungai Petani",
    nameBm: "Sungai Petani",
    nameZh: "双溪大年",
    state: "Kedah",
    category: "city",
    lat: 5.6470,
    lng: 100.4877,
    popular: false,
  },
  {
    id: "kangar",
    nameEn: "Kangar",
    nameBm: "Kangar",
    nameZh: "加央",
    state: "Perlis",
    category: "city",
    lat: 6.4449,
    lng: 100.2048,
    popular: false,
  },

  // Southern Region
  {
    id: "jb",
    nameEn: "Johor Bahru",
    nameBm: "Johor Bahru",
    nameZh: "新山 (JB)",
    state: "Johor",
    category: "city",
    lat: 1.4927,
    lng: 103.7414,
    popular: true,
  },
  {
    id: "iskandar-puteri",
    nameEn: "Iskandar Puteri / Skudai",
    nameBm: "Iskandar Puteri / Skudai",
    nameZh: "依斯干达公主城 / 士古来",
    state: "Johor",
    category: "city",
    lat: 1.4239,
    lng: 103.6558,
    popular: false,
  },
  {
    id: "batu-pahat",
    nameEn: "Batu Pahat",
    nameBm: "Batu Pahat",
    nameZh: "峇株巴辖",
    state: "Johor",
    category: "city",
    lat: 1.8494,
    lng: 102.9288,
    popular: false,
  },
  {
    id: "muar",
    nameEn: "Muar (Bandar Maharani)",
    nameBm: "Muar",
    nameZh: "麻坡",
    state: "Johor",
    category: "city",
    lat: 2.0442,
    lng: 102.5689,
    popular: false,
  },
  {
    id: "melaka-city",
    nameEn: "Melaka (Historic City)",
    nameBm: "Bandaraya Melaka",
    nameZh: "马六甲市",
    state: "Melaka",
    category: "city",
    lat: 2.1896,
    lng: 102.2501,
    popular: true,
  },
  {
    id: "seremban",
    nameEn: "Seremban / Nilai",
    nameBm: "Seremban / Nilai",
    nameZh: "芙蓉 / 汝来",
    state: "Negeri Sembilan",
    category: "city",
    lat: 2.7258,
    lng: 101.9424,
    popular: true,
  },

  // East Coast
  {
    id: "kuantan",
    nameEn: "Kuantan",
    nameBm: "Kuantan",
    nameZh: "关丹",
    state: "Pahang",
    category: "city",
    lat: 3.8126,
    lng: 103.3256,
    popular: true,
  },
  {
    id: "kuala-terengganu",
    nameEn: "Kuala Terengganu",
    nameBm: "Kuala Terengganu",
    nameZh: "瓜拉登嘉楼",
    state: "Terengganu",
    category: "city",
    lat: 5.3117,
    lng: 103.1324,
    popular: false,
  },
  {
    id: "kota-bharu",
    nameEn: "Kota Bharu",
    nameBm: "Kota Bharu",
    nameZh: "哥打峇鲁",
    state: "Kelantan",
    category: "city",
    lat: 6.1254,
    lng: 102.2386,
    popular: false,
  },

  // East Malaysia (Borneo)
  {
    id: "kuching",
    nameEn: "Kuching",
    nameBm: "Kuching",
    nameZh: "古晋",
    state: "Sarawak",
    category: "city",
    lat: 1.5533,
    lng: 110.3592,
    popular: true,
  },
  {
    id: "miri",
    nameEn: "Miri",
    nameBm: "Miri",
    nameZh: "美里",
    state: "Sarawak",
    category: "city",
    lat: 4.3995,
    lng: 113.9914,
    popular: false,
  },
  {
    id: "sibu",
    nameEn: "Sibu",
    nameBm: "Sibu",
    nameZh: "诗巫",
    state: "Sarawak",
    category: "city",
    lat: 2.2874,
    lng: 111.8305,
    popular: false,
  },
  {
    id: "kota-kinabalu",
    nameEn: "Kota Kinabalu",
    nameBm: "Kota Kinabalu",
    nameZh: "亚庇 (KK)",
    state: "Sabah",
    category: "city",
    lat: 5.9804,
    lng: 116.0735,
    popular: true,
  },
  {
    id: "sandakan",
    nameEn: "Sandakan",
    nameBm: "Sandakan",
    nameZh: "山打根",
    state: "Sabah",
    category: "city",
    lat: 5.8394,
    lng: 118.1172,
    popular: false,
  },
  {
    id: "tawau",
    nameEn: "Tawau",
    nameBm: "Tawau",
    nameZh: "斗湖",
    state: "Sabah",
    category: "city",
    lat: 4.2447,
    lng: 117.8912,
    popular: false,
  },
];

export const POPULAR_MALAYSIAN_AREAS = MALAYSIAN_AREAS.filter((a) => a.popular);

/**
 * Searches Malaysian areas, districts, cities, and states by query string.
 */
export function searchMalaysianAreas(
  query: string,
): MalaysianAreaItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return POPULAR_MALAYSIAN_AREAS;
  }

  return MALAYSIAN_AREAS.filter((area) => {
    return (
      area.nameEn.toLowerCase().includes(clean) ||
      area.nameBm.toLowerCase().includes(clean) ||
      area.nameZh.toLowerCase().includes(clean) ||
      area.state.toLowerCase().includes(clean) ||
      area.id.toLowerCase().includes(clean)
    );
  });
}

/**
 * Creates UserCoordinates from a selected manual area.
 */
export function createManualLocation(area: MalaysianAreaItem): UserCoordinates {
  const result: UserCoordinates = {
    lat: area.lat,
    lng: area.lng,
    accuracy: 500,
    timestamp: Date.now(),
    regionName: `${area.nameEn}, ${area.state}`,
    stateCode: area.state,
    isManual: true,
    areaName: area.nameEn,
  };

  try {
    localStorage.setItem("ony_user_location", JSON.stringify(result));
  } catch {
    // ignore
  }

  return result;
}

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
