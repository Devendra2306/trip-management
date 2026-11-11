// ─── Core database / domain types for Yatra ───

/** User profile synced from Supabase auth */
export interface Profile {
  id: string; // auth.users.id
  email: string;
  display_name: string;
  avatar_url: string | null;
  upi_vpa?: string | null;
  created_at: string;
  updated_at: string;
}

/** Trip roles */
export type TripRole = 'organizer' | 'member';

/** A trip (group journey) */
export interface Trip {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  start_date: string | null; // ISO date
  end_date: string | null;
  invite_code: string; // 6-char alphanumeric
  created_by: string; // profile.id
  created_at: string;
  updated_at: string;
}

/** Link between a user and a trip */
export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: TripRole;
  joined_at: string;
  profile?: Profile; // joined
}

// ─── Trains ───

export type PnrStatus =
  | 'CNF'
  | 'RAC'
  | 'WL'
  | 'RLWL'
  | 'GNWL'
  | 'PQWL'
  | 'CAN'
  | 'CHART_PREPARED'
  | 'UNKNOWN';

export interface PassengerStatus {
  number: number; // Passenger 1, 2, …
  booking_status: string; // e.g. "WL/5"
  current_status: string; // e.g. "CNF/B3/42"
  coach: string | null;
  berth: string | null;
  berth_type: string | null; // UB, LB, MB, SU, SL
}

export interface PnrInfo {
  pnr: string;
  train_number: string;
  train_name: string;
  from_station: string;
  from_station_name: string;
  to_station: string;
  to_station_name: string;
  boarding_date: string; // ISO date
  journey_class: string; // 3A, 2A, SL, etc.
  chart_prepared: boolean;
  passengers: PassengerStatus[];
  last_checked_at: string;
}

/** A ticket record linked to a trip */
export interface Ticket {
  id: string;
  trip_id: string;
  pnr: string;
  train_number: string;
  train_name: string;
  from_station: string;
  from_station_name: string;
  to_station: string;
  to_station_name: string;
  boarding_date: string;
  journey_class: string;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface PnrStatusHistory {
  id: string;
  ticket_id: string;
  pnr: string;
  status_data: PnrInfo;
  checked_at: string;
}

// ─── Itinerary ───

export type ItineraryItemType = 'travel' | 'stay' | 'activity' | 'meal' | 'note';

export interface ItineraryItem {
  id: string;
  trip_id: string;
  day_number: number; // 1-indexed
  order_index: number; // for sorting within a day
  type: ItineraryItemType;
  title: string;
  description: string | null;
  start_time: string | null; // HH:mm
  end_time: string | null;
  location: string | null;
  metadata: Record<string, unknown> | null; // flexible extra data
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Money ───

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'stay'
  | 'tickets'
  | 'shopping'
  | 'activities'
  | 'other';

export interface Expense {
  id: string;
  trip_id: string;
  title: string;
  amount: number; // in smallest currency unit (paise)
  currency: string; // INR
  category: ExpenseCategory;
  paid_by: string; // profile.id
  split_type: SplitType;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  shares?: ExpenseShare[];
}

export interface ExpenseShare {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number; // share in paise
  profile?: Profile; // joined
}

export interface Settlement {
  id: string;
  trip_id: string;
  from_user: string;
  to_user: string;
  amount: number; // paise
  settled_at: string;
  note: string | null;
  created_at: string;
}

/** A net balance between two people */
export interface Debt {
  from: string;
  to: string;
  amount: number; // positive, in paise
}

/** Simplified set of transfers to settle all debts */
export interface SimplifiedDebt {
  from: string;
  to: string;
  amount: number;
}

// ─── Device tokens (push notifications) ───

export interface DeviceToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  device_name: string | null;
  platform: 'android' | 'ios' | 'web';
  created_at: string;
  updated_at: string;
}

// ─── Offline sync ───

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface QueuedMutation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  status: SyncStatus;
  created_at: string;
  retry_count: number;
  error?: string;
}
