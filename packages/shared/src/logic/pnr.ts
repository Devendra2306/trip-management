import type { PnrInfo, PnrStatus, PassengerStatus } from '../types';
import { PNR_STATUS_COLOURS } from '../types/constants';

// ─── PNR Status Parsing ───

/**
 * Parse a PNR status string like "CNF/B3/42" or "WL/5" into structured data.
 */
export function parseStatusString(status: string): {
  statusCode: PnrStatus;
  coach: string | null;
  berth: string | null;
  waitlistNumber: number | null;
} {
  if (!status || status.trim() === '') {
    return { statusCode: 'UNKNOWN', coach: null, berth: null, waitlistNumber: null };
  }

  const parts = status.trim().toUpperCase().split('/');
  const rawCode = parts[0].trim();

  // Determine status code
  let statusCode: PnrStatus;
  let waitlistNumber: number | null = null;
  let coach: string | null = null;
  let berth: string | null = null;

  if (rawCode === 'CNF' || rawCode === 'CONFIRMED') {
    statusCode = 'CNF';
    coach = parts[1]?.trim() || null;
    berth = parts[2]?.trim() || null;
  } else if (rawCode === 'RAC') {
    statusCode = 'RAC';
    waitlistNumber = parts[1] ? parseInt(parts[1].trim(), 10) : null;
    if (waitlistNumber !== null && isNaN(waitlistNumber)) {
      // RAC might have coach/berth too: RAC/B3/42
      coach = parts[1]?.trim() || null;
      berth = parts[2]?.trim() || null;
      waitlistNumber = null;
    }
  } else if (rawCode.startsWith('WL') || rawCode === 'WL') {
    statusCode = 'WL';
    waitlistNumber = parts[1] ? parseInt(parts[1].trim(), 10) : null;
    if (waitlistNumber !== null && isNaN(waitlistNumber)) waitlistNumber = null;
  } else if (rawCode === 'RLWL') {
    statusCode = 'RLWL';
    waitlistNumber = parts[1] ? parseInt(parts[1].trim(), 10) : null;
  } else if (rawCode === 'GNWL') {
    statusCode = 'GNWL';
    waitlistNumber = parts[1] ? parseInt(parts[1].trim(), 10) : null;
  } else if (rawCode === 'PQWL') {
    statusCode = 'PQWL';
    waitlistNumber = parts[1] ? parseInt(parts[1].trim(), 10) : null;
  } else if (rawCode === 'CAN' || rawCode === 'CANCELLED') {
    statusCode = 'CAN';
  } else {
    statusCode = 'UNKNOWN';
  }

  return { statusCode, coach, berth, waitlistNumber };
}

/**
 * Determine the overall PNR status from all passengers.
 * If all confirmed → CNF, any WL → WL, mix of CNF+RAC → RAC, etc.
 */
export function getOverallPnrStatus(passengers: PassengerStatus[]): PnrStatus {
  if (passengers.length === 0) return 'UNKNOWN';

  const statuses = passengers.map(
    (p) => parseStatusString(p.current_status).statusCode
  );

  if (statuses.every((s) => s === 'CNF')) return 'CNF';
  if (statuses.every((s) => s === 'CAN')) return 'CAN';
  if (statuses.some((s) => s === 'WL' || s === 'RLWL' || s === 'GNWL' || s === 'PQWL'))
    return 'WL';
  if (statuses.some((s) => s === 'RAC')) return 'RAC';
  return statuses[0];
}

/**
 * Get colour config for a PNR status.
 */
export function getStatusColour(status: PnrStatus) {
  return PNR_STATUS_COLOURS[status] ?? PNR_STATUS_COLOURS.UNKNOWN;
}

/**
 * Detect if there was a meaningful status change between two PNR checks.
 */
export function detectStatusChange(
  previous: PnrInfo | null,
  current: PnrInfo
): {
  changed: boolean;
  chartJustPrepared: boolean;
  passengerChanges: {
    passengerNumber: number;
    from: string;
    to: string;
    description: string;
  }[];
} {
  if (!previous) {
    return { changed: false, chartJustPrepared: false, passengerChanges: [] };
  }

  const chartJustPrepared = !previous.chart_prepared && current.chart_prepared;
  const passengerChanges: {
    passengerNumber: number;
    from: string;
    to: string;
    description: string;
  }[] = [];

  for (const currentPassenger of current.passengers) {
    const prevPassenger = previous.passengers.find(
      (p) => p.number === currentPassenger.number
    );

    if (prevPassenger && prevPassenger.current_status !== currentPassenger.current_status) {
      const from = parseStatusString(prevPassenger.current_status);
      const to = parseStatusString(currentPassenger.current_status);

      let description: string;
      if (to.statusCode === 'CNF') {
        description = `Ticket ${currentPassenger.number} moved from ${from.statusCode}${from.waitlistNumber ? ` ${from.waitlistNumber}` : ''} to CNF (${to.coach}, ${to.berth})`;
      } else if (to.statusCode === 'RAC') {
        description = `Ticket ${currentPassenger.number} moved to RAC ${to.waitlistNumber ?? ''}`;
      } else if (from.waitlistNumber && to.waitlistNumber && to.waitlistNumber < from.waitlistNumber) {
        description = `Ticket ${currentPassenger.number} moved from ${from.statusCode} ${from.waitlistNumber} to ${to.statusCode} ${to.waitlistNumber}`;
      } else {
        description = `Ticket ${currentPassenger.number} status changed: ${prevPassenger.current_status} → ${currentPassenger.current_status}`;
      }

      passengerChanges.push({
        passengerNumber: currentPassenger.number,
        from: prevPassenger.current_status,
        to: currentPassenger.current_status,
        description,
      });
    }
  }

  return {
    changed: chartJustPrepared || passengerChanges.length > 0,
    chartJustPrepared,
    passengerChanges,
  };
}

/**
 * Determine polling interval (in minutes) based on how close we are to journey date.
 * Polls more frequently as the journey date approaches.
 */
export function getPollIntervalMinutes(
  boardingDate: string,
  now: Date = new Date()
): number | null {
  const journey = new Date(boardingDate + 'T00:00:00+05:30'); // IST
  const diffMs = journey.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  // After journey (+ 24h buffer for late running trains)
  if (diffHours < -24) return null; // stop polling

  // Day of journey or day before
  if (diffDays <= 1) return 30; // every 30 min

  // 2-3 days before
  if (diffDays <= 3) return 60; // every hour

  // 4-7 days before
  if (diffDays <= 7) return 120; // every 2 hours

  // 1-2 weeks before
  if (diffDays <= 14) return 360; // every 6 hours

  // More than 2 weeks away
  return 720; // every 12 hours
}

/**
 * Generate notification text for a PNR status change.
 */
export function formatStatusChangeNotification(
  trainInfo: { train_number: string; train_name: string },
  change: ReturnType<typeof detectStatusChange>
): string[] {
  const messages: string[] = [];

  for (const pc of change.passengerChanges) {
    messages.push(pc.description);
  }

  if (change.chartJustPrepared) {
    messages.push(`Chart prepared for ${trainInfo.train_number}`);
  }

  return messages;
}

/**
 * Generate an invite code (6 chars, uppercase alphanumeric).
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I for clarity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
