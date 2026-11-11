import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { PALETTE } from '@yatra/shared';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: 'yatra://auth/callback',
        },
      });

      if (error) throw error;
      setLinkSent(true);
    } catch (err: unknown) {
      Alert.alert('Sign In Failed', err instanceof Error ? err.message : 'Error sending link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Railway Ticket Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>INDIAN RAILWAYS APP PASS</Text>
          <Text style={styles.title}>YATRA</Text>
          <Text style={styles.subtitle}>Sign in to access your journeys and live PNRs</Text>
        </View>

        <View style={styles.card}>
          {linkSent ? (
            <View style={styles.successBlock}>
              <Text style={styles.successTitle}>Check Your Inbox</Text>
              <Text style={styles.successDesc}>
                We sent a secure magic link to {email}. Tap it to open Yatra.
              </Text>
              <Button
                title="Use another email"
                variant="outline"
                size="sm"
                onPress={() => setLinkSent(false)}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <View>
              <Input
                label="Email Address"
                placeholder="traveler@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Button
                title="Send Magic Link"
                onPress={handleMagicLink}
                isLoading={loading}
                style={{ marginTop: 8 }}
              />

              <Text style={styles.footerNote}>
                No password required. A one-click login link will be delivered to your inbox.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF8',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badge: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.brass,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: PALETTE.navy,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 13,
    color: PALETTE.slate,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 260,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  successBlock: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: PALETTE.navy,
  },
  successDesc: {
    fontSize: 13,
    color: PALETTE.slate,
    textAlign: 'center',
    marginTop: 8,
  },
  footerNote: {
    fontSize: 11,
    color: PALETTE.slate,
    textAlign: 'center',
    marginTop: 16,
  },
});
