import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { generateInviteCode, createTripSchema } from '@yatra/shared';
import { DEFAULT_USER } from '../../../src/lib/auth';

export default function NewTripScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name for your journey.');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id || DEFAULT_USER.id;

      // Ensure profile exists for PIN user
      await supabase.from('profiles').upsert({
        id: userId,
        email: user?.email || DEFAULT_USER.email,
        display_name: user?.user_metadata?.display_name || DEFAULT_USER.display_name,
      });

      const inviteCode = generateInviteCode();

      // 1. Insert trip
      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
          invite_code: inviteCode,
          created_by: userId,
        })
        .select()
        .single();

      if (tripErr) throw tripErr;

      // 2. Insert creator as organizer
      await supabase.from('trip_members').upsert({
        trip_id: trip.id,
        user_id: userId,
        role: 'organizer',
      });

      router.replace(`/(app)/trips/${trip.id}/overview`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input
        label="Trip Name"
        placeholder="e.g. Varanasi Ghats Express"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="Description (Optional)"
        placeholder="What is this journey about?"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Input
        label="Start Date (YYYY-MM-DD)"
        placeholder="e.g. 2026-12-25"
        value={startDate}
        onChangeText={setStartDate}
      />

      <Input
        label="End Date (YYYY-MM-DD)"
        placeholder="e.g. 2026-12-30"
        value={endDate}
        onChangeText={setEndDate}
      />

      <Button
        title="Create Journey & Get Invite Code"
        onPress={handleCreate}
        isLoading={loading}
        style={{ marginTop: 16 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
});
