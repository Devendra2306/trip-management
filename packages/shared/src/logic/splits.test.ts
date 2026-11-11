import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplit,
  calculateSharesSplit,
  calculatePercentageSplit,
  validateShares,
  computeNetBalances,
  simplifyFromBalances,
  simplifyDebts,
  generateUpiIntentUrl,
} from './splits';
import type { Expense, ExpenseShare, Settlement } from '../types';

describe('calculateEqualSplit', () => {
  it('splits evenly among users', () => {
    const result = calculateEqualSplit(3000, ['a', 'b', 'c']);
    expect(result).toEqual([
      { user_id: 'a', amount: 1000 },
      { user_id: 'b', amount: 1000 },
      { user_id: 'c', amount: 1000 },
    ]);
  });

  it('distributes remainder paise to first users', () => {
    const result = calculateEqualSplit(1000, ['a', 'b', 'c']);
    // 1000 / 3 = 333 remainder 1
    expect(result).toEqual([
      { user_id: 'a', amount: 334 },
      { user_id: 'b', amount: 333 },
      { user_id: 'c', amount: 333 },
    ]);
    expect(result.reduce((s, r) => s + r.amount, 0)).toBe(1000);
  });

  it('handles single user', () => {
    const result = calculateEqualSplit(5000, ['a']);
    expect(result).toEqual([{ user_id: 'a', amount: 5000 }]);
  });

  it('returns empty for no users', () => {
    expect(calculateEqualSplit(5000, [])).toEqual([]);
  });

  it('handles 2 paise remainder across 3 users', () => {
    const result = calculateEqualSplit(1001, ['a', 'b', 'c']);
    // 1001 / 3 = 333 remainder 2
    expect(result[0].amount).toBe(334);
    expect(result[1].amount).toBe(334);
    expect(result[2].amount).toBe(333);
    expect(result.reduce((s, r) => s + r.amount, 0)).toBe(1001);
  });
});

describe('calculateSharesSplit', () => {
  it('splits proportionally by shares', () => {
    const result = calculateSharesSplit(10000, [
      { user_id: 'a', shareCount: 2 },
      { user_id: 'b', shareCount: 1 },
      { user_id: 'c', shareCount: 1 },
    ]);
    expect(result[0].amount).toBe(5000);
    expect(result[1].amount).toBe(2500);
    expect(result[2].amount).toBe(2500);
    expect(result.reduce((s, r) => s + r.amount, 0)).toBe(10000);
  });

  it('handles rounding with last-user correction', () => {
    const result = calculateSharesSplit(1000, [
      { user_id: 'a', shareCount: 1 },
      { user_id: 'b', shareCount: 1 },
      { user_id: 'c', shareCount: 1 },
    ]);
    expect(result.reduce((s, r) => s + r.amount, 0)).toBe(1000);
  });

  it('returns empty for zero total shares', () => {
    expect(
      calculateSharesSplit(1000, [
        { user_id: 'a', shareCount: 0 },
        { user_id: 'b', shareCount: 0 },
      ])
    ).toEqual([]);
  });
});

describe('calculatePercentageSplit', () => {
  it('splits by percentage', () => {
    const result = calculatePercentageSplit(10000, [
      { user_id: 'a', percentage: 50 },
      { user_id: 'b', percentage: 30 },
      { user_id: 'c', percentage: 20 },
    ]);
    expect(result).toEqual([
      { user_id: 'a', amount: 5000 },
      { user_id: 'b', amount: 3000 },
      { user_id: 'c', amount: 2000 },
    ]);
  });

  it('last user absorbs rounding error', () => {
    const result = calculatePercentageSplit(1000, [
      { user_id: 'a', percentage: 33 },
      { user_id: 'b', percentage: 33 },
      { user_id: 'c', percentage: 34 },
    ]);
    expect(result.reduce((s, r) => s + r.amount, 0)).toBe(1000);
  });
});

