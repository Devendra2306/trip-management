'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Train, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TicketStub } from '@/components/train/TicketStub';
import { SplitFlapDisplay } from '@/components/train/SplitFlapDisplay';
import { AddTicketModal } from '@/components/train/AddTicketModal';
import { createClient } from '@/lib/supabase/client';
import type { Ticket, PnrStatusHistory } from '@yatra/shared';

export default function TripTrainsPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<string, PnrStatusHistory>>({});
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const fetchTicketsAndStatus = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || '00000000-0000-0000-0000-000000000001');

    // 1. Fetch tickets
    const { data: ticketList } = await supabase
      .from('tickets')
      .select('*')
      .eq('trip_id', tripId)
      .order('boarding_date', { ascending: true });

    if (ticketList) {
      setTickets(ticketList as Ticket[]);

      // 2. Fetch latest status for each ticket
      if (ticketList.length > 0) {
        const ticketIds = ticketList.map((t) => t.id);
        const { data: historyList } = await supabase
          .from('pnr_status_history')
          .select('*')
          .in('ticket_id', ticketIds)
          .order('checked_at', { ascending: false });

        if (historyList) {
          const latestMap: Record<string, PnrStatusHistory> = {};
          for (const item of historyList as PnrStatusHistory[]) {
            if (!latestMap[item.ticket_id]) {
              latestMap[item.ticket_id] = item;
            }
          }
          setHistoryMap(latestMap);
        }
      }
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    fetchTicketsAndStatus();

    // Setup Supabase Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-trains-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `trip_id=eq.${tripId}` },
        () => {
          fetchTicketsAndStatus();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pnr_status_history' },
        () => {
          fetchTicketsAndStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchTicketsAndStatus]);

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to remove this train ticket?')) return;
    const supabase = createClient();
    await supabase.from('tickets').delete().eq('id', ticketId);
    fetchTicketsAndStatus();
  };

  // Determine split-flap message
  const firstTicket = tickets[0];
  const firstTicketStatus = firstTicket ? historyMap[firstTicket.id] : null;
  const flapText = firstTicket
    ? `${firstTicket.train_number} ${firstTicketStatus?.status_data?.passengers?.[0]?.current_status || 'CNF'}`
    : 'NO TRAINS';

  return (
    <div className="space-y-8">
      {/* Split Flap Station Board Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-navy p-6 rounded-2xl shadow-md border-2 border-brass/50 text-white">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-brass block mb-1">
            INDIAN RAILWAYS LIVE STATUS BOARD
          </span>
          <h2 className="text-xl font-black">Train Journey Stubs</h2>
          <p className="text-xs text-gray-300 mt-1">
            Server polling checks PNR updates. Waitlist changes notify travelers instantly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <SplitFlapDisplay text={flapText} padLength={12} label="NEXT TRAIN STATUS" />
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Ticket
          </Button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 bg-white rounded-2xl border border-ash animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-ash/80 p-8 shadow-xs">
            <Train className="h-12 w-12 mx-auto text-brass mb-3 opacity-80" />
            <h3 className="font-bold text-navy text-lg">No train tickets linked</h3>
            <p className="text-slate text-sm mt-1 max-w-sm mx-auto mb-6">
              Add your IRCTC booking PNR numbers so all travelers can track seats, coaches, and chart preparation.
            </p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add First Ticket
            </Button>
          </div>
        ) : (
          <div>
            {tickets.map((ticket) => (
              <TicketStub
                key={ticket.id}
                ticket={ticket}
                latestStatus={historyMap[ticket.id]}
                canDelete={true}
                onDelete={() => handleDeleteTicket(ticket.id)}
                onRefresh={fetchTicketsAndStatus}
              />
            ))}
          </div>
        )}
      </div>

      <AddTicketModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        tripId={tripId}
        onTicketAdded={fetchTicketsAndStatus}
      />
    </div>
  );
}
