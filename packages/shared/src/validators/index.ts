import { z } from 'zod';

// ─── Trips ───

export const createTripSchema = z.object({
  name: z.string().min(1, 'Trip name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').nullable().optional(),
});

export const updateTripSchema = createTripSchema.partial();

export const inviteCodeSchema = z
  .string()
  .length(6, 'Invite code must be 6 characters')
  .regex(/^[A-Z0-9]{6}$/, 'Invite code must be uppercase alphanumeric');

// ─── Tickets ───

export const pnrSchema = z
  .string()
  .length(10, 'PNR must be 10 digits')
  .regex(/^\d{10}$/, 'PNR must contain only digits');

export const addTicketSchema = z.object({
  pnr: pnrSchema,
  train_number: z.string().min(1).max(10),
  train_name: z.string().min(1).max(100),
  from_station: z.string().min(1).max(10),
  from_station_name: z.string().min(1).max(100),
  to_station: z.string().min(1).max(10),
  to_station_name: z.string().min(1).max(100),
  boarding_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  journey_class: z.string().min(1).max(5),
});

// ─── Itinerary ───

export const itineraryItemTypeSchema = z.enum([
  'travel',
  'stay',
  'activity',
  'meal',
  'note',
]);

export const createItineraryItemSchema = z.object({
  day_number: z.number().int().min(1),
  order_index: z.number().int().min(0),
  type: itineraryItemTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm')
    .nullable()
    .optional(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  location: z.string().max(200).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const updateItineraryItemSchema = createItineraryItemSchema.partial();

// ─── Expenses ───

export const splitTypeSchema = z.enum(['equal', 'exact', 'percentage', 'shares']);

export const expenseCategorySchema = z.enum([
  'food',
  'transport',
  'stay',
  'tickets',
  'shopping',
  'activities',
  'other',
]);

export const createExpenseSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().int().positive('Amount must be positive'), // paise
  currency: z.string().default('INR'),
  category: expenseCategorySchema,
  split_type: splitTypeSchema,
  shares: z
    .array(
      z.object({
        user_id: z.string().uuid(),
        amount: z.number().int().min(0),
      })
    )
    .min(1, 'At least one share is required'),
});

// ─── Settlements ───

export const createSettlementSchema = z.object({
  from_user: z.string().uuid(),
  to_user: z.string().uuid(),
  amount: z.number().int().positive(),
  note: z.string().max(200).nullable().optional(),
});

// ─── Device tokens ───

export const registerDeviceTokenSchema = z.object({
  expo_push_token: z.string().min(1),
  device_name: z.string().max(100).nullable().optional(),
  platform: z.enum(['android', 'ios', 'web']),
});

// ─── Inferred types ───

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type AddTicketInput = z.infer<typeof addTicketSchema>;
export type CreateItineraryItemInput = z.infer<typeof createItineraryItemSchema>;
export type UpdateItineraryItemInput = z.infer<typeof updateItineraryItemSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenSchema>;
