'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, IndianRupee, Receipt, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpenseCard } from '@/components/money/ExpenseCard';
import { AddExpenseModal } from '@/components/money/AddExpenseModal';
import { BalanceSummary } from '@/components/money/BalanceSummary';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { simplifyDebts, type Expense, type TripMember, type Settlement, type SimplifiedDebt } from '@yatra/shared';
import { DEFAULT_USER } from '@/lib/auth';

interface BalanceRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_paid: number;
  total_share: number;
  net_balance: number;
}

export default function TripMoneyPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const [expenses, setExpenses] = useState<(Expense & { shares: any[] })[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebt[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const fetchFinancials = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || DEFAULT_USER.id;
    setCurrentUserId(userId);

    // 1. Fetch trip members
    const { data: memberList } = await supabase
      .from('trip_members')
      .select('*, profile:profiles(*)')
      .eq('trip_id', tripId);

    if (memberList && memberList.length > 0) {
      setMembers(memberList as TripMember[]);
    } else {
      setMembers([
        {
          id: 'temp-member-id',
          trip_id: tripId,
          user_id: userId,
          role: 'organizer',
          joined_at: new Date().toISOString(),
          profile: {
            id: userId,
            email: DEFAULT_USER.email,
            display_name: DEFAULT_USER.display_name,
            avatar_url: null,
            upi_vpa: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      ]);
    }

    // 2. Fetch expenses with shares
    const { data: expList } = await supabase
      .from('expenses')
      .select('*, shares:expense_shares(*, profile:profiles(*))')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    // 3. Fetch settlements
    const { data: setList } = await supabase
      .from('settlements')
      .select('*')
      .eq('trip_id', tripId)
      .order('settled_at', { ascending: false });

    // 4. Fetch balances via RPC
    const { data: balList } = await supabase.rpc('get_trip_balances', {
      p_trip_id: tripId,
    });

    if (expList) setExpenses(expList as (Expense & { shares: any[] })[]);
    if (setList) setSettlements(setList as Settlement[]);
    if (balList) setBalances(balList as BalanceRow[]);

    // 5. Compute simplified debts using algorithm from @yatra/shared
    if (expList) {
      const debts = simplifyDebts(
        (expList as (Expense & { shares: any[] })[]),
        (setList as Settlement[]) || []
      );
      setSimplifiedDebts(debts);
    }

    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    fetchFinancials();

    // Supabase Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-money-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` },
        () => fetchFinancials()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `trip_id=eq.${tripId}` },
        () => fetchFinancials()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchFinancials]);

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    const supabase = createClient();
    await supabase.from('expenses').delete().eq('id', id);
    fetchFinancials();
  };

  const totalSpentPaise = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-8">
      {/* Financial Overview Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border-2 border-brass/40 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-orange-50 text-saffron border border-saffron/20">
            <IndianRupee className="h-8 w-8" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate">
              TOTAL TRIP SPEND
            </span>
            <div className="text-3xl font-black text-navy font-mono">
              {formatCurrency(totalSpentPaise)}
            </div>
            <p className="text-xs text-slate mt-0.5">
              Across {expenses.length} recorded payments
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Button onClick={() => setIsAddExpenseOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Sub-tabs: Expenses vs Settle-Up / Balances */}
      <div className="flex border-b border-ash">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center space-x-2 pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'expenses'
              ? 'border-saffron text-saffron'
              : 'border-transparent text-slate hover:text-coal'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Expenses ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`flex items-center space-x-2 pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'balances'
              ? 'border-saffron text-saffron'
              : 'border-transparent text-slate hover:text-coal'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>Balances & Settle Up ({simplifiedDebts.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-ash animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'expenses' ? (
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-ash/80 p-8 shadow-xs">
              <Receipt className="h-12 w-12 mx-auto text-brass mb-3 opacity-80" />
              <h3 className="font-bold text-navy text-lg">No expenses recorded</h3>
              <p className="text-slate text-sm mt-1 max-w-sm mx-auto mb-6">
                Keep group accounts clean. Log shared meals, station snacks, hotels, or taxi fares.
              </p>
              <Button onClick={() => setIsAddExpenseOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add First Expense
              </Button>
            </div>
          ) : (
            expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                members={members}
                currentUserId={currentUserId}
                onDelete={() => handleDeleteExpense(expense.id)}
              />
            ))
          )}
        </div>
      ) : (
        <BalanceSummary
          balances={balances}
          simplifiedDebts={simplifiedDebts}
          members={members}
          currentUserId={currentUserId}
          onSettlementCreated={fetchFinancials}
          tripId={tripId}
        />
      )}

      {isAddExpenseOpen && (
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          tripId={tripId}
          members={members}
          currentUserId={currentUserId}
          onExpenseAdded={fetchFinancials}
        />
      )}
    </div>
  );
}
