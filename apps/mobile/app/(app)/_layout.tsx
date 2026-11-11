import { Stack } from 'expo-router';
import { PALETTE } from '@yatra/shared';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: PALETTE.navy },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen name="trips/index" options={{ title: 'My Journeys' }} />
      <Stack.Screen name="trips/new" options={{ title: 'New Trip' }} />
      <Stack.Screen name="trips/[tripId]" options={{ headerShown: false }} />
    </Stack>
  );
}
