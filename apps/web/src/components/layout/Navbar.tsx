'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Train, LogOut, Compass } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-navy text-white border-b border-navy-dark shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/trips" className="flex items-center space-x-3 group">
          <div className="p-2 rounded-lg bg-saffron text-white shadow-sm group-hover:scale-105 transition-transform">
            <Train className="h-5 w-5" />
          </div>
          <div>
            <span className="font-mono text-lg font-black tracking-wider text-white">JAL KHOJ</span>
            <span className="text-[10px] block font-mono text-brass tracking-widest uppercase">
              JOURNEY & EXPENSES
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          <Link href="/trips">
            <Button variant="ghost" size="sm" className="text-white hover:bg-navy-light">
              <Compass className="h-4 w-4 mr-1.5" />
              My Trips
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-gray-300 hover:text-white hover:bg-navy-light"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
