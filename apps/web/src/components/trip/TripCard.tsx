'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Trip } from '@yatra/shared';

interface TripCardProps {
  trip: Trip;
  memberCount?: number;
  role?: string;
}

export function TripCard({ trip, memberCount = 1, role = 'member' }: TripCardProps) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block relative bg-[#FFFDF8] rounded-2xl border-2 border-brass/40 shadow-sm hover:shadow-md hover:border-brass transition-all overflow-hidden"
    >
      {/* Top decorative stripe */}
      <div className="h-2 w-full bg-saffron group-hover:bg-saffron-hover transition-colors" />

      <div className="p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-cream border border-brass/30 text-brass mb-2">
              CODE: {trip.invite_code}
            </span>
            <h3 className="text-xl font-bold text-navy group-hover:text-saffron transition-colors">
              {trip.name}
            </h3>
          </div>
          {role === 'organizer' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy text-white">
              ORGANIZER
            </span>
          )}
        </div>

        {trip.description && (
          <p className="text-xs text-slate mt-2 line-clamp-2">{trip.description}</p>
        )}

        <div className="mt-6 pt-4 border-t border-ash/80 flex items-center justify-between text-xs text-slate font-medium">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3.5 w-3.5 text-saffron" />
            <span>
              {trip.start_date ? formatDate(trip.start_date) : 'Upcoming'}
              {trip.end_date ? ` - ${formatDate(trip.end_date)}` : ''}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Users className="h-3.5 w-3.5 text-slate" />
            <span>{memberCount}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end text-xs font-semibold text-saffron group-hover:translate-x-1 transition-transform">
          <span>Enter Trip</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </div>
      </div>
    </Link>
  );
}
