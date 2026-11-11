'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Train, Calendar, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripTabsProps {
  tripId: string;
}

export function TripTabs({ tripId }: TripTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Overview',
      href: `/trips/${tripId}`,
      icon: Compass,
      isActive: pathname === `/trips/${tripId}`,
    },
    {
      name: 'Trains',
      href: `/trips/${tripId}/trains`,
      icon: Train,
      isActive: pathname.startsWith(`/trips/${tripId}/trains`),
    },
    {
      name: 'Plan',
      href: `/trips/${tripId}/plan`,
      icon: Calendar,
      isActive: pathname.startsWith(`/trips/${tripId}/plan`),
    },
    {
      name: 'Money',
      href: `/trips/${tripId}/money`,
      icon: IndianRupee,
      isActive: pathname.startsWith(`/trips/${tripId}/money`),
    },
  ];

  return (
    <div className="border-b border-ash bg-white sticky top-16 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-4 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'flex items-center space-x-2 py-4 px-3 sm:px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-all',
                tab.isActive
                  ? 'border-saffron text-saffron'
                  : 'border-transparent text-slate hover:text-navy hover:border-gray-300'
              )}
            >
              <Icon className={cn('h-4 w-4', tab.isActive ? 'text-saffron' : 'text-slate')} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
