'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const REQUIRED_PIN = '7977303911';

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const grantAccess = () => {
    // Set cookie for Next.js middleware (valid for 1 year)
    document.cookie = `jalkhoj_pin=${REQUIRED_PIN}; path=/; max-age=31536000; SameSite=Lax`;
    // Also save in localStorage
    try {
      localStorage.setItem('jalkhoj_pin', REQUIRED_PIN);
    } catch {}
    // Instant redirect
    router.push('/trips');
    router.refresh();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim().replace(/\s+/g, '');
    if (cleanPin === REQUIRED_PIN) {
      grantAccess();
    } else {
      setError('Incorrect security PIN. Please enter 7977303911.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border-2 border-brass/50 shadow-xl overflow-hidden">
        {/* Header bar */}
        <div className="bg-navy p-8 text-center text-white relative">
          <div className="inline-flex p-3 rounded-xl bg-saffron text-white mb-3 shadow-md">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="font-mono text-2xl font-black tracking-wider">JAL KHOJ</h1>
          <p className="text-xs font-mono text-brass uppercase tracking-widest mt-1">
            DIRECT PIN ACCESS
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-navy">Enter Security PIN</h2>
            <p className="text-xs text-slate mt-1">
              Direct access mode enabled. Enter the authorization PIN to unlock the entire application.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-rust text-xs rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-widest text-slate mb-1 text-center">
                ACCESS PIN
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="7977303911"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
                className="w-full h-12 text-center font-mono text-2xl tracking-widest font-black text-navy bg-mist/50 border-2 border-ash rounded-xl focus:border-saffron focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Unlock Jal Khoj
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          {/* Instant 1-Click Access Button */}
          <div className="pt-2 border-t border-ash/80">
            <button
              type="button"
              onClick={grantAccess}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-forest border border-emerald-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>One-Click Instant Access (PIN: 7977303911)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
