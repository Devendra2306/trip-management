import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusColour, type PnrStatus } from '@yatra/shared';

interface PnrStatusBadgeProps {
  status: string;
}

export function PnrStatusBadge({ status }: PnrStatusBadgeProps) {
  const upper = (status || '').toUpperCase();
  let code: PnrStatus = 'UNKNOWN';
  if (upper.includes('CNF') || upper.includes('CONFIRM')) code = 'CNF';
  else if (upper.includes('RAC')) code = 'RAC';
  else if (upper.includes('RLWL')) code = 'RLWL';
  else if (upper.includes('GNWL')) code = 'GNWL';
  else if (upper.includes('PQWL')) code = 'PQWL';
  else if (upper.includes('WL')) code = 'WL';
  else if (upper.includes('CAN')) code = 'CAN';
  else if (upper.includes('CHART')) code = 'CHART_PREPARED';

  const config = getStatusColour(code);

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.fg }]}>{status || config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
});
