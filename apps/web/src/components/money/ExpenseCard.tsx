'use client';

import React from 'react';
import { Utensils, Car, BedDouble, Ticket, ShoppingBag, Compass, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Expense, ExpenseCategory, TripMember } from '@yatra/shared';

interface ExpenseCardProps {
  expense: Expense;
  members: TripMember[];
  currentUserId?: string;
  onDelete?: () => void;
}

const categoryIcons: Record<ExpenseCategory, React.ReactNode> = {
  food: <Utensils className="h-4 w-4 text-amber-600" />,
  transport: <Car className="h-4 w-4 text-blue-600" />,
  stay: <BedDouble className="h-4 w-4 text-purple-600" />,
  tickets: <Ticket className="h-4 w-4 text-red-600" />,
  shopping: <ShoppingBag className="h-4 w-4 text-pink-600" />,
  activities: <Compass className="h-4 w-4 text-emerald-600" />,
  other: <MoreHorizontal className="h-4 w-4 text-slate" />,
};

export function ExpenseCard({ expense, members, currentUserId, onDelete }: ExpenseCardProps) {
  const payer = members.find((m) => m.user_id === expense.paid_by);
  const payerName = payer?.profile?.display_name || payer?.profile?.email || 'Unknown';
  const isPaidByMe = currentUserId === expense.paid_by;
  const isCreatedByMe = currentUserId === expense.created_by;

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-ash/80 hover:border-ash shadow-sm transition-all">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-mist border border-ash/60">
          {categoryIcons[expense.category] || categoryIcons.other}
        </div>
        <div>
          <h4 className="font-bold text-coal text-sm">{expense.title}</h4>
          <p className="text-xs text-slate">
            Paid by <span className="font-semibold text-navy">{isPaidByMe ? 'You' : payerName}</span> •{' '}
            {formatDate(expense.created_at)}
          </p>
          <span className="inline-block mt-1 text-[10px] font-mono uppercase bg-ash/50 text-slate px-1.5 py-0.5 rounded">
            Split: {expense.split_type}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-base font-black text-navy font-mono">
            {formatCurrency(expense.amount)}
          </div>
          <div className="text-[11px] text-slate">
            {expense.shares?.length || 0} participants
          </div>
        </div>

        {isCreatedByMe && onDelete && (
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-rust transition-colors p-1"
            title="Delete expense"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
