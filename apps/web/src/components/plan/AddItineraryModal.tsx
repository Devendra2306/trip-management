'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createItineraryItemSchema, type ItineraryItemType } from '@yatra/shared';
import { createClient } from '@/lib/supabase/client';

interface AddItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  onItemAdded: () => void;
}

export function AddItineraryModal({ isOpen, onClose, tripId, onItemAdded }: AddItineraryModalProps) {
  const [dayNumber, setDayNumber] = useState(1);
  const [type, setType] = useState<ItineraryItemType>('activity');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      day_number: Number(dayNumber),
      order_index: 0,
      type,
      title,
      description: description || null,
      start_time: startTime || null,
      end_time: endTime || null,
      location: location || null,
    };

    const result = createItineraryItemSchema.safeParse(payload);
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

      const { error } = await supabase.from('itinerary_items').insert({
        trip_id: tripId,
        day_number: payload.day_number,
        order_index: 0,
        type: payload.type,
        title: payload.title,
        description: payload.description,
        start_time: payload.start_time,
        end_time: payload.end_time,
        location: payload.location,
        created_by: user.id,
      });

      if (error) throw error;

      onItemAdded();
      onClose();
      setTitle('');
      setDescription('');
      setLocation('');
      setStartTime('');
      setEndTime('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add itinerary event';
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Itinerary Item (Organizer Only)">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 bg-red-50 border border-red-200 text-rust text-xs rounded-md">
            {errors.form}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={1}
            label="Day Number"
            value={dayNumber}
            onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
            error={errors.day_number}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ItineraryItemType)}
              className="w-full h-10 px-3 border border-ash rounded-md bg-white text-sm text-coal focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              <option value="travel">Travel (Train, Flight, Taxi)</option>
              <option value="stay">Stay / Check-in</option>
              <option value="activity">Activity / Sightseeing</option>
              <option value="meal">Meal / Dining</option>
              <option value="note">Note / Reminder</option>
            </select>
          </div>
        </div>

        <Input
          label="Title"
          placeholder="e.g. Check into Hotel or Evening Boat Ride"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="time"
            label="Start Time (Optional)"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            error={errors.start_time}
          />
          <Input
            type="time"
            label="End Time (Optional)"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            error={errors.end_time}
          />
        </div>

        <Input
          label="Location (Optional)"
          placeholder="e.g. Dasaswamedh Ghat"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          error={errors.location}
        />

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate uppercase tracking-wider">
            Notes / Details (Optional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, booking references, or tips..."
            className="w-full rounded-md border border-ash bg-white px-3 py-2 text-sm text-coal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-saffron"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-ash">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Save Plan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
