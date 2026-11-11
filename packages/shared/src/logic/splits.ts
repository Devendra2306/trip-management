import type { Expense, ExpenseShare, Settlement, Debt, SimplifiedDebt, SplitType } from '../types';

// ─── Split Calculations ───

/**
 * Calculate equal split shares for an expense.
 * Handles rounding: remainder paise are distributed to the first N users.
 */
export function calculateEqualSplit(
  totalAmount: number,
  userIds: string[]
): { user_id: string; amount: number }[] {
  const n = userIds.length;
  if (n === 0) return [];

  const baseShare = Math.floor(totalAmount / n);
  const remainder = totalAmount - baseShare * n;

  return userIds.map((user_id, i) => ({
    user_id,
    amount: baseShare + (i < remainder ? 1 : 0),
  }));
}

/**
 * Calculate shares based on a "shares" split (e.g., 2:1:1).
 */
export function calculateSharesSplit(
  totalAmount: number,
  shares: { user_id: string; shareCount: number }[]
): { user_id: string; amount: number }[] {
  const totalShares = shares.reduce((acc, s) => acc + s.shareCount, 0);
  if (totalShares === 0) return [];

  let allocated = 0;
  const result = shares.map((s, i) => {
    const isLast = i === shares.length - 1;
    const amount = isLast
      ? totalAmount - allocated
      : Math.floor((totalAmount * s.shareCount) / totalShares);
    allocated += amount;
    return { user_id: s.user_id, amount };
  });

  return result;
}

/**
 * Calculate shares based on percentages.
 * Percentages should sum to 100.
 */
export function calculatePercentageSplit(
  totalAmount: number,
  percentages: { user_id: string; percentage: number }[]
): { user_id: string; amount: number }[] {
  let allocated = 0;
  const result = percentages.map((p, i) => {
    const isLast = i === percentages.length - 1;
    const amount = isLast
      ? totalAmount - allocated
      : Math.round((totalAmount * p.percentage) / 100);
    allocated += amount;
    return { user_id: p.user_id, amount };
  });

  return result;
}

/**
 * Validate that shares sum to the total amount.
 */
export function validateShares(
  totalAmount: number,
  shares: { amount: number }[]
): { valid: boolean; difference: number } {
  const sum = shares.reduce((acc, s) => acc + s.amount, 0);
  return { valid: sum === totalAmount, difference: totalAmount - sum };
}

// ─── Net Balances ───

/**
 * Compute net balance for each user across all expenses and settlements.
 * Positive balance = user is owed money. Negative = user owes money.
 */
export function computeNetBalances(
  expenses: (Expense & { shares: ExpenseShare[] })[],
  settlements: Settlement[]
): Map<string, number> {
  const balances = new Map<string, number>();

  const addBalance = (userId: string, amount: number) => {
    balances.set(userId, (balances.get(userId) ?? 0) + amount);
  };

  // For each expense: payer gets +amount, each share participant gets -share
  for (const expense of expenses) {
    addBalance(expense.paid_by, expense.amount);
    for (const share of expense.shares) {
      addBalance(share.user_id, -share.amount);
    }
  }

  // Settlements: from_user paid to_user, so from gets +, to gets -
  for (const settlement of settlements) {
    addBalance(settlement.from_user, settlement.amount);
    addBalance(settlement.to_user, -settlement.amount);
  }

  return balances;
}

// ─── Debt Simplification ───

/**
 * Simplify debts to minimize the number of transactions.
 *
 * Algorithm: greedy net-balance simplification.
 * 1. Compute net balance for everyone.
 * 2. Split into creditors (positive balance) and debtors (negative balance).
 * 3. Sort both by absolute amount descending.
 * 4. Match the largest creditor with the largest debtor, settle the min of both.
 * 5. Repeat until all settled.
 *
 * This is optimal for minimizing number of transactions when there are no
 * constraints on who can pay whom.
 */
export function simplifyDebts(
  expenses: (Expense & { shares: ExpenseShare[] })[],
  settlements: Settlement[]
): SimplifiedDebt[] {
  const balances = computeNetBalances(expenses, settlements);
  return simplifyFromBalances(balances);
}

/**
 * Core simplification from a balance map.
 * Exported for direct use and testing.
 */
export function simplifyFromBalances(
  balances: Map<string, number>
): SimplifiedDebt[] {
  // Split into creditors and debtors
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, balance] of balances) {
    // Round to avoid floating point noise (we work in paise anyway)
    const rounded = Math.round(balance);
    if (rounded > 0) {
      creditors.push({ id, amount: rounded });
    } else if (rounded < 0) {
      debtors.push({ id, amount: -rounded }); // store as positive
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const result: SimplifiedDebt[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debit = debtors[di];
    const settleAmount = Math.min(credit.amount, debit.amount);

    if (settleAmount > 0) {
      result.push({
        from: debit.id,
        to: credit.id,
        amount: settleAmount,
      });
    }

    credit.amount -= settleAmount;
    debit.amount -= settleAmount;

    if (credit.amount === 0) ci++;
    if (debit.amount === 0) di++;
  }

  return result;
}

/**
 * Generate a UPI intent URL for settle-up payments.
 * Opens the user's installed UPI app (GPay, PhonePe, Paytm, etc.)
 */
export function generateUpiIntentUrl(params: {
  payeeVpa: string; // e.g. "user@upi"
  payeeName: string;
  amount: number; // in rupees (not paise)
  note?: string;
}): string {
  const { payeeVpa, payeeName, amount, note } = params;
  const encode = (val: string) => encodeURIComponent(val).replace(/%20/g, '+');
  const query = [
    `pa=${encode(payeeVpa)}`,
    `pn=${encode(payeeName)}`,
    `am=${encode(amount.toFixed(2))}`,
    'cu=INR',
  ];
  if (note) {
    query.push(`tn=${encode(note)}`);
  }
  return `upi://pay?${query.join('&')}`;
}
