'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Train, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createTripSchema, generateInviteCode } from '@yatra/shared';
import { createClient } from '@/lib/supabase/client';

export default function NewTripPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
    };

    const result = createTripSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const inviteCode = generateInviteCode();

      // 1. Insert trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: payload.name,
          description: payload.description,
          start_date: payload.start_date,
          end_date: payload.end_date,
          invite_code: inviteCode,
          created_by: user.id,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // 2. Insert creator as organizer in trip_members
      const { error: memberError } = await supabase.from('trip_members').insert({
        trip_id: trip.id,
        user_id: user.id,
        role: 'organizer',
      });

      if (memberError) throw memberError;

      router.push(`/trips/${trip.id}`);
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to create trip' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chalk">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/trips"
          className="inline-flex items-center text-xs font-semibold text-slate hover:text-navy mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to all trips
        </Link>

        <div className="bg-white rounded-2xl border-2 border-brass/40 shadow-sm p-6 sm:p-8">
          <div className="flex items-center space-x-3 pb-6 mb-6 border-b border-ash">
            <div className="p-3 rounded-xl bg-saffron text-white shadow-sm">
              <Train className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-navy tracking-tight">Create a New Trip</h1>
              <p className="text-xs text-slate">
                Generate an invite code and start adding train tickets, members, and plans.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form && (
              <div className="p-3 bg-red-50 border border-red-200 text-rust text-xs rounded-md">
                {errors.form}
              </div>
            )}

            <Input
              label="Trip Name"
              placeholder="e.g. Varanasi Ghats & Kashi Vishwanath"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              required
            />

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate uppercase tracking-wider">
                Trip Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="What is this journey about? Route, dates, purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-ash bg-white px-3 py-2 text-sm text-coal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-saffron"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Start Date (Optional)"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                error={errors.start_date}
              />
              <Input
                type="date"
                label="End Date (Optional)"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                error={errors.end_date}
              />
            </div>

            <div className="pt-6 border-t border-ash flex items-center justify-end space-x-3">
              <Link href="/trips">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" isLoading={loading}>
                Create Journey
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
