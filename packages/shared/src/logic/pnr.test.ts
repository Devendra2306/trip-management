import { describe, it, expect } from 'vitest';
import {
  parseStatusString,
  getOverallPnrStatus,
  getStatusColour,
  detectStatusChange,
  getPollIntervalMinutes,
  formatStatusChangeNotification,
  generateInviteCode,
} from './pnr';
import type { PnrInfo, PassengerStatus } from '../types';

describe('parseStatusString', () => {
  it('parses CNF with coach and berth', () => {
    expect(parseStatusString('CNF/B3/42')).toEqual({
      statusCode: 'CNF',
      coach: 'B3',
      berth: '42',
      waitlistNumber: null,
    });
  });

  it('parses WL with number', () => {
    expect(parseStatusString('WL/5')).toEqual({
      statusCode: 'WL',
      coach: null,
      berth: null,
      waitlistNumber: 5,
    });
  });

  it('parses RAC with number', () => {
    expect(parseStatusString('RAC/3')).toEqual({
      statusCode: 'RAC',
      coach: null,
      berth: null,
      waitlistNumber: 3,
    });
  });

  it('parses RLWL', () => {
    expect(parseStatusString('RLWL/12')).toEqual({
      statusCode: 'RLWL',
      coach: null,
      berth: null,
      waitlistNumber: 12,
    });
  });

  it('parses CAN', () => {
    expect(parseStatusString('CAN')).toEqual({
      statusCode: 'CAN',
      coach: null,
      berth: null,
      waitlistNumber: null,
    });
  });

  it('returns UNKNOWN for empty string', () => {
    expect(parseStatusString('')).toEqual({
      statusCode: 'UNKNOWN',
      coach: null,
      berth: null,
      waitlistNumber: null,
    });
  });

  it('handles case-insensitive input', () => {
    expect(parseStatusString('cnf/b3/42').statusCode).toBe('CNF');
  });
});

describe('getOverallPnrStatus', () => {
  it('returns CNF when all confirmed', () => {
    const passengers: PassengerStatus[] = [
      { number: 1, booking_status: 'WL/5', current_status: 'CNF/B3/42', coach: 'B3', berth: '42', berth_type: 'LB' },
      { number: 2, booking_status: 'WL/6', current_status: 'CNF/B3/44', coach: 'B3', berth: '44', berth_type: 'UB' },
    ];
    expect(getOverallPnrStatus(passengers)).toBe('CNF');
  });

  it('returns WL if any passenger is waitlisted', () => {
    const passengers: PassengerStatus[] = [
      { number: 1, booking_status: 'WL/5', current_status: 'CNF/B3/42', coach: 'B3', berth: '42', berth_type: 'LB' },
      { number: 2, booking_status: 'WL/6', current_status: 'WL/3', coach: null, berth: null, berth_type: null },
    ];
    expect(getOverallPnrStatus(passengers)).toBe('WL');
  });

  it('returns UNKNOWN for empty passengers', () => {
    expect(getOverallPnrStatus([])).toBe('UNKNOWN');
  });
});

describe('getStatusColour', () => {
  it('returns green for CNF', () => {
    expect(getStatusColour('CNF').bg).toBe('#16a34a');
  });

  it('returns red for WL', () => {
    expect(getStatusColour('WL').bg).toBe('#dc2626');
  });

  it('returns amber for RAC', () => {
    expect(getStatusColour('RAC').bg).toBe('#d97706');
  });

  it('returns blue for CHART_PREPARED', () => {
    expect(getStatusColour('CHART_PREPARED').bg).toBe('#2563eb');
  });
});

