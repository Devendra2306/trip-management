'use client';

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, QrCode } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { SettleUpModal } from './SettleUpModal';
import type { SimplifiedDebt, TripMember } from '@yatra/shared';

interface BalanceSummaryProps {
  balances: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    total_paid: number;
    total_share: number;
    net_balance: number;
  }[];
  simplifiedDebts: SimplifiedDebt[];
  members: TripMember[];
  currentUserId: string;
  onSettlementCreated: () => void;
  tripId: string;
}

export function BalanceSummary({
  balances,
  simplifiedDebts,
  members,
  currentUserId,
  onSettlementCreated,
  tripId,
}: BalanceSummaryProps) {
  const [selectedDebt, setSelectedDebt] = useState<SimplifiedDebt | null>(null);

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.profile?.display_name || member?.profile?.email || 'User';
  };

  const getMemberVpa = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.profile?.upi_vpa || 'traveler@upi';
  };

  return (
    <div className="space-y-6">
      {/* Net Balances by Member */}
      <div className="bg-white rounded-xl border border-ash p-6 shadow-sm">
        <h3 className="font-bold text-navy text-base mb-4">Member Net Balances</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {balances.map((b) => {
            const isPositive = b.net_balance > 0;
            const isZero = b.net_balance === 0;

            return (
              <div
                key={b.user_id}
                className="p-4 rounded-xl border border-ash/80 bg-mist/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-coal truncate">
                      {b.display_name || 'Member'}
                    </span>
                    {b.user_id === currentUserId && (
                      <span className="text-[10px] font-mono font-semibold bg-saffron/10 text-saffron px-1.5 py-0.5 rounded">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate space-y-0.5">
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span className="font-mono">{formatCurrency(b.total_paid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Share:</span>
                      <span className="font-mono">{formatCurrency(b.total_share)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-ash/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate">Net:</span>
                  <span
                    className={`font-mono font-black text-sm ${
                      isZero
                        ? 'text-slate'
                        : isPositive
                        ? 'text-forest'
                        : 'text-rust'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {formatCurrency(b.net_balance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simplified Debts / Settle Up */}
      <div className="bg-white rounded-xl border border-brass/50 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-navy text-base">Simplified Settlements</h3>
            <p className="text-xs text-slate">
              Optimal min-transaction settlement path computed by debt simplification.
            </p>
          </div>
          <span className="p-2 rounded-lg bg-cream text-brass font-bold text-xs">
            Algorithm Active
          </span>
        </div>

        {simplifiedDebts.length === 0 ? (
          <div className="text-center py-8 text-forest flex flex-col items-center">
            <CheckCircle2 className="h-10 w-10 mb-2 opacity-80" />
            <span className="font-bold text-sm">All balances are completely settled!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {simplifiedDebts.map((debt, idx) => {
              const isPayer = debt.from === currentUserId;
              const isReceiver = debt.to === currentUserId;

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-ash bg-[#FFFDF8] hover:bg-cream/40 transition-colors gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-sm text-coal">
                      {isPayer ? <span className="text-saffron font-black">You</span> : getMemberName(debt.from)}
                    </span>
                    <div className="flex items-center text-slate">
                      <span className="text-xs font-mono px-2">owes</span>
                      <ArrowRight className="h-4 w-4 text-brass" />
                    </div>
                    <span className="font-bold text-sm text-coal">
                      {isReceiver ? <span className="text-forest font-black">You</span> : getMemberName(debt.to)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <span className="font-mono text-base font-black text-navy">
                      {formatCurrency(debt.amount)}
                    </span>

                    <Button
                      size="sm"
                      variant={isPayer ? 'primary' : 'outline'}
                      onClick={() => setSelectedDebt(debt)}
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1" />
                      Settle via UPI
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDebt && (
        <SettleUpModal
          isOpen={!!selectedDebt}
          onClose={() => setSelectedDebt(null)}
          debt={selectedDebt}
          payerName={getMemberName(selectedDebt.from)}
          receiverName={getMemberName(selectedDebt.to)}
          payeeVpa={getMemberVpa(selectedDebt.to)}
          tripId={tripId}
          onSettled={() => {
            setSelectedDebt(null);
            onSettlementCreated();
          }}
        />
      )}
    </div>
  );
}
