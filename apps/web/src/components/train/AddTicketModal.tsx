'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { addTicketSchema } from '@yatra/shared';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_USER } from '@/lib/auth';

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  onTicketAdded: () => void;
}

export function AddTicketModal({ isOpen, onClose, tripId, onTicketAdded }: AddTicketModalProps) {
  const [formData, setFormData] = useState({
    pnr: '',
    train_number: '',
    train_name: '',
    from_station: '',
    from_station_name: '',
    to_station: '',
    to_station_name: '',
    boarding_date: '',
    journey_class: '3A',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = addTicketSchema.safeParse(formData);
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

      const userId = user?.id || DEFAULT_USER.id;

      const { error } = await supabase.from('tickets').insert({
        trip_id: tripId,
        pnr: formData.pnr,
        train_number: formData.train_number,
        train_name: formData.train_name,
        from_station: formData.from_station.toUpperCase(),
        from_station_name: formData.from_station_name,
        to_station: formData.to_station.toUpperCase(),
        to_station_name: formData.to_station_name,
        boarding_date: formData.boarding_date,
        journey_class: formData.journey_class,
        added_by: userId,
      });

      if (error) throw error;

      onTicketAdded();
      onClose();
      setFormData({
        pnr: '',
        train_number: '',
        train_name: '',
        from_station: '',
        from_station_name: '',
        to_station: '',
        to_station_name: '',
        boarding_date: '',
        journey_class: '3A',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add ticket';
      setErrors({ form: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Train Ticket">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 bg-red-50 border border-red-200 text-rust text-xs rounded-md">
            {errors.form}
          </div>
        )}

        <Input
          label="10-Digit PNR Number"
          placeholder="e.g. 2458910293"
          maxLength={10}
          value={formData.pnr}
          onChange={(e) => setFormData({ ...formData, pnr: e.target.value.replace(/\D/g, '') })}
          error={errors.pnr}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Train Number"
            placeholder="e.g. 12951"
            value={formData.train_number}
            onChange={(e) => setFormData({ ...formData, train_number: e.target.value })}
            error={errors.train_number}
            required
          />
          <Input
            label="Train Name"
            placeholder="e.g. Rajdhani Express"
            value={formData.train_name}
            onChange={(e) => setFormData({ ...formData, train_name: e.target.value })}
            error={errors.train_name}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Origin Station Code"
            placeholder="e.g. NDLS"
            value={formData.from_station}
            onChange={(e) => setFormData({ ...formData, from_station: e.target.value })}
            error={errors.from_station}
            required
          />
          <Input
            label="Origin Station Name"
            placeholder="e.g. New Delhi"
            value={formData.from_station_name}
            onChange={(e) => setFormData({ ...formData, from_station_name: e.target.value })}
            error={errors.from_station_name}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Destination Station Code"
            placeholder="e.g. MMCT"
            value={formData.to_station}
            onChange={(e) => setFormData({ ...formData, to_station: e.target.value })}
            error={errors.to_station}
            required
          />
          <Input
            label="Destination Station Name"
            placeholder="e.g. Mumbai Central"
            value={formData.to_station_name}
            onChange={(e) => setFormData({ ...formData, to_station_name: e.target.value })}
            error={errors.to_station_name}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Boarding Date"
            value={formData.boarding_date}
            onChange={(e) => setFormData({ ...formData, boarding_date: e.target.value })}
            error={errors.boarding_date}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate uppercase tracking-wider mb-1">
              Journey Class
            </label>
            <select
              value={formData.journey_class}
              onChange={(e) => setFormData({ ...formData, journey_class: e.target.value })}
              className="w-full h-10 px-3 border border-ash rounded-md bg-white text-sm text-coal focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              <option value="1A">1A - First AC</option>
              <option value="2A">2A - Second AC</option>
              <option value="3A">3A - Third AC</option>
              <option value="3E">3E - 3 AC Economy</option>
              <option value="SL">SL - Sleeper</option>
              <option value="CC">CC - AC Chair Car</option>
              <option value="EC">EC - Exec Chair Car</option>
              <option value="2S">2S - Second Sitting</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-ash">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Add Ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
}
