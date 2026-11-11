import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { PALETTE } from '@yatra/shared';

export default function TripTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: PALETTE.navy },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: PALETTE.ash,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: PALETTE.saffron,
        tabBarInactiveTintColor: PALETTE.slate,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🧭</Text>,
        }}
      />
      <Tabs.Screen
        name="trains"
        options={{
          title: 'Trains',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🚂</Text>,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>₹</Text>,
        }}
      />
    </Tabs>
  );
}
