import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { registerForPushNotificationsAsync } from '../src/lib/notifications';
import { networkStatus } from '../src/lib/offline/networkStatus';
import { PALETTE } from '@yatra/shared';

export default function RootLayout() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // 1. Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        registerForPushNotificationsAsync(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        registerForPushNotificationsAsync(session.user.id);
      }
    });

    // 2. Handle deep linking
    const handleDeepLink = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      // Handles yatra://join/CODE or https://*.yatra.app/join/CODE
      if (parsed.path?.includes('join/')) {
        const parts = parsed.path.split('join/');
        const code = parts[1]?.replace('/', '');
        if (code) {
          router.push(`/join/${code}`);
        }
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // 3. Network status listener
    const unsubNet = networkStatus.subscribe((isOnline) => {
      if (isOnline) {
        console.log('App is online. Ready to sync.');
      } else {
        console.log('App is offline. Using local cache.');
      }
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
      unsubNet();
    };
  }, [router]);

  return (
    <>
      <StatusBar style="light" backgroundColor={PALETTE.navy} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: PALETTE.navy },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '800', fontFamily: 'System' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen
          name="join/[code]"
          options={{ title: 'Join Trip', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
