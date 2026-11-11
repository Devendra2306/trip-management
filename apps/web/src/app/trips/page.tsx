'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, KeyRound, Train } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { TripCard } from '@/components/trip/TripCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { getLocalTrips, saveLocalTrip } from '@/lib/storage';
import type { Trip } from '@yatra/shared';

interface TripWithRole extends Trip {
  role?: string;
  member_count?: number;
}

export default function TripsDashboard() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const fetchTrips = async () => {
    setLoading(true);
    // 1. Immediately show locally cached trips
    const local = getLocalTrips();
    if (local && local.length > 0) {
      setTrips(local.map((t) => ({ ...t, role: 'organizer' })));
    }

    // 2. Fetch from Supabase
    try {
      const supabase = createClient();
      const { data: tripList, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && tripList && tripList.length > 0) {
        const formatted = tripList.map((t) => ({
          ...(t as unknown as Trip),
          role: 'organizer',
        }));
        const idSet = new Set(formatted.map((t) => t.id));
        const merged = [...formatted, ...local.filter((l) => !idSet.has(l.id))];
        setTrips(merged);
        tripList.forEach((t) => saveLocalTrip(t as unknown as Trip));
      }
    } catch (e) {
      console.warn('Failed to fetch trips from Supabase, relying on local storage', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleJoinTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!inviteCode.trim()) return;

    setJoining(true);
    try {
      const supabase = createClient();
      const cleanCode = inviteCode.trim().toUpperCase();

      const { data: tripId, error } = await supabase.rpc('join_trip_by_code', {
        code: cleanCode,
      });

      if (error) throw error;

      setIsJoinOpen(false);
      setInviteCode('');
      router.push(`/trips/${tripId}`);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Invalid invite code or unable to join');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-chalk">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-ash">
          <div>
            <h1 className="text-2xl font-black text-navy tracking-tight">Your Journeys</h1>
            <p className="text-sm text-slate mt-1">
              Group train travels, itineraries, live PNRs, and shared expenses.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => setIsJoinOpen(true)}>
              <KeyRound className="h-4 w-4 mr-1.5" />
              Join via Code
            </Button>
            <Link href="/trips/new">
              <Button>
                <Plus className="h-4 w-4 mr-1.5" />
                New Trip
              </Button>
            </Link>
          </div>
        </div>

        {/* Trips Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-white border border-ash/80 animate-pulse"
                />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-ash/80 p-8 shadow-xs max-w-lg mx-auto">
              <div className="p-4 rounded-full bg-cream text-saffron w-fit mx-auto mb-4">
                <Train className="h-10 w-10" />
              </div>
              <h2 className="text-lg font-bold text-navy">No trips planned yet</h2>
              <p className="text-sm text-slate mt-1 mb-6">
                Create a new group train trip or enter an invite code from a friend.
              </p>
              <div className="flex justify-center space-x-3">
                <Link href="/trips/new">
                  <Button size="sm">Create a Trip</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => setIsJoinOpen(true)}>
                  Enter Invite Code
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} role={trip.role} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Join via Code Modal */}
      <Modal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} title="Join a Trip">
        <form onSubmit={handleJoinTrip} className="space-y-4">
          {joinError && (
            <div className="p-3 bg-red-50 border border-red-200 text-rust text-xs rounded-md">
              {joinError}
            </div>
          )}

          <Input
            label="6-Character Trip Invite Code"
            placeholder="e.g. VNS2026"
            maxLength={6}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
            className="font-mono text-center tracking-widest text-lg font-bold"
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-ash">
            <Button type="button" variant="outline" onClick={() => setIsJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={joining}>
              Join Trip
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
