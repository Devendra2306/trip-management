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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>DIRECT PIN ACCESS</Text>
          <Text style={styles.title}>JAL KHOJ</Text>
          <Text style={styles.subtitle}>
            Enter the security PIN to unlock journeys, trains, itineraries & money splits.
          </Text>
        </View>

        {/* PIN Entry Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enter Security PIN</Text>
          <Text style={styles.cardSubtitle}>
            Hardcoded PIN mode enabled. Instant access without email or passwords.
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.pinContainer}>
            <Text style={styles.pinLabel}>ACCESS PIN</Text>
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
              autoFocus
            />
          </View>

          <Button
            title="Unlock Jal Khoj"
            onPress={handlePinSubmit}
            isLoading={loading}
            style={{ marginTop: 8 }}
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
    marginBottom: 28,
  },
  badge: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    maxWidth: 280,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: PALETTE.rust,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  pinContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: PALETTE.slate,
    letterSpacing: 1,
    marginBottom: 8,
  },
  pinInput: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.ash,
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 4,
    color: PALETTE.navy,
  },
  divider: {
    height: 1,
    backgroundColor: PALETTE.ash,
    marginVertical: 18,
  },
  quickAccessButton: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  quickAccessBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
    marginBottom: 2,
  },
  quickAccessText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
});
