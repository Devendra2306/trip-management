'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Train, Mail, ArrowRight, CheckCircle2, Lock, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAuthError = (err: unknown): string => {
    if (!err) return 'Authentication failed';
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Unsupported provider') || message.includes('provider is not enabled')) {
      return 'That provider is not enabled in your Supabase project. In your Supabase Dashboard, go to Authentication > Providers to enable it, or sign in using Email & Password below.';
    }
    return message;
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (isSignUp) {
        // Sign up
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpErr) throw signUpErr;

        if (data.session) {
          router.push('/trips');
          router.refresh();
        } else {
          setSignUpSuccess(true);
        }
      } else {
        // Sign in
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;

        router.push('/trips');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;
      setMagicLinkSent(true);
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
    } catch (err: unknown) {
      setError(formatAuthError(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border-2 border-brass/50 shadow-xl overflow-hidden">
        {/* Header bar */}
        <div className="bg-navy p-8 text-center text-white relative">
          <div className="inline-flex p-3 rounded-xl bg-saffron text-white mb-3 shadow-md">
            <Train className="h-8 w-8" />
          </div>
          <h1 className="font-mono text-2xl font-black tracking-wider">JAL KHOJ</h1>
          <p className="text-xs font-mono text-brass uppercase tracking-widest mt-1">
            BOARDING PASS LOGIN
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {magicLinkSent ? (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex p-3 rounded-full bg-green-50 text-forest">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-lg font-bold text-navy">Check your email</h2>
              <p className="text-sm text-slate">
                We sent a secure magic login link to <br />
                <span className="font-semibold text-coal font-mono">{email}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMagicLinkSent(false)}
                className="mt-4"
              >
                Use a different email
              </Button>
            </div>
          ) : signUpSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex p-3 rounded-full bg-green-50 text-forest">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-lg font-bold text-navy">Account Created!</h2>
              <p className="text-sm text-slate">
                Please check your email to confirm your account (or sign in below if email confirmations are disabled).
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSignUpSuccess(false);
                  setIsSignUp(false);
                }}
                className="mt-4"
              >
                Sign In Now
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-rust text-xs rounded-lg flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center h-11 px-4 border border-ash rounded-lg bg-white hover:bg-mist text-coal font-medium text-sm transition-all shadow-xs"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
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
                Continue with Google
              </button>

              {/* Mode Switcher */}
              <div className="flex rounded-lg bg-mist p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuthMode('password')}
                  className={`flex-1 py-1.5 rounded-md transition-all ${
                    authMode === 'password'
                      ? 'bg-white text-navy shadow-xs'
                      : 'text-slate hover:text-navy'
                  }`}
                >
                  Email & Password
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('magic_link')}
                  className={`flex-1 py-1.5 rounded-md transition-all ${
                    authMode === 'magic_link'
                      ? 'bg-white text-navy shadow-xs'
                      : 'text-slate hover:text-navy'
                  }`}
                >
                  Magic Link
                </button>
              </div>

              {authMode === 'password' ? (
                /* Email & Password Form */
                <form onSubmit={handlePasswordAuth} className="space-y-4">
                  <Input
                    type="email"
                    label="Email Address"
                    placeholder="traveler@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />

                  <Button type="submit" isLoading={loading} className="w-full">
                    {isSignUp ? (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Account
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-xs text-saffron font-bold hover:underline"
                    >
                      {isSignUp
                        ? 'Already have an account? Sign In'
                        : "Don't have an account? Create one"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Magic Link Form */
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <Input
                    type="email"
                    label="Email Address"
                    placeholder="traveler@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" isLoading={loading} className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Magic Link
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
