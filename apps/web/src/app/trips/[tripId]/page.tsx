'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Check, Users, Train, Calendar, IndianRupee, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { getLocalTripById } from '@/lib/storage';
import type { Trip, TripMember } from '@yatra/shared';

export default function TripOverviewPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [planCount, setPlanCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const [tripRes, membersRes, ticketsRes, plansRes, expensesRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('trip_members').select('*, profile:profiles(*)').eq('trip_id', tripId),
        supabase.from('tickets').select('id', { count: 'exact' }).eq('trip_id', tripId),
        supabase.from('itinerary_items').select('id', { count: 'exact' }).eq('trip_id', tripId),
        supabase.from('expenses').select('id', { count: 'exact' }).eq('trip_id', tripId),
      ]);

      if (tripRes.data) {
        setTrip(tripRes.data as Trip);
      } else {
        const local = getLocalTripById(tripId);
        if (local) setTrip(local);
      }
      if (membersRes.data) setMembers(membersRes.data as TripMember[]);
      if (ticketsRes.count !== null) setTicketCount(ticketsRes.count);
      if (plansRes.count !== null) setPlanCount(plansRes.count);
      if (expensesRes.count !== null) setExpenseCount(expensesRes.count);
    }

    if (tripId) loadData();
  }, [tripId]);

  const copyInvite = () => {
    if (!trip) return;
    const url = `${window.location.origin}/join/${trip.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Invite Code Section */}
      <div className="bg-white rounded-2xl border-2 border-brass/40 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate block mb-1">
            TRIP DETAILS
          </span>
          <h2 className="text-2xl font-black text-navy">{trip?.name}</h2>
          <p className="text-xs text-slate mt-1">
            {trip?.start_date ? formatDate(trip.start_date) : 'Date TBD'}
            {trip?.end_date ? ` to ${formatDate(trip.end_date)}` : ''}
          </p>
          {trip?.description && (
            <p className="text-sm text-coal/80 mt-3 max-w-xl">{trip.description}</p>
          )}
        </div>

        {/* Invite Code Card */}
        <div className="w-full md:w-auto p-5 rounded-xl bg-cream border border-brass/40 flex flex-col items-center text-center space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate font-bold">
            TRIP INVITE CODE
          </span>
          <div className="font-mono text-3xl font-black text-navy tracking-widest bg-white px-6 py-2 rounded-lg border border-brass/40 shadow-inner">
            {trip?.invite_code || '------'}
          </div>
          <Button size="sm" variant="outline" onClick={copyInvite} className="w-full text-xs">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1 text-forest" />
                Invite Link Copied!
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 mr-1" />
                Copy Join Link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-ash shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-orange-50 text-saffron">
            <Train className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-navy">{ticketCount}</div>
            <div className="text-xs text-slate font-medium">Train Tickets Added</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-ash shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-navy">{planCount}</div>
            <div className="text-xs text-slate font-medium">Itinerary Events</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-ash shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-forest">
            <IndianRupee className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-navy">{expenseCount}</div>
            <div className="text-xs text-slate font-medium">Expenses Recorded</div>
          </div>
        </div>
      </div>

      {/* Members Roster */}
      <div className="bg-white rounded-xl border border-ash p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-ash">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-saffron" />
            <h3 className="font-bold text-navy text-base">Travelers ({members.length})</h3>
          </div>
          <span className="text-xs text-slate font-mono">Synced with Supabase</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {members.map((m) => {
            const name = m.profile?.display_name || m.profile?.email?.split('@')[0] || 'Traveler';
            const email = m.profile?.email || '';
            const isOrganizer = m.role === 'organizer';

            return (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg bg-mist/40 border border-ash/60"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="h-9 w-9 rounded-full bg-navy text-white font-mono font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-xs text-coal block truncate">{name}</span>
                    <span className="text-[11px] text-slate block truncate">{email}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ml-2 flex-shrink-0 ${
                    isOrganizer
                      ? 'bg-navy text-white'
                      : 'bg-ash/70 text-slate'
                  }`}
                >
                  {m.role}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
