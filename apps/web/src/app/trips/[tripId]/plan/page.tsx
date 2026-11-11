'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Calendar, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ItineraryTimeline } from '@/components/plan/ItineraryTimeline';
import { AddItineraryModal } from '@/components/plan/AddItineraryModal';
import { createClient } from '@/lib/supabase/client';
import type { ItineraryItem, TripRole } from '@yatra/shared';

export default function TripPlanPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [role, setRole] = useState<TripRole>('member');
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchItinerary = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Check user role
      const { data: member } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .single();
      if (member) setRole(member.role as TripRole);
    }

    // Fetch itinerary items
    const { data: itemList } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true })
      .order('order_index', { ascending: true });

    if (itemList) {
      setItems(itemList as ItineraryItem[]);
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    fetchItinerary();

    // Supabase Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-plan-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_items', filter: `trip_id=eq.${tripId}` },
        () => {
          fetchItinerary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchItinerary]);

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this itinerary event?')) return;
    const supabase = createClient();
    await supabase.from('itinerary_items').delete().eq('id', itemId);
    fetchItinerary();
  };

  const isOrganizer = role === 'organizer';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-ash">
        <div>
          <h2 className="text-xl font-black text-navy tracking-tight">Day-by-Day Journey Plan</h2>
          <p className="text-xs text-slate mt-1">
            {isOrganizer
              ? 'As the trip organizer, you can schedule events, stays, and travel segments.'
              : 'Organized timeline for the trip. Only organizers can add or modify events.'}
          </p>
        </div>

        <div>
          {isOrganizer ? (
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Event
            </Button>
          ) : (
            <div className="flex items-center text-xs text-slate font-medium bg-mist px-3 py-1.5 rounded-lg border border-ash">
              <ShieldAlert className="h-4 w-4 text-brass mr-1.5" />
              Organizer-only editing
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-white rounded-xl border border-ash animate-pulse" />
          ))}
        </div>
      ) : (
        <ItineraryTimeline
          items={items}
          isOrganizer={isOrganizer}
          onDeleteItem={handleDeleteItem}
        />
      )}

      {isOrganizer && (
        <AddItineraryModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          tripId={tripId}
          onItemAdded={fetchItinerary}
        />
      )}
    </div>
  );
}