describe('validateShares', () => {
  it('returns valid when shares sum to total', () => {
    expect(validateShares(1000, [{ amount: 500 }, { amount: 500 }])).toEqual({
      valid: true,
      difference: 0,
    });
  });

  it('returns invalid with positive difference when under', () => {
    expect(validateShares(1000, [{ amount: 400 }, { amount: 400 }])).toEqual({
      valid: false,
      difference: 200,
    });
  });
});

describe('computeNetBalances', () => {
  it('computes correct balances for a simple case', () => {
    const expenses = [
      {
        id: '1',
        trip_id: 't',
        title: 'Lunch',
        amount: 3000,
        currency: 'INR',
        category: 'food' as const,
        paid_by: 'alice',
        split_type: 'equal' as const,
        created_by: 'alice',
        created_at: '',
        updated_at: '',
        shares: [
          { id: 's1', expense_id: '1', user_id: 'alice', amount: 1000 },
          { id: 's2', expense_id: '1', user_id: 'bob', amount: 1000 },
          { id: 's3', expense_id: '1', user_id: 'carol', amount: 1000 },
        ],
      },
    ];

    const balances = computeNetBalances(expenses, []);
    // Alice paid 3000, owes 1000 → net +2000
    expect(balances.get('alice')).toBe(2000);
    // Bob paid 0, owes 1000 → net -1000
    expect(balances.get('bob')).toBe(-1000);
    expect(balances.get('carol')).toBe(-1000);
  });

  it('accounts for settlements', () => {
    const expenses = [
      {
        id: '1',
        trip_id: 't',
        title: 'Dinner',
        amount: 2000,
        currency: 'INR',
        category: 'food' as const,
        paid_by: 'alice',
        split_type: 'equal' as const,
        created_by: 'alice',
        created_at: '',
        updated_at: '',
        shares: [
          { id: 's1', expense_id: '1', user_id: 'alice', amount: 1000 },
          { id: 's2', expense_id: '1', user_id: 'bob', amount: 1000 },
        ],
      },
    ];

    const settlements: Settlement[] = [
      {
        id: 'st1',
        trip_id: 't',
        from_user: 'bob',
        to_user: 'alice',
        amount: 500,
        settled_at: '',
        note: null,
        created_at: '',
      },
    ];

    const balances = computeNetBalances(expenses, settlements);
    // Alice: +2000 - 1000 (own share) - 500 (received settlement) = +500
    expect(balances.get('alice')).toBe(500);
    // Bob: -1000 + 500 (paid settlement) = -500
    expect(balances.get('bob')).toBe(-500);
  });
});

describe('simplifyFromBalances', () => {
  it('simplifies a simple triangle into two payments', () => {
    const balances = new Map<string, number>();
    // Alice is owed 2000, Bob owes 1000, Carol owes 1000
    balances.set('alice', 2000);
    balances.set('bob', -1000);
    balances.set('carol', -1000);

    const result = simplifyFromBalances(balances);
    expect(result.length).toBe(2);

    const totalToAlice = result
      .filter((d) => d.to === 'alice')
      .reduce((s, d) => s + d.amount, 0);
    expect(totalToAlice).toBe(2000);
  });

  it('simplifies complex debts to minimal transactions', () => {
    const balances = new Map<string, number>();
    // A is owed 5000, B owes 3000, C owes 1000, D owes 1000
    balances.set('a', 5000);
    balances.set('b', -3000);
    balances.set('c', -1000);
    balances.set('d', -1000);

    const result = simplifyFromBalances(balances);
    // Should produce 3 transactions max
    expect(result.length).toBeLessThanOrEqual(3);

    // Net flow to A should be 5000
    const netToA = result
      .filter((d) => d.to === 'a')
      .reduce((s, d) => s + d.amount, 0);
    expect(netToA).toBe(5000);
  });

  it('handles already settled (all zero) balances', () => {
    const balances = new Map<string, number>();
    balances.set('a', 0);
    balances.set('b', 0);

    const result = simplifyFromBalances(balances);
    expect(result).toEqual([]);
  });

  it('handles two-person case', () => {
    const balances = new Map<string, number>();
    balances.set('a', 500);
    balances.set('b', -500);

    const result = simplifyFromBalances(balances);
    expect(result).toEqual([{ from: 'b', to: 'a', amount: 500 }]);
  });

  it('handles complex 5-person scenario', () => {
    const balances = new Map<string, number>();
    balances.set('a', 3000); // owed 3000
    balances.set('b', 2000); // owed 2000
    balances.set('c', -2000); // owes 2000
    balances.set('d', -1500); // owes 1500
    balances.set('e', -1500); // owes 1500

    const result = simplifyFromBalances(balances);

    // Verify conservation: total paid out = total received
    const totalOut = result.reduce((s, d) => s + d.amount, 0);
    const totalOwed = 5000;
    // Each person should end up at 0
    const finalBalances = new Map<string, number>(balances);
    for (const d of result) {
      finalBalances.set(d.from, (finalBalances.get(d.from) ?? 0) + d.amount);
      finalBalances.set(d.to, (finalBalances.get(d.to) ?? 0) - d.amount);
    }
    for (const [, v] of finalBalances) {
      expect(v).toBe(0);
    }
  });
});

