'use client';

import React from 'react';
import { Train, Calendar, User, ArrowRight, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PnrStatusBadge } from './PnrStatusBadge';
import type { Ticket, PnrStatusHistory } from '@yatra/shared';

interface TicketStubProps {
  ticket: Ticket;
  latestStatus?: PnrStatusHistory | null;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function TicketStub({ ticket, latestStatus, onDelete, canDelete }: TicketStubProps) {
  const statusData = latestStatus?.status_data;
  const passengers = statusData?.passengers || [];

  return (
    <div className="relative flex flex-col md:flex-row bg-[#FFFDF8] rounded-2xl border-2 border-brass/40 shadow-md hover:shadow-lg transition-all overflow-hidden my-4">
      {/* Decorative Left Border Color Bar (Train Orange) */}
      <div className="w-full md:w-3 bg-saffron h-2 md:h-auto" />

      {/* Main Ticket Section */}
      <div className="flex-1 p-6 relative">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ash pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-cream-paper border border-brass/30 text-saffron">
              <Train className="h-5 w-5" />
            </div>
            <div>
              <span className="font-mono text-sm font-bold text-navy">#{ticket.train_number}</span>
              <h3 className="font-bold text-base text-coal">{ticket.train_name}</h3>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded bg-navy text-white text-xs font-mono font-semibold">
              Class {ticket.journey_class}
            </span>
            {canDelete && onDelete && (
              <button
                onClick={onDelete}
                className="text-gray-400 hover:text-rust transition-colors p-1"
                title="Remove ticket"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stations & Route */}
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 py-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate">Origin</span>
            <div className="text-xl font-black text-navy tracking-tight">{ticket.from_station}</div>
            <div className="text-xs text-slate truncate">{ticket.from_station_name}</div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center space-x-2 text-saffron">
              <span className="h-[2px] w-8 bg-saffron/40" />
              <ArrowRight className="h-4 w-4" />
              <span className="h-[2px] w-8 bg-saffron/40" />
            </div>
            <span className="text-[10px] font-mono text-slate mt-1 flex items-center">
              <Calendar className="h-3 w-3 mr-1 text-slate" />
              {formatDate(ticket.boarding_date)}
            </span>
          </div>

          <div className="sm:text-right">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate">Destination</span>
            <div className="text-xl font-black text-navy tracking-tight">{ticket.to_station}</div>
            <div className="text-xs text-slate truncate">{ticket.to_station_name}</div>
          </div>
        </div>

        {/* Passenger details if available */}
        {passengers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-ash/80">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate block mb-2">
              Passenger Breakdown
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {passengers.map((p) => (
                <div
                  key={p.number}
                  className="flex items-center justify-between text-xs bg-chalk p-2 rounded border border-ash/50 font-mono"
                >
                  <span className="flex items-center font-medium text-coal">
                    <User className="h-3 w-3 mr-1 text-slate" />
                    Passenger {p.number}
                  </span>
                  <div className="flex items-center space-x-2">
                    {p.coach && p.berth && (
                      <span className="bg-navy/10 text-navy font-bold px-1.5 py-0.5 rounded text-[11px]">
                        {p.coach}, {p.berth} ({p.berth_type || 'B'})
                      </span>
                    )}
                    <PnrStatusBadge status={p.current_status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Perforation Line with Top and Bottom Half-Circle Cutouts */}
      <div className="relative flex md:flex-col items-center justify-between">
        {/* Top punch notch (for desktop) */}
        <div className="hidden md:block absolute -top-4 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-chalk border-b-2 border-brass/40" />
        
        {/* Dashed vertical line */}
        <div className="hidden md:block h-full border-r-2 border-dashed border-gray-300 mx-auto" />
        {/* Horizontal dashed line on mobile */}
        <div className="block md:hidden w-full border-b-2 border-dashed border-gray-300 my-2" />

        {/* Bottom punch notch (for desktop) */}
        <div className="hidden md:block absolute -bottom-4 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-chalk border-t-2 border-brass/40" />
      </div>

      {/* Right Boarding Stub Section */}
      <div className="w-full md:w-56 p-6 bg-cream flex flex-col justify-between items-center text-center border-t md:border-t-0 md:border-l border-ash/50">
        <div className="w-full space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate block">
            INDIAN RAILWAYS PNR
          </span>
          <div className="font-mono text-xl font-black text-navy bg-white py-1.5 px-3 rounded border border-ash shadow-inner tracking-widest">
            {ticket.pnr}
          </div>
          {statusData?.chart_prepared ? (
            <div className="text-[11px] font-semibold text-forest flex items-center justify-center">
              ● Chart Prepared
            </div>
          ) : (
            <div className="text-[11px] text-slate">Chart Not Prepared</div>
          )}
        </div>

        <div className="my-4 w-full">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate block mb-1">
            Current Status
          </span>
          {passengers[0]?.current_status ? (
            <PnrStatusBadge status={passengers[0].current_status} className="w-full justify-center text-sm py-1.5" />
          ) : (
            <PnrStatusBadge status="CNF" className="w-full justify-center text-sm py-1.5" />
          )}
        </div>

        {/* Simulated Barcode */}
        <div className="w-full pt-2 flex flex-col items-center">
          <div className="h-6 w-3/4 flex justify-between items-stretch space-x-[2px] opacity-70">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className={`bg-black ${i % 3 === 0 ? 'w-[3px]' : i % 2 === 0 ? 'w-[1px]' : 'w-[2px]'}`}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono text-slate mt-1">YATRA SECURE PASS</span>
        </div>
      </div>
    </div>
  );
}
