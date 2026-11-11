import type { Trip, Ticket, ItineraryItem, Expense } from '@yatra/shared';

const TRIPS_KEY = 'jalkhoj_local_trips';
const TICKETS_KEY = 'jalkhoj_local_tickets';
const ITINERARY_KEY = 'jalkhoj_local_itinerary';
const EXPENSES_KEY = 'jalkhoj_local_expenses';

export function getLocalTrips(): Trip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalTrip(trip: Trip): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTrips().filter((t) => t.id !== trip.id);
    localStorage.setItem(TRIPS_KEY, JSON.stringify([trip, ...existing]));
  } catch (e) {
    console.warn('Failed to save trip to localStorage', e);
  }
}

export function getLocalTripById(id: string): Trip | null {
  const trips = getLocalTrips();
  return trips.find((t) => t.id === id) || null;
}

// Tickets
export function getLocalTickets(tripId: string): Ticket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${TICKETS_KEY}_${tripId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalTicket(tripId: string, ticket: Ticket): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTickets(tripId).filter((t) => t.id !== ticket.id);
    localStorage.setItem(`${TICKETS_KEY}_${tripId}`, JSON.stringify([...existing, ticket]));
  } catch {}
}

// Itinerary
export function getLocalItinerary(tripId: string): ItineraryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${ITINERARY_KEY}_${tripId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalItinerary(tripId: string, item: ItineraryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalItinerary(tripId).filter((i) => i.id !== item.id);
    localStorage.setItem(`${ITINERARY_KEY}_${tripId}`, JSON.stringify([...existing, item]));
  } catch {}
}

// Expenses
export function getLocalExpenses(tripId: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${EXPENSES_KEY}_${tripId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalExpense(tripId: string, expense: any): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalExpenses(tripId).filter((e) => e.id !== expense.id);
    localStorage.setItem(`${EXPENSES_KEY}_${tripId}`, JSON.stringify([expense, ...existing]));
  } catch {}
}
