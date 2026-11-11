import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

interface PassengerStatus {
  number: number;
  booking_status: string;
  current_status: string;
  coach: string | null;
  berth: string | null;
  berth_type: string | null;
}

interface PnrResult {
  pnr: string;
  train_number: string;
  train_name: string;
  from_station: { code: string; name: string };
  to_station: { code: string; name: string };
  boarding_date: string;
  journey_class: string;
  chart_prepared: boolean;
  passengers: PassengerStatus[];
  source: 'live_api' | 'simulation';
}

const FAMOUS_TRAINS = [
  { number: '12952', name: 'New Delhi - Mumbai Rajdhani Express', from: { code: 'NDLS', name: 'New Delhi' }, to: { code: 'MMCT', name: 'Mumbai Central' } },
  { number: '12302', name: 'Howrah - New Delhi Rajdhani Express', from: { code: 'NDLS', name: 'New Delhi' }, to: { code: 'HWH', name: 'Howrah Jn' } },
  { number: '22436', name: 'Vande Bharat Express', from: { code: 'NDLS', name: 'New Delhi' }, to: { code: 'BSB', name: 'Varanasi Jn' } },
  { number: '12002', name: 'Bhopal Shatabdi Express', from: { code: 'NDLS', name: 'New Delhi' }, to: { code: 'RKMP', name: 'Rani Kamlapati' } },
  { number: '12626', name: 'Kerala Express', from: { code: 'NDLS', name: 'New Delhi' }, to: { code: 'TVC', name: 'Thiruvananthapuram' } },
  { number: '12138', name: 'Punjab Mail', from: { code: 'FZR', name: 'Firozpur Cantt' }, to: { code: 'CSMT', name: 'Mumbai CSMT' } },
];

function generateSimulatedPnr(pnr: string, boardingDateParam?: string): PnrResult {
  const numHash = pnr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const train = FAMOUS_TRAINS[numHash % FAMOUS_TRAINS.length];

  const now = new Date();
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  const boardingDate = boardingDateParam || futureDate.toISOString().split('T')[0];

  const statuses = ['CNF', 'RAC', 'WL'];
  const statusChoice = statuses[numHash % 3];

  let currentStatus = 'CNF';
  let coach: string | null = `B${(numHash % 6) + 1}`;
  let berth: string | null = `${(numHash % 64) + 1}`;
  let berthType: string | null = (numHash % 2 === 0) ? 'LB' : 'UB';

  if (statusChoice === 'RAC') {
    currentStatus = `RAC/${(numHash % 15) + 1}`;
    coach = null;
    berth = null;
    berthType = null;
  } else if (statusChoice === 'WL') {
    currentStatus = `WL/${(numHash % 30) + 1}`;
    coach = null;
    berth = null;
    berthType = null;
  }

  return {
    pnr,
    train_number: train.number,
    train_name: train.name,
    from_station: train.from,
    to_station: train.to,
    boarding_date: boardingDate,
    journey_class: '3A',
    chart_prepared: false,
    passengers: [
      {
        number: 1,
        booking_status: statusChoice === 'CNF' ? 'WL/8' : 'WL/24',
        current_status: currentStatus,
        coach,
        berth,
        berth_type: berthType,
      },
    ],
    source: 'simulation',
  };
}

export async function GET(
  request: Request,
  { params }: { params: { pnr: string } }
) {
  const pnr = params.pnr?.trim();

  if (!pnr || !/^\d{10}$/.test(pnr)) {
    return NextResponse.json(
      { error: 'Invalid PNR number. Indian Railways PNR must be exactly 10 digits.' },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const ticketId = url.searchParams.get('ticket_id');
  const boardingDate = url.searchParams.get('boarding_date') || undefined;

  let result: PnrResult | null = null;

  // 1. Try Live RapidAPI if keys configured
  const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.PNR_API_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST || 'irctc1.p.rapidapi.com';

  if (rapidApiKey) {
    try {
      const response = await fetch(
        `https://${rapidApiHost}/api/v3/getPNRStatus?pnrNumber=${pnr}`,
        {
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': rapidApiHost,
          },
          next: { revalidate: 60 },
        }
      );

      if (response.ok) {
        const liveData = await response.json();
        if (liveData?.data) {
          const d = liveData.data;
          result = {
            pnr,
            train_number: d.TrainNo || d.trainNumber || '12952',
            train_name: d.TrainName || d.trainName || 'Express Train',
            from_station: {
              code: d.From || d.fromStation || 'NDLS',
              name: d.FromName || d.fromStationName || 'Origin',
            },
            to_station: {
              code: d.To || d.toStation || 'BCT',
              name: d.ToName || d.toStationName || 'Destination',
            },
            boarding_date: d.Doj || d.dateOfJourney || boardingDate || new Date().toISOString().split('T')[0],
            journey_class: d.Class || d.journeyClass || '3A',
            chart_prepared: Boolean(d.ChartPrepared || d.chartPrepared),
            passengers: (d.PassengerStatus || []).map((p: any, idx: number) => ({
              number: idx + 1,
              booking_status: p.BookingStatus || 'CNF',
              current_status: p.CurrentStatus || p.CurrentStatusNew || 'CNF',
              coach: p.Coach || p.BookingCoachId || null,
              berth: p.Berth || p.BookingBerthNo || null,
              berth_type: p.BookingBerthCode || null,
            })),
            source: 'live_api',
          };
        }
      }
    } catch (e) {
      console.warn('RapidAPI fetch failed, falling back:', e);
    }
  }

  // 2. Fallback to simulation if live API not configured or failed
  if (!result) {
    result = generateSimulatedPnr(pnr, boardingDate);
  }

  // 3. Log to pnr_status_history in database if ticket_id is provided
  if (ticketId) {
    try {
      const adminClient = getAdminClient();
      const db = adminClient || createClient();

      const topStatus = result.passengers[0]?.current_status || 'CNF';

      await db.from('pnr_status_history').insert({
        ticket_id: ticketId,
        pnr,
        current_status: topStatus.startsWith('CNF') ? 'CNF' : topStatus.startsWith('RAC') ? 'RAC' : 'WL',
        status_data: result,
      });
    } catch (e) {
      console.warn('Failed to record PNR history:', e);
    }
  }

  return NextResponse.json({
    success: true,
    data: result,
  });
}
