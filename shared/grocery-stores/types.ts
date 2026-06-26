export type GroceryStoreSource =
  | "google_places"
  | "manual"
  | "retailer_locator"
  | "regional_discovery";

export interface GroceryStoreRecord {
  id: string;
  banner: string;
  name: string;
  address: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  supports_deals: boolean;
  provider: string;
}

export interface NearbyStore {
  store_id: string;
  name: string;
  banner: string;
  address: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  distance_km: number;
  source: GroceryStoreSource;
  supports_deals: boolean;
}

export interface HallPreferredStore {
  hall_id: string;
  store_id: string;
  store_name: string;
  banner: string;
  address: string | null;
  distance_km: number | null;
  priority: number;
  active: boolean;
}

export interface HallGroceryPreferences {
  hall_id: string;
  postal_code: string | null;
  country: string;
  max_distance_km: number;
  default_store_id: string | null;
  preferred_stores: HallPreferredStore[];
  updated_at: string;
  setup_complete: boolean;
}

export interface NearbyStoresResponse {
  postal_code: string;
  country: string;
  radius_km: number;
  stores: NearbyStore[];
  sources_used: string[];
}
