'use client';

import React from 'react';
import { Plane, Hotel, Compass, Utensils, FileText, Clock, MapPin, Trash2 } from 'lucide-react';
import type { ItineraryItem, ItineraryItemType } from '@yatra/shared';

interface ItineraryTimelineProps {
  items: ItineraryItem[];
  isOrganizer: boolean;
  onDeleteItem?: (id: string) => void;
}

const typeIcons: Record<ItineraryItemType, React.ReactNode> = {
  travel: <Plane className="h-4 w-4 text-blue-600" />,
  stay: <Hotel className="h-4 w-4 text-purple-600" />,
  activity: <Compass className="h-4 w-4 text-emerald-600" />,
  meal: <Utensils className="h-4 w-4 text-amber-600" />,
  note: <FileText className="h-4 w-4 text-slate" />,
};

const typeLabels: Record<ItineraryItemType, string> = {
  travel: 'Travel',
  stay: 'Accommodation',
  activity: 'Activity',
  meal: 'Food & Drink',
  note: 'Note',
};

export function ItineraryTimeline({ items, isOrganizer, onDeleteItem }: ItineraryTimelineProps) {
  // Group by day_number
  const days = Array.from(new Set(items.map((it) => it.day_number))).sort((a, b) => a - b);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-ash/80 p-8 shadow-sm">
        <Compass className="h-12 w-12 mx-auto text-brass/70 mb-3" />
        <h3 className="font-bold text-navy text-lg">No itinerary plans yet</h3>
        <p className="text-slate text-sm mt-1">
          {isOrganizer
            ? 'Start crafting the journey day-by-day using the button above.'
            : 'The trip organizer has not added any plans yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {days.map((day) => {
        const dayItems = items
          .filter((it) => it.day_number === day)
          .sort((a, b) => a.order_index - b.order_index);

        return (
          <div key={day} className="bg-white rounded-xl border border-ash p-6 shadow-sm">
            {/* Day Header */}
            <div className="flex items-center space-x-3 pb-4 mb-4 border-b border-ash">
              <span className="px-3 py-1 rounded-md bg-saffron text-white font-mono font-bold text-sm tracking-wide">
                DAY {day}
              </span>
              <span className="text-xs text-slate font-medium">
                {dayItems.length} {dayItems.length === 1 ? 'event' : 'events'} scheduled
              </span>
            </div>

            {/* Timeline Events */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-ash">
              {dayItems.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[29px] top-1 h-4 w-4 rounded-full bg-white border-2 border-saffron shadow-sm" />

                  <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-mist/40 hover:bg-mist transition-colors border border-ash/50">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="p-1 rounded bg-white shadow-xs">
                          {typeIcons[item.type]}
                        </span>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate">
                          {typeLabels[item.type]}
                        </span>
                        {item.start_time && (
                          <span className="text-xs font-mono text-navy font-semibold flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-slate" />
                            {item.start_time} {item.end_time ? `- ${item.end_time}` : ''}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-coal text-base">{item.title}</h4>

                      {item.description && (
                        <p className="text-sm text-slate">{item.description}</p>
                      )}

                      {item.location && (
                        <div className="text-xs text-slate flex items-center pt-1 font-medium">
                          <MapPin className="h-3.5 w-3.5 mr-1 text-saffron" />
                          {item.location}
                        </div>
                      )}
                    </div>

                    {isOrganizer && onDeleteItem && (
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-rust"
                        title="Delete itinerary item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
