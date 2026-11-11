// ─── Constants: colours, categories, labels ───

// PNR status → colour mapping for UI
export const PNR_STATUS_COLOURS = {
  CNF: { bg: '#16a34a', fg: '#ffffff', label: 'Confirmed' }, // green-600
  RAC: { bg: '#d97706', fg: '#ffffff', label: 'RAC' }, // amber-600
  WL: { bg: '#dc2626', fg: '#ffffff', label: 'Waitlisted' }, // red-600
  RLWL: { bg: '#dc2626', fg: '#ffffff', label: 'Remote WL' },
  GNWL: { bg: '#dc2626', fg: '#ffffff', label: 'General WL' },
  PQWL: { bg: '#dc2626', fg: '#ffffff', label: 'Pooled Quota WL' },
  CAN: { bg: '#6b7280', fg: '#ffffff', label: 'Cancelled' }, // gray-500
  CHART_PREPARED: { bg: '#2563eb', fg: '#ffffff', label: 'Chart Prepared' }, // blue-600
  UNKNOWN: { bg: '#9ca3af', fg: '#ffffff', label: 'Unknown' }, // gray-400
} as const;

// Yatra design palette (railway-inspired)
export const PALETTE = {
  // Primary
  saffron: '#FF6B35', // Indian Railways orange
  navy: '#1B1F3B', // dark coach blue
  cream: '#FFF8F0', // ticket paper
  // Accents
  brass: '#C9A94E', // embossed ticket trim
  slate: '#4A5568', // body text
  chalk: '#F7FAFC', // backgrounds
  rust: '#9B2C2C', // alerts / errors
  forest: '#276749', // confirmations
  // Neutrals
  coal: '#1A202C',
  ash: '#E2E8F0',
  mist: '#EDF2F7',
} as const;

// Typography scale names (both apps map these to their own primitives)
export const TYPE_SCALE = {
  displayLg: { size: 32, weight: '700' as const, tracking: -0.5 },
  displaySm: { size: 24, weight: '700' as const, tracking: -0.3 },
  headlineLg: { size: 20, weight: '600' as const, tracking: 0 },
  headlineSm: { size: 16, weight: '600' as const, tracking: 0 },
  body: { size: 14, weight: '400' as const, tracking: 0.1 },
  caption: { size: 12, weight: '400' as const, tracking: 0.2 },
  mono: { size: 13, weight: '500' as const, tracking: 0.5 },
} as const;

// Expense categories with icons (icon name for both Lucide and MaterialIcons)
export const EXPENSE_CATEGORIES = {
  food: { label: 'Food & Drinks', icon: 'utensils', color: '#F59E0B' },
  transport: { label: 'Transport', icon: 'car', color: '#3B82F6' },
  stay: { label: 'Stay', icon: 'bed-double', color: '#8B5CF6' },
  tickets: { label: 'Tickets', icon: 'ticket', color: '#EF4444' },
  shopping: { label: 'Shopping', icon: 'shopping-bag', color: '#EC4899' },
  activities: { label: 'Activities', icon: 'compass', color: '#10B981' },
  other: { label: 'Other', icon: 'ellipsis', color: '#6B7280' },
} as const;

export const BERTH_LABELS: Record<string, string> = {
  UB: 'Upper Berth',
  MB: 'Middle Berth',
  LB: 'Lower Berth',
  SU: 'Side Upper',
  SL: 'Side Lower',
  WS: 'Window Seat',
  MS: 'Middle Seat',
  AS: 'Aisle Seat',
};