describe('detectStatusChange', () => {
  const basePnr: PnrInfo = {
    pnr: '1234567890',
    train_number: '12951',
    train_name: 'Rajdhani Express',
    from_station: 'NDLS',
    from_station_name: 'New Delhi',
    to_station: 'BCT',
    to_station_name: 'Mumbai Central',
    boarding_date: '2024-12-25',
    journey_class: '3A',
    chart_prepared: false,
    passengers: [
      { number: 1, booking_status: 'WL/5', current_status: 'WL/5', coach: null, berth: null, berth_type: null },
      { number: 2, booking_status: 'WL/6', current_status: 'WL/6', coach: null, berth: null, berth_type: null },
    ],
    last_checked_at: '2024-12-20T10:00:00Z',
  };

  it('detects no change when status is the same', () => {
    const result = detectStatusChange(basePnr, basePnr);
    expect(result.changed).toBe(false);
    expect(result.passengerChanges).toHaveLength(0);
  });

  it('detects WL to CNF change', () => {
    const updated: PnrInfo = {
      ...basePnr,
      passengers: [
        { number: 1, booking_status: 'WL/5', current_status: 'CNF/B3/42', coach: 'B3', berth: '42', berth_type: 'LB' },
        { number: 2, booking_status: 'WL/6', current_status: 'CNF/B3/44', coach: 'B3', berth: '44', berth_type: 'UB' },
      ],
    };
    const result = detectStatusChange(basePnr, updated);
    expect(result.changed).toBe(true);
    expect(result.passengerChanges).toHaveLength(2);
    expect(result.passengerChanges[0].description).toContain('moved from WL 5 to CNF (B3, 42)');
  });

  it('detects chart preparation', () => {
    const updated: PnrInfo = { ...basePnr, chart_prepared: true };
    const result = detectStatusChange(basePnr, updated);
    expect(result.changed).toBe(true);
    expect(result.chartJustPrepared).toBe(true);
  });

  it('returns no change for null previous', () => {
    const result = detectStatusChange(null, basePnr);
    expect(result.changed).toBe(false);
  });
});

describe('getPollIntervalMinutes', () => {
  it('returns 30 min on the day of journey', () => {
    const boarding = '2024-12-25';
    const now = new Date('2024-12-25T06:00:00+05:30');
    expect(getPollIntervalMinutes(boarding, now)).toBe(30);
  });

  it('returns 60 min 2 days before', () => {
    const boarding = '2024-12-25';
    const now = new Date('2024-12-23T06:00:00+05:30');
    expect(getPollIntervalMinutes(boarding, now)).toBe(60);
  });

  it('returns 120 min a week before', () => {
    const boarding = '2024-12-25';
    const now = new Date('2024-12-19T06:00:00+05:30');
    expect(getPollIntervalMinutes(boarding, now)).toBe(120);
  });

  it('returns null after journey + 24h', () => {
    const boarding = '2024-12-25';
    const now = new Date('2024-12-27T06:00:00+05:30');
    expect(getPollIntervalMinutes(boarding, now)).toBeNull();
  });
});

describe('formatStatusChangeNotification', () => {
  it('formats WL to CNF notification', () => {
    const change = {
      changed: true,
      chartJustPrepared: false,
      passengerChanges: [
        {
          passengerNumber: 2,
          from: 'WL/5',
          to: 'CNF/B3/42',
          description: 'Ticket 2 moved from WL 5 to CNF (B3, 42)',
        },
      ],
    };
    const messages = formatStatusChangeNotification(
      { train_number: '12951', train_name: 'Rajdhani Express' },
      change
    );
    expect(messages).toEqual(['Ticket 2 moved from WL 5 to CNF (B3, 42)']);
  });

  it('formats chart prepared notification', () => {
    const change = {
      changed: true,
      chartJustPrepared: true,
      passengerChanges: [],
    };
    const messages = formatStatusChangeNotification(
      { train_number: '12951', train_name: 'Rajdhani Express' },
      change
    );
    expect(messages).toEqual(['Chart prepared for 12951']);
  });
});

describe('generateInviteCode', () => {
  it('generates 6-character code', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it('only uses valid characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      // Should not contain O, 0, I, 1
      expect(code).not.toMatch(/[OI01]/);
    }
  });

  it('generates unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    // Highly unlikely to have collisions in 100 codes from 28^6 space
    expect(codes.size).toBeGreaterThan(95);
  });
});
