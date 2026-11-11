'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { generateUpiIntentUrl, type SimplifiedDebt } from '@yatra/shared';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Smartphone, CheckCircle, ExternalLink } from 'lucide-react';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: SimplifiedDebt;
  payerName: string;
  receiverName: string;
  payeeVpa: string;
  tripId: string;
  onSettled: () => void;
}

export function SettleUpModal({
  isOpen,
  onClose,
  debt,
  payerName,
  receiverName,
  payeeVpa,
  tripId,
  onSettled,
}: SettleUpModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountRupees = debt.amount / 100;
  const upiUrl = generateUpiIntentUrl({
    payeeVpa,
    payeeName: receiverName,
    amount: amountRupees,
    note: `Yatra trip settlement to ${receiverName}`,
  });

  const handleRecordSettlement = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from('settlements').insert({
        trip_id: tripId,
        from_user: debt.from,
        to_user: debt.to,
        amount: debt.amount,
        note: 'UPI Payment',
      });

      if (insertError) throw insertError;

      onSettled();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settle via UPI">
      <div className="space-y-6 text-center">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-rust text-xs rounded-md">
            {error}
          </div>
        )}

        <div className="p-4 bg-mist/60 rounded-xl border border-ash/80">
          <span className="text-xs font-mono uppercase tracking-widest text-slate block mb-1">
            Settlement Amount
          </span>
          <div className="text-3xl font-black text-navy font-mono">
            {formatCurrency(debt.amount)}
          </div>
          <p className="text-xs text-slate mt-2">
            <span className="font-semibold text-coal">{payerName}</span> pays{' '}
            <span className="font-semibold text-coal">{receiverName}</span>
          </p>
        </div>

        {/* Pay via installed UPI app */}
        <div className="space-y-3">
          <a
            href={upiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center h-12 px-6 rounded-lg bg-forest text-white font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md"
          >
            <Smartphone className="h-5 w-5 mr-2" />
            Open UPI App (GPay / PhonePe / Paytm)
            <ExternalLink className="h-4 w-4 ml-1.5 opacity-70" />
          </a>
          <p className="text-[11px] text-slate">
            UPI VPA: <span className="font-mono font-medium">{payeeVpa}</span>
          </p>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-ash" />
          <span className="flex-shrink mx-4 text-xs text-slate font-mono uppercase">
            After Payment
          </span>
          <div className="flex-grow border-t border-ash" />
        </div>

        {/* Mark as Settled in Supabase */}
        <div className="space-y-2">
          <Button
            onClick={handleRecordSettlement}
            isLoading={loading}
            variant="primary"
            className="w-full"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Record Payment as Settled
          </Button>
          <p className="text-[11px] text-slate">
            This updates the trip balance and marks this transfer as completed for all members.
          </p>
        </div>
      </div>
    </Modal>
  );
}