describe('simplifyDebts (integration)', () => {
  it('works end-to-end with expenses and settlements', () => {
    const expenses = [
      {
        id: '1',
        trip_id: 't',
        title: 'Hotel',
        amount: 9000,
        currency: 'INR',
        category: 'stay' as const,
        paid_by: 'alice',
        split_type: 'equal' as const,
        created_by: 'alice',
        created_at: '',
        updated_at: '',
        shares: [
          { id: 's1', expense_id: '1', user_id: 'alice', amount: 3000 },
          { id: 's2', expense_id: '1', user_id: 'bob', amount: 3000 },
          { id: 's3', expense_id: '1', user_id: 'carol', amount: 3000 },
        ],
      },
      {
        id: '2',
        trip_id: 't',
        title: 'Food',
        amount: 1500,
        currency: 'INR',
        category: 'food' as const,
        paid_by: 'bob',
        split_type: 'equal' as const,
        created_by: 'bob',
        created_at: '',
        updated_at: '',
        shares: [
          { id: 's4', expense_id: '2', user_id: 'alice', amount: 500 },
          { id: 's5', expense_id: '2', user_id: 'bob', amount: 500 },
          { id: 's6', expense_id: '2', user_id: 'carol', amount: 500 },
        ],
      },
    ];

    const result = simplifyDebts(expenses, []);
    // Alice net: 9000 - 3000 - 500 = 5500
    // Bob net: 1500 - 3000 - 500 = -2000
    // Carol net: -3000 - 500 = -3500
    // Should simplify to at most 2 transactions
    expect(result.length).toBeLessThanOrEqual(2);

    // Verify balances settle to 0
    const check = new Map<string, number>();
    check.set('alice', 5500);
    check.set('bob', -2000);
    check.set('carol', -3500);
    for (const d of result) {
      check.set(d.from, (check.get(d.from) ?? 0) + d.amount);
      check.set(d.to, (check.get(d.to) ?? 0) - d.amount);
    }
    for (const [, v] of check) {
      expect(v).toBe(0);
    }
  });
});

describe('generateUpiIntentUrl', () => {
  it('generates a valid UPI URL', () => {
    const url = generateUpiIntentUrl({
      payeeVpa: 'alice@upi',
      payeeName: 'Alice',
      amount: 100.5,
      note: 'Trip settlement',
    });
    expect(url).toContain('upi://pay');
    expect(url).toContain('pa=alice%40upi');
    expect(url).toContain('pn=Alice');
    expect(url).toContain('am=100.50');
    expect(url).toContain('cu=INR');
    expect(url).toContain('tn=Trip+settlement');
  });
});
