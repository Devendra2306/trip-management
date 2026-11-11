'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { HARDCODED_PIN } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'auth' (Google / Email) or 'pin' (Direct secret PIN)
  const [activeTab, setActiveTab] = useState<'email' | 'pin'>('pin');
  const [isSignUp, setIsSignUp] = useState(false);

  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // PIN state (secret, masked)
  const [pin, setPin] = useState('');

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'auth_failed') {
      setError('Authentication failed. Please try again or use your Security PIN.');
    }
  }, [searchParams]);

  // 1. Google OAuth
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    setSuccessMessage(null);
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
          'Google Provider is not enabled in your Supabase project yet. You can sign in using your Email & Password or Security PIN.'
        );
      } else {
        setError(msg);
      }
      setGoogleLoading(false);
    }
  };

  // 2. Email & Password Sign In / Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            },
          },
        });

        if (signUpErr) throw signUpErr;

        if (data.session) {
          // Cookie for middleware
          document.cookie = `jalkhoj_pin=${HARDCODED_PIN}; path=/; max-age=31536000; SameSite=Lax`;
          router.push('/trips');
          router.refresh();
        } else {
          setSuccessMessage(
            'Account created! Please check your email inbox to confirm your registration, or sign in if confirmation is disabled.'
          );
          setIsSignUp(false);
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInErr) throw signInErr;

        // Set persistent cookie
        document.cookie = `jalkhoj_pin=${HARDCODED_PIN}; path=/; max-age=31536000; SameSite=Lax`;
        router.push('/trips');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // 3. Secret PIN Access (PIN is never revealed on screen)
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanPin = pin.trim().replace(/\s+/g, '');
    if (cleanPin === HARDCODED_PIN) {
      // Set cookie for Next.js middleware (valid for 1 year)
      document.cookie = `jalkhoj_pin=${HARDCODED_PIN}; path=/; max-age=31536000; SameSite=Lax`;
      try {
        localStorage.setItem('jalkhoj_pin', HARDCODED_PIN);
      } catch {}

      router.push('/trips');
      router.refresh();
    } else {
      setError('Invalid security PIN. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border-2 border-brass/50 shadow-xl overflow-hidden">
      {/* Header bar */}
      <div className="bg-navy p-7 text-center text-white relative">
        <div className="inline-flex p-3 rounded-xl bg-saffron text-white mb-2.5 shadow-md">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="font-mono text-2xl font-black tracking-wider">JAL KHOJ</h1>
        <p className="text-[11px] font-mono text-brass uppercase tracking-widest mt-0.5">
          JOURNEY & EXPENSE SYSTEM
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ash bg-mist/50">
        <button
          type="button"
          onClick={() => {
            setActiveTab('pin');
            setError(null);
          }}
          className={`flex-1 py-3 text-xs font-mono font-bold tracking-wider uppercase transition-colors ${
            activeTab === 'pin'
              ? 'bg-white text-navy border-b-2 border-saffron shadow-sm'
              : 'text-slate hover:text-navy'
          }`}
        >
          <span className="flex items-center justify-center space-x-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>Security PIN</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('email');
            setError(null);
          }}
          className={`flex-1 py-3 text-xs font-mono font-bold tracking-wider uppercase transition-colors ${
            activeTab === 'email'
              ? 'bg-white text-navy border-b-2 border-saffron shadow-sm'
              : 'text-slate hover:text-navy'
          }`}
        >
          <span className="flex items-center justify-center space-x-1.5">
            <Mail className="h-3.5 w-3.5" />
            <span>Email & Google</span>
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="p-7 space-y-5">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-rust text-xs rounded-xl flex items-start space-x-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-forest text-xs rounded-xl flex items-start space-x-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMessage}</span>
          </div>
        )}

        {/* TAB 1: PIN ACCESS (Masked, Secret) */}
        {activeTab === 'pin' && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="text-center">
              <h2 className="text-base font-bold text-navy">Enter Security PIN</h2>
              <p className="text-xs text-slate mt-0.5">
                Authorized access only. Enter your private PIN to unlock the app.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-widest text-slate mb-1.5 text-center">
                SECURITY PIN
              </label>
              <input
                type="password"
                maxLength={10}
                placeholder="••••••••••"
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
        )}

        {/* TAB 2: EMAIL & GOOGLE AUTH */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full h-11 flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 text-navy border-2 border-ash rounded-xl font-bold text-xs shadow-sm transition-all hover:border-slate-400 disabled:opacity-60"
            >
              {googleLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-navy" />
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
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

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-ash w-full" />
              <span className="bg-white px-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate shrink-0">
                OR WITH EMAIL
              </span>
              <div className="border-t border-ash w-full" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <Input
                label="Email Address"
                type="email"
                placeholder="traveler@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" size="md" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-saffron hover:text-saffron-dark font-semibold transition-colors"
                >
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          </div>
        )}
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
