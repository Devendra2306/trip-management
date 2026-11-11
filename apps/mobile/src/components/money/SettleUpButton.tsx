import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, Alert } from 'react-native';
import { generateUpiIntentUrl, PALETTE, type SimplifiedDebt } from '@yatra/shared';
import { supabase } from '../../lib/supabase';

interface SettleUpButtonProps {
  debt: SimplifiedDebt;
  payeeName: string;
  payeeVpa: string;
  tripId: string;
  onSettled?: () => void;
}

export function SettleUpButton({
  debt,
  payeeName,
  payeeVpa,
  tripId,
  onSettled,
}: SettleUpButtonProps) {
  const [loading, setLoading] = useState(false);

  const amountRupees = debt.amount / 100;

  const handlePay = async () => {
    const upiUrl = generateUpiIntentUrl({
      payeeVpa: payeeVpa || 'traveler@upi',
      payeeName,
      amount: amountRupees,
      note: `Jal Khoj trip settlement to ${payeeName}`,
    });

    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      } else {
        // Fallback or alert
        Alert.alert(
          'UPI Payment',
          `Pay ₹${amountRupees.toFixed(2)} to ${payeeVpa}\n\nCould not open UPI app automatically. Please transfer directly to this VPA.`,
          [
            {
              text: 'Mark as Paid',
              onPress: recordSettlement,
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      // Prompt to record payment after launching UPI app
      Alert.alert(
        'Confirm Settlement',
        `Did you complete the payment of ₹${amountRupees.toFixed(2)} to ${payeeName}?`,
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Record Payment', onPress: recordSettlement },
        ]
      );
    } catch (err) {
      console.warn('Error opening UPI link', err);
    }
  };

  const recordSettlement = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('settlements').insert({
        trip_id: tripId,
        from_user: debt.from,
        to_user: debt.to,
        amount: debt.amount,
        note: 'UPI Payment',
      });

      if (!error && onSettled) {
        onSettled();
      }
    } catch (err) {
      console.warn('Settlement record error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.payBtn}
      onPress={handlePay}
      disabled={loading}
    >
      <Text style={styles.payText}>Pay ₹{(debt.amount / 100).toFixed(0)} via UPI</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  payBtn: {
    backgroundColor: PALETTE.forest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  payText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
