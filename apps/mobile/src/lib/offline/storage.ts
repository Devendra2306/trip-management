import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trip, Ticket, ItineraryItem, SimplifiedDebt, PnrStatusHistory } from '@yatra/shared';

const PREFIX = '@yatra_cache:';

export const offlineStorage = {
  // Trips
  async cacheTrips(trips: Trip[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${PREFIX}trips`, JSON.stringify(trips));
    } catch (e) {
      console.warn('Failed to cache trips', e);
    }
  },

  async getCachedTrips(): Promise<Trip[]> {
    try {
      const data = await AsyncStorage.getItem(`${PREFIX}trips`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Tickets & PNR status
  async cacheTickets(
    tripId: string,
    tickets: Ticket[],
    historyMap: Record<string, PnrStatusHistory>
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${PREFIX}tickets:${tripId}`,
        JSON.stringify({ tickets, historyMap, cachedAt: new Date().toISOString() })
      );
    } catch (e) {
      console.warn('Failed to cache tickets', e);
    }
  },

  async getCachedTickets(
    tripId: string
  ): Promise<{ tickets: Ticket[]; historyMap: Record<string, PnrStatusHistory> } | null> {
    try {
      const data = await AsyncStorage.getItem(`${PREFIX}tickets:${tripId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // Itinerary
  async cacheItinerary(tripId: string, items: ItineraryItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${PREFIX}itinerary:${tripId}`, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to cache itinerary', e);
    }
  },

  async getCachedItinerary(tripId: string): Promise<ItineraryItem[]> {
    try {
      const data = await AsyncStorage.getItem(`${PREFIX}itinerary:${tripId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Expenses & Balances
  async cacheFinances(
    tripId: string,
    expenses: any[],
    balances: any[],
    simplifiedDebts: SimplifiedDebt[]
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${PREFIX}finances:${tripId}`,
        JSON.stringify({ expenses, balances, simplifiedDebts })
      );
    } catch (e) {
      console.warn('Failed to cache finances', e);
    }
  },

  async getCachedFinances(
    tripId: string
  ): Promise<{ expenses: any[]; balances: any[]; simplifiedDebts: SimplifiedDebt[] } | null> {
    try {
      const data = await AsyncStorage.getItem(`${PREFIX}finances:${tripId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
};
