'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, ArrowRight, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

const REQUIRED_PIN = '7977303911';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'auth_failed') {
      setError('Google authentication failed or was cancelled. Please try again or use the PIN below.');
    }
  }, [searchParams]);

  const grantPinAccess = () => {
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

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim().replace(/\s+/g, '');
    if (cleanPin === REQUIRED_PIN) {
      grantPinAccess();
    } else {
      setError('Incorrect security PIN. Please enter 7977303911.');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (authError) throw authError;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('Unsupported provider') ||
        msg.includes('provider is not enabled') ||
        msg.includes('validation_failed')
      ) {
        setError(
          'Google Provider is not enabled in your Supabase Dashboard yet. You can sign in immediately using the direct PIN (7977303911) below!'
        );
      } else {
        setError(msg);
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border-2 border-brass/50 shadow-xl overflow-hidden">
      {/* Header bar */}
      <div className="bg-navy p-8 text-center text-white relative">
        <div className="inline-flex p-3 rounded-xl bg-saffron text-white mb-3 shadow-md">
          <KeyRound className="h-8 w-8" />
        </div>
        <h1 className="font-mono text-2xl font-black tracking-wider">JAL KHOJ</h1>
        <p className="text-xs font-mono text-brass uppercase tracking-widest mt-1">
          SECURE ACCESS PORTAL
        </p>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-bold text-navy">Sign In to Jal Khoj</h2>
          <p className="text-xs text-slate mt-1">
            Choose your preferred sign-in method: Google Account or Direct PIN.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-rust text-xs rounded-xl flex items-start space-x-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Option 1: Continue with Google */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full h-12 flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 text-navy border-2 border-ash rounded-xl font-bold text-sm shadow-sm transition-all hover:border-slate-400 disabled:opacity-60"
          >
            {googleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-navy" />
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-ash w-full" />
          <span className="bg-white px-3 text-[11px] font-mono font-bold uppercase tracking-wider text-slate shrink-0">
            OR USE DIRECT PIN
          </span>
          <div className="border-t border-ash w-full" />
        </div>

        {/* Option 2: PIN Form */}
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-widest text-slate mb-1 text-center">
              ENTER PIN (7977303911)
            </label>
            <input
              type="text"
              maxLength={10}
              placeholder="7977303911"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
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
            onClick={grantPinAccess}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-forest border border-emerald-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>One-Click Instant Access (PIN: 7977303911)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="p-8 text-center text-slate">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saffron mx-auto mb-2" />
            <p className="font-mono text-xs">Loading Secure Portal...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
