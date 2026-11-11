import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { PALETTE } from '@yatra/shared';

export default function LoginScreen() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const formatAuthError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Unsupported provider') || msg.includes('provider is not enabled')) {
      return 'That provider is not enabled in your Supabase project. In your Supabase Dashboard, go to Authentication > Providers to enable it, or use Email & Password.';
    }
    return msg;
  };

  const handlePasswordAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.session) {
          router.replace('/(app)/trips');
        } else {
          Alert.alert(
            'Account Created!',
            'Please check your email to verify your account, or sign in if email confirmations are disabled.'
          );
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        router.replace('/(app)/trips');
      }
    } catch (err: unknown) {
      Alert.alert('Sign In Failed', formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

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
          emailRedirectTo: 'jalkhoj://auth/callback',
        },
      });

      if (error) throw error;
      setLinkSent(true);
    } catch (err: unknown) {
      Alert.alert('Sign In Failed', formatAuthError(err));
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
          <Text style={styles.title}>JAL KHOJ</Text>
          <Text style={styles.subtitle}>Sign in to access your journeys and live PNRs</Text>
        </View>

        <View style={styles.card}>
          {linkSent ? (
            <View style={styles.successBlock}>
              <Text style={styles.successTitle}>Check Your Inbox</Text>
              <Text style={styles.successDesc}>
                We sent a secure magic link to {email}. Tap it to open Jal Khoj.
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
              {/* Auth Mode Toggle */}
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, authMode === 'password' && styles.activeModeBtn]}
                  onPress={() => setAuthMode('password')}
                >
                  <Text style={[styles.modeText, authMode === 'password' && styles.activeModeText]}>
                    Password
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeBtn, authMode === 'magic_link' && styles.activeModeBtn]}
                  onPress={() => setAuthMode('magic_link')}
                >
                  <Text style={[styles.modeText, authMode === 'magic_link' && styles.activeModeText]}>
                    Magic Link
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                label="Email Address"
                placeholder="traveler@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {authMode === 'password' && (
                <Input
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              )}

              <Button
                title={
                  authMode === 'password'
                    ? isSignUp
                      ? 'Create Account'
                      : 'Sign In'
                    : 'Send Magic Link'
                }
                onPress={authMode === 'password' ? handlePasswordAuth : handleMagicLink}
                isLoading={loading}
                style={{ marginTop: 8 }}
              />

              {authMode === 'password' && (
                <TouchableOpacity
                  style={styles.switchSignUp}
                  onPress={() => setIsSignUp(!isSignUp)}
                >
                  <Text style={styles.switchSignUpText}>
                    {isSignUp
                      ? 'Already have an account? Sign In'
                      : "Don't have an account? Create one"}
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.footerNote}>
                {authMode === 'password'
                  ? 'Sign in or create an account with email & password.'
                  : 'A one-click secure login link will be sent to your email.'}
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
    marginBottom: 28,
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: PALETTE.mist,
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeModeBtn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.slate,
  },
  activeModeText: {
    color: PALETTE.navy,
  },
  switchSignUp: {
    alignItems: 'center',
    marginTop: 14,
  },
  switchSignUpText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.saffron,
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
    marginTop: 14,
  },
});
