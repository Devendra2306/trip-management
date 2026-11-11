'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Train, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export default function JoinTripPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);

  useEffect(() => {
    async function join() {
      if (!code) return;
      setLoading(true);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login, but keep the return path
        router.push(`/login?next=/join/${code}`);
        return;
      }

      try {
        const { data: joinedTripId, error: joinErr } = await supabase.rpc('join_trip_by_code', {
          code,
        });

        if (joinErr) throw joinErr;

        setTripId(joinedTripId);
        router.push(`/trips/${joinedTripId}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid invite code or unable to join');
        setLoading(false);
      }
    }

    join();
  }, [code, router]);

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border-2 border-brass/50 shadow-xl p-8 text-center space-y-6">
        <div className="p-4 rounded-xl bg-saffron text-white w-fit mx-auto shadow-md">
          <Train className="h-8 w-8" />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate block mb-1">
            YATRA JOURNEY INVITE
          </span>
          <h1 className="text-2xl font-black text-navy">Joining Trip {code}</h1>
        </div>

        {loading && (
          <div className="py-6 flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saffron" />
            <p className="text-xs text-slate font-mono">Validating invite pass...</p>
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 text-rust text-xs rounded-md">
              {error}
            </div>
            <Button onClick={() => router.push('/trips')} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
