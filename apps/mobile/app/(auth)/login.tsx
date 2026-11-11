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
import { PALETTE } from '@yatra/shared';

export default function LoginScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantAccess = async () => {
    setLoading(true);
    try {
      await setPinAuthenticated();

      // Ensure profile exists in background if Supabase reachable
      try {
        await supabase.from('profiles').upsert({
          id: DEFAULT_USER.id,
          email: DEFAULT_USER.email,
          display_name: DEFAULT_USER.display_name,
        });
      } catch (e) {
        // Safe to ignore in offline mode
      }

      router.replace('/(app)/trips');
    } catch (err: unknown) {
      Alert.alert('Access Error', 'Failed to store login credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = () => {
    setError(null);
    const cleanPin = pin.trim().replace(/\s+/g, '');
    if (cleanPin === HARDCODED_PIN) {
      grantAccess();
    } else {
      setError(`Incorrect PIN. Please enter ${HARDCODED_PIN}.`);
    }
  };

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
          'Google OAuth is not enabled in your Supabase project yet. You can use the PIN (7977303911) or One-Click Access button below to log in directly!'
        );
      } else {
        Alert.alert('Google Sign-In Failed', msg);
      }
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
            Sign in with Google or enter PIN to access your train journeys & shared expenses.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>
            Choose Google Sign-In or Direct PIN Access
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Option 1: Continue with Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR USE PIN</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Option 2: PIN input */}
          <View style={styles.pinContainer}>
            <Text style={styles.pinLabel}>ACCESS PIN (7977303911)</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="7977303911"
              placeholderTextColor="#A0AEC0"
              value={pin}
              onChangeText={(val) => {
                setError(null);
                setPin(val.replace(/\D/g, ''));
              }}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          <Button
            title="Unlock Jal Khoj"
            onPress={handlePinSubmit}
            isLoading={loading}
            style={{ marginTop: 4 }}
          />

          {/* Instant 1-Click Access Button */}
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.quickAccessButton}
            onPress={grantAccess}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.quickAccessBadge}>⚡ ONE-CLICK ACCESS</Text>
            <Text style={styles.quickAccessText}>
              Direct Login (PIN: {HARDCODED_PIN})
            </Text>
          </TouchableOpacity>
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
    marginBottom: 24,
  },
  badge: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    color: PALETTE.brass,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 34,
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
  cardTitle: {
    fontSize: 18,
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
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4285F4',
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.navy,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PALETTE.ash,
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 10,
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
    marginBottom: 14,
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
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 4,
    color: PALETTE.navy,
  },
  divider: {
    height: 1,
    backgroundColor: PALETTE.ash,
    marginVertical: 14,
  },
  quickAccessButton: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  quickAccessBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
    marginBottom: 2,
  },
  quickAccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
});
