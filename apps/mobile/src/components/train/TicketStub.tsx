import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PALETTE } from '@yatra/shared';
import { PnrStatusBadge } from './PnrStatusBadge';
import type { Ticket, PnrStatusHistory } from '@yatra/shared';

interface TicketStubProps {
  ticket: Ticket;
  latestStatus?: PnrStatusHistory | null;
}

export function TicketStub({ ticket, latestStatus }: TicketStubProps) {
  const statusData = latestStatus?.status_data;
  const passengers = statusData?.passengers || [];

  return (
    <View style={styles.card}>
      {/* Top Saffron Stripe */}
      <View style={styles.stripe} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.trainNumber}>TRAIN #{ticket.train_number}</Text>
            <Text style={styles.trainName}>{ticket.train_name}</Text>
          </View>
          <View style={styles.classTag}>
            <Text style={styles.classText}>CLASS {ticket.journey_class}</Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.routeRow}>
          <View style={styles.stationBlock}>
            <Text style={styles.stationLabel}>ORIGIN</Text>
            <Text style={styles.stationCode}>{ticket.from_station}</Text>
            <Text style={styles.stationName} numberOfLines={1}>
              {ticket.from_station_name}
            </Text>
          </View>

          <View style={styles.arrowBlock}>
            <Text style={styles.arrow}>➔</Text>
            <Text style={styles.dateText}>{ticket.boarding_date}</Text>
          </View>

          <View style={[styles.stationBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.stationLabel}>DESTINATION</Text>
            <Text style={styles.stationCode}>{ticket.to_station}</Text>
            <Text style={styles.stationName} numberOfLines={1}>
              {ticket.to_station_name}
            </Text>
          </View>
        </View>

        {/* Perforated separator */}
        <View style={styles.perforation}>
          <View style={styles.leftNotch} />
          <View style={styles.dashedLine} />
          <View style={styles.rightNotch} />
        </View>

        {/* Bottom PNR & Status */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.pnrLabel}>IRCTC PNR</Text>
            <Text style={styles.pnrNumber}>{ticket.pnr}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statusLabel}>STATUS</Text>
            {passengers[0]?.current_status ? (
              <PnrStatusBadge status={passengers[0].current_status} />
            ) : (
              <PnrStatusBadge status="CNF" />
            )}
          </View>
        </View>

        {/* Passenger Seats Breakdown */}
        {passengers.length > 0 && (
          <View style={styles.passengerContainer}>
            {passengers.map((p) => (
              <View key={p.number} style={styles.passengerRow}>
                <Text style={styles.passengerNumber}>Pass {p.number}</Text>
                <Text style={styles.coachBerth}>
                  {p.coach ? `${p.coach}, ${p.berth} (${p.berth_type || 'B'})` : 'Seat TBD'}
                </Text>
                <PnrStatusBadge status={p.current_status} />
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFDF8',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stripe: {
    height: 4,
    backgroundColor: PALETTE.saffron,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trainNumber: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.saffron,
  },
  trainName: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.navy,
  },
  classTag: {
    backgroundColor: PALETTE.navy,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  classText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  stationBlock: {
    flex: 1,
  },
  stationLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: PALETTE.slate,
    fontWeight: '700',
  },
  stationCode: {
    fontSize: 20,
    fontWeight: '900',
    color: PALETTE.navy,
  },
  stationName: {
    fontSize: 11,
    color: PALETTE.slate,
  },
  arrowBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  arrow: {
    color: PALETTE.saffron,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: PALETTE.slate,
    marginTop: 2,
  },
  perforation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    position: 'relative',
    height: 16,
  },
  leftNotch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    position: 'absolute',
    left: -24,
  },
  rightNotch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    position: 'absolute',
    right: -24,
  },
  dashedLine: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E0',
    borderStyle: 'dashed',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnrLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: PALETTE.slate,
    fontWeight: '700',
  },
  pnrNumber: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '900',
    color: PALETTE.coal,
    letterSpacing: 1.5,
  },
  statusLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: PALETTE.slate,
    fontWeight: '700',
    marginBottom: 2,
  },
  passengerContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: PALETTE.ash,
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  passengerNumber: {
    fontSize: 11,
    color: PALETTE.slate,
    fontWeight: '600',
  },
  coachBerth: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: PALETTE.navy,
  },
});
