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
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { HARDCODED_PIN, DEFAULT_USER, setPinAuthenticated } from '../../src/lib/auth';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { PALETTE } from '@yatra/shared';

export default function LoginScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pin' | 'email'>('pin');

  // PIN state
  const [pin, setPin] = useState('');

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. PIN Access
  const grantPinAccess = async () => {
    setLoading(true);
    try {
      await setPinAuthenticated();
      router.replace('/(app)/trips');
    } catch {
      Alert.alert('Access Error', 'Failed to store login credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = () => {
    setError(null);
    const cleanPin = pin.trim().replace(/\s+/g, '');
    if (cleanPin === HARDCODED_PIN) {
      grantPinAccess();
    } else {
      setError('Incorrect security PIN. Please try again.');
    }
  };

  // 2. Google OAuth
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'jalkhoj://auth/callback',
        },
      });

      if (oauthErr) throw oauthErr;

      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('Unsupported provider') ||
        msg.includes('provider is not enabled') ||
        msg.includes('validation_failed')
      ) {
        Alert.alert(
          'Google Provider Notice',
          'Google OAuth is not enabled in your Supabase project yet. You can sign in using your Security PIN or Email & Password.'
        );
      } else {
        Alert.alert('Google Sign-In Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password Auth
  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpErr) throw signUpErr;

        if (data.session) {
          await setPinAuthenticated();
          router.replace('/(app)/trips');
        } else {
          Alert.alert(
            'Account Created!',
            'Please check your email to verify your registration, or sign in.'
          );
          setIsSignUp(false);
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInErr) throw signInErr;

        await setPinAuthenticated();
        router.replace('/(app)/trips');
      }
    } catch (err: unknown) {
      Alert.alert('Sign In Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>SECURE ACCESS</Text>
          <Text style={styles.title}>JAL KHOJ</Text>
          <Text style={styles.subtitle}>
            Journeys, Train PNRs, Itineraries & Group Expenses
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Segmented control */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'pin' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('pin');
                setError(null);
              }}
            >
              <Text style={[styles.tabText, activeTab === 'pin' && styles.tabTextActive]}>
                SECURITY PIN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'email' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('email');
                setError(null);
              }}
            >
              <Text style={[styles.tabText, activeTab === 'email' && styles.tabTextActive]}>
                EMAIL & GOOGLE
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* TAB 1: PIN ACCESS (Masked, Secret) */}
          {activeTab === 'pin' && (
            <View>
              <Text style={styles.cardTitle}>Enter Security PIN</Text>
              <Text style={styles.cardSubtitle}>
                Private PIN access. Enter your authorization PIN to unlock the application.
              </Text>

              <View style={styles.pinContainer}>
                <Text style={styles.pinLabel}>SECURITY PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="••••••••••"
                  placeholderTextColor="#A0AEC0"
                  value={pin}
                  onChangeText={(val) => {
                    setError(null);
                    setPin(val.replace(/\D/g, ''));
                  }}
                  keyboardType="number-pad"
                  maxLength={10}
                  secureTextEntry={true}
                  autoFocus
                />
              </View>

              <Button
                title="Unlock Jal Khoj"
                onPress={handlePinSubmit}
                isLoading={loading}
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {/* TAB 2: EMAIL & GOOGLE */}
          {activeTab === 'email' && (
            <View>
              {/* Google Button */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR WITH EMAIL</Text>
                <View style={styles.dividerLine} />
              </View>

              <Input
                label="Email Address"
                placeholder="traveler@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Button
                title={isSignUp ? 'Create Account' : 'Sign In'}
                onPress={handleEmailAuth}
                isLoading={loading}
                style={{ marginTop: 4 }}
              />

              <TouchableOpacity
                style={styles.switchSignUp}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.switchSignUpText}>
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
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
    marginBottom: 20,
  },
  badge: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    color: PALETTE.brass,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: PALETTE.navy,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    color: PALETTE.slate,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: PALETTE.slate,
  },
  tabTextActive: {
    color: PALETTE.navy,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: PALETTE.navy,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    color: PALETTE.slate,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: PALETTE.ash,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  googleIcon: {
    fontSize: 15,
    fontWeight: '900',
    color: '#4285F4',
    marginRight: 8,
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.navy,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PALETTE.ash,
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: PALETTE.slate,
    letterSpacing: 1,
  },
  errorBanner: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: PALETTE.rust,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  pinContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: PALETTE.slate,
    letterSpacing: 1,
    marginBottom: 6,
  },
  pinInput: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PALETTE.ash,
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    color: PALETTE.navy,
  },
  switchSignUp: {
    marginTop: 10,
    alignItems: 'center',
  },
  switchSignUpText: {
    fontSize: 11,
    color: PALETTE.saffron,
    fontWeight: '700',
  },
});
