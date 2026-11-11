'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { TripTabs } from '@/components/layout/TripTabs';
import { createClient } from '@/lib/supabase/client';
import { getLocalTripById } from '@/lib/storage';
import type { Trip, TripRole } from '@yatra/shared';

export default function TripLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const params = useParams();
  const tripId = params.tripId as string;
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [role, setRole] = useState<TripRole>('member');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrip() {
      const supabase = createClient();

      // Check membership or default to organizer
      setRole('organizer');

      // Load trip data from Supabase
      try {
        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripData) {
          setTrip(tripData as Trip);
        } else {
          const local = getLocalTripById(tripId);
          if (local) setTrip(local);
        }
      } catch {
        const local = getLocalTripById(tripId);
        if (local) setTrip(local);
      }
      setLoading(false);
    }

    if (tripId) {
      loadTrip();
    }
  }, [tripId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-chalk">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-4">
          <div className="h-8 w-48 bg-ash rounded" />
          <div className="h-12 w-full bg-ash rounded" />
          <div className="h-64 w-full bg-white rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chalk">
      <Navbar />

      {/* Trip Mini Header */}
      <div className="bg-white border-b border-ash/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-brass bg-cream px-2 py-0.5 rounded border border-brass/30">
                {trip?.invite_code}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-navy">{trip?.name}</h1>
            </div>
            {trip?.description && (
              <p className="text-xs text-slate mt-1 max-w-xl truncate">{trip.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-mist text-slate font-mono uppercase">
              Role: {role}
            </span>
          </div>
        </div>
      </div>

      {/* Four Tabs: Overview, Trains, Plan, Money */}
      <TripTabs tripId={tripId} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
