import AsyncStorage from '@react-native-async-storage/async-storage';

export const HARDCODED_PIN = '7977303911';

export const DEFAULT_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@jalkhoj.app',
  display_name: 'Lead Traveler',
};

export async function isPinAuthenticated(): Promise<boolean> {
  try {
    const savedPin = await AsyncStorage.getItem('jalkhoj_pin');
    return savedPin === HARDCODED_PIN;
  } catch {
    return false;
  }
}

export async function setPinAuthenticated(): Promise<void> {
  await AsyncStorage.setItem('jalkhoj_pin', HARDCODED_PIN);
}

export async function clearPinAuthenticated(): Promise<void> {
  await AsyncStorage.removeItem('jalkhoj_pin');
}
