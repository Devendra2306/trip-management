import Link from 'next/link';
import { Train, Ticket, Users, IndianRupee, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF8] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-ash bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-saffron text-white shadow-sm">
              <Train className="h-5 w-5" />
            </div>
            <span className="font-mono text-xl font-black text-navy tracking-wider">JAL KHOJ</span>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-saffron/10 border border-saffron/30 text-saffron text-xs font-mono font-bold uppercase tracking-wider mb-6">
            <span>🚂 Built for Indian Railways Group Journeys</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-navy tracking-tight max-w-4xl mx-auto">
            Travel together, track live PNRs, and split every rupee easily.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate max-w-2xl mx-auto">
            Yatra brings your train group trips into one shared space. Realtime PNR waitlist alerts, organizer-guided day plans, and automated debt-simplification with instant UPI settle up.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto shadow-md">
                Start a Trip
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Join via Invite Code
              </Button>
            </Link>
          </div>

          {/* 4 Core Pillars Grid */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-white border border-ash shadow-sm">
              <div className="p-3 w-fit rounded-xl bg-orange-50 text-saffron mb-4">
                <Ticket className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-navy text-lg mb-2">Live PNR Tracking</h3>
              <p className="text-sm text-slate">
                Server-driven background polling that speeds up before chart preparation. Instant alerts on WL & RAC upgrades.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-ash shadow-sm">
              <div className="p-3 w-fit rounded-xl bg-blue-50 text-blue-600 mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-navy text-lg mb-2">Shared Itinerary</h3>
              <p className="text-sm text-slate">
                Day-by-day plan managed by trip organizers. Stays, local sightseeing, taxi transfers, and station meetups.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-ash shadow-sm">
              <div className="p-3 w-fit rounded-xl bg-emerald-50 text-forest mb-4">
                <IndianRupee className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-navy text-lg mb-2">Smart Expense Split</h3>
              <p className="text-sm text-slate">
                Split equally, by exact amount, or custom shares. Minimizes settlement transfers using graph debt simplification.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-ash shadow-sm">
              <div className="p-3 w-fit rounded-xl bg-purple-50 text-purple-600 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-navy text-lg mb-2">Instant UPI Settle Up</h3>
              <p className="text-sm text-slate">
                Direct UPI intent links open installed UPI apps (GPay, PhonePe, Paytm) pre-filled with VPA, payee, and exact rupees.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ash py-8 bg-white text-center text-xs text-slate">
        <p>© 2026 Jal Khoj Travel Technologies. Built with Next.js, Expo, and Supabase.</p>
      </footer>
    </div>
  );
}
