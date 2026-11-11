'use client';

import React, { useState } from 'react';
import { Train, Search, RotateCcw, Check, Plus, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PnrStatusBadge } from './PnrStatusBadge';
import { createClient } from '@/lib/supabase/client';
import { saveLocalTicket } from '@/lib/storage';

interface OfficialPnrEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  onTicketAdded?: () => void;
}

interface PassengerData {
  number: number;
  booking_status: string;
  current_status: string;
  coach: string | null;
  berth: string | null;
  berth_type: string | null;
}

interface PnrResponseData {
  pnr: string;
  train_number: string;
  train_name: string;
  from_station: { code: string; name: string };
  to_station: { code: string; name: string };
  boarding_date: string;
  journey_class: string;
  chart_prepared: boolean;
  passengers: PassengerData[];
  source: string;
}

export function OfficialPnrEnquiryModal({
  isOpen,
  onClose,
  tripId,
  onTicketAdded,
}: OfficialPnrEnquiryModalProps) {
  const [pnrInput, setPnrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PnrResponseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleEnquiry = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPnr = pnrInput.trim().replace(/\D/g, '');

    if (cleanPnr.length !== 10) {
      setError('Please enter a valid 10-digit Indian Railways PNR number.');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/pnr/${cleanPnr}`);
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch PNR status from IRCTC');
      }

      if (json.data) {
        setData(json.data);
      } else {
        throw new Error('No status records found for this PNR');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'PNR enquiry failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToTrip = async () => {
    if (!data || !tripId) return;
    setSaving(true);
    try {
      const ticketPayload = {
        trip_id: tripId,
        pnr: data.pnr,
        train_number: data.train_number,
        train_name: data.train_name,
        from_station: data.from_station.code,
        from_station_name: data.from_station.name,
        to_station: data.to_station.code,
        to_station_name: data.to_station.name,
        boarding_date: data.boarding_date,
        journey_class: data.journey_class,
        added_by: '00000000-0000-0000-0000-000000000001',
      };

      // 1. Try server endpoint
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayload),
      });

      const resJson = await res.json();
      const finalTicket = resJson.ticket || {
        ...ticketPayload,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 2. Cache in local storage
      saveLocalTicket(tripId, finalTicket);

      setSaved(true);
      if (onTicketAdded) onTicketAdded();
    } catch (e) {
      console.warn('Failed to save ticket to trip', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-dark/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border-2 border-brass/40 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Official Indian Railways Header Banner */}
        <div className="bg-[#003366] text-white p-4 sm:p-5 flex items-center justify-between border-b-4 border-saffron shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-2.5 rounded-xl bg-saffron text-white shadow-md">
              <Train className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-brass block">
                GOVERNMENT OF INDIA • MINISTRY OF RAILWAYS
              </span>
              <h2 className="text-base sm:text-xl font-black tracking-wide font-mono">
                PASSENGER RESERVATION ENQUIRY
              </h2>
              <span className="text-[9px] font-mono text-gray-300 block">
                Centre for Railway Information Systems (CRIS) Live Gateway
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-[#FFFDF8]">
          {/* PNR Search Form */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-ash shadow-xs">
            <form onSubmit={handleEnquiry} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-slate mb-1">
                  Enter 10-Digit PNR Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 2458910293"
                    value={pnrInput}
                    onChange={(e) => {
                      setError(null);
                      setPnrInput(e.target.value.replace(/\D/g, ''));
                    }}
                    autoFocus
                    className="w-full h-11 px-3 text-base font-mono font-bold tracking-widest text-navy bg-mist/40 border-2 border-ash rounded-lg focus:border-saffron focus:bg-white focus:outline-none transition-all"
                  />
                  {pnrInput.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPnrInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-coal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto pt-2 sm:pt-5">
                <Button
                  type="submit"
                  size="md"
                  disabled={loading || pnrInput.length !== 10}
                  className="flex-1 sm:flex-initial"
                >
                  <Search className="h-4 w-4 mr-1.5" />
                  {loading ? 'Checking IRCTC...' : 'Get Status'}
                </Button>
                {data && (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setData(null);
                      setPnrInput('');
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-rust text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-saffron mx-auto" />
              <p className="font-mono text-xs text-slate font-bold">
                Connecting to Indian Railways enquiry servers...
              </p>
            </div>
          )}

          {/* ENQUIRY RESULTS (Authentic indianrail.gov.in Style) */}
          {data && (
            <div className="space-y-5 animate-fadeIn">
              {/* Journey Details Table */}
              <div className="bg-white rounded-xl border-2 border-[#003366]/20 overflow-hidden shadow-xs">
                <div className="bg-[#003366] text-white px-4 py-2 font-mono text-xs font-bold tracking-wider flex items-center justify-between">
                  <span>JOURNEY DETAILS</span>
                  <span className="text-brass">PNR: {data.pnr}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse font-mono">
                    <thead>
                      <tr className="bg-cream-paper/70 text-slate border-b border-ash text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-2.5 border-r border-ash">Train Number</th>
                        <th className="p-2.5 border-r border-ash">Train Name</th>
                        <th className="p-2.5 border-r border-ash">Boarding Date</th>
                        <th className="p-2.5 border-r border-ash">From</th>
                        <th className="p-2.5 border-r border-ash">To</th>
                        <th className="p-2.5 border-r border-ash">Reserved Upto</th>
                        <th className="p-2.5">Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-ash font-bold text-navy">
                        <td className="p-2.5 border-r border-ash">{data.train_number}</td>
                        <td className="p-2.5 border-r border-ash text-coal">{data.train_name}</td>
                        <td className="p-2.5 border-r border-ash">{data.boarding_date}</td>
                        <td className="p-2.5 border-r border-ash">{data.from_station.code}</td>
                        <td className="p-2.5 border-r border-ash">{data.to_station.code}</td>
                        <td className="p-2.5 border-r border-ash">{data.to_station.code}</td>
                        <td className="p-2.5">{data.journey_class}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Passenger Status Table */}
              <div className="bg-white rounded-xl border-2 border-[#003366]/20 overflow-hidden shadow-xs">
                <div className="bg-[#003366] text-white px-4 py-2 font-mono text-xs font-bold tracking-wider flex items-center justify-between">
                  <span>PASSENGER CURRENT STATUS</span>
                  <span className={data.chart_prepared ? 'text-emerald-300' : 'text-amber-300'}>
                    ● {data.chart_prepared ? 'CHART PREPARED' : 'CHART NOT PREPARED'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse font-mono">
                    <thead>
                      <tr className="bg-cream-paper/70 text-slate border-b border-ash text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-2.5 border-r border-ash w-16">S.No.</th>
                        <th className="p-2.5 border-r border-ash">Booking Status (Coach, Berth No.)</th>
                        <th className="p-2.5 border-r border-ash">* Current Status (Coach, Berth No.)</th>
                        <th className="p-2.5 text-center">Status Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.passengers.map((p) => (
                        <tr key={p.number} className="border-b border-ash hover:bg-slate-50 font-bold">
                          <td className="p-2.5 border-r border-ash text-slate">Passenger {p.number}</td>
                          <td className="p-2.5 border-r border-ash text-coal">
                            {p.booking_status}
                          </td>
                          <td className="p-2.5 border-r border-ash text-navy">
                            {p.coach && p.berth
                              ? `${p.current_status} (Coach ${p.coach}, Berth ${p.berth} ${p.berth_type || ''})`
                              : p.current_status}
                          </td>
                          <td className="p-2.5 text-center">
                            <PnrStatusBadge status={p.current_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Save to Journey Action Button */}
              {tripId && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-forest font-mono uppercase tracking-wider">
                      Link Ticket to Active Trip
                    </h4>
                    <p className="text-xs text-forest/80 mt-0.5">
                      Save this {data.train_name} ticket ({data.pnr}) to your journey dashboard.
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveToTrip}
                    disabled={saving || saved}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {saved ? (
                      <>
                        <Check className="h-4 w-4 mr-1.5" />
                        Ticket Linked!
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1.5" />
                        {saving ? 'Linking...' : 'Add Ticket to Journey'}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Official Legend Table (as on indianrail.gov.in) */}
              <div className="bg-mist/40 p-3.5 rounded-xl border border-ash/80 text-[10px] font-mono text-slate space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-navy block">
                  Legends / Abbreviations:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 leading-relaxed">
                  <div><strong className="text-coal">CNF:</strong> Confirmed</div>
                  <div><strong className="text-coal">RAC:</strong> Reservation Against Cancellation</div>
                  <div><strong className="text-coal">WL:</strong> Waiting List</div>
                  <div><strong className="text-coal">GNWL:</strong> General Waiting List</div>
                  <div><strong className="text-coal">RLWL:</strong> Remote Location Waitlist</div>
                  <div><strong className="text-coal">PQWL:</strong> Pooled Quota Waitlist</div>
                  <div><strong className="text-coal">CAN:</strong> Cancelled</div>
                  <div><strong className="text-coal">LB/MB/UB:</strong> Lower/Middle/Upper Berth</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
