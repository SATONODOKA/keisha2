'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { yen } from '@/lib/format';
import { useExpenseTiltStore } from '@/stores/expenseTiltStore';
import { computeSingleExpenseSettlement } from '@/lib/expenseSettlement';
import { useMemo } from 'react';

interface ExpenseCardProps {
  expense: {
    id: string;
    title: string;
    amountYen: number;
    paidBy: { id: string; name: string };
    beneficiaries: { id: string; name: string }[];
    createdAt: string;
  };
  members: Array<{
    id: string;
    name: string;
    role?: string;
    age?: number | null;
  }>;
  roundingUnit: 1 | 10 | 100 | 1000;
}

export function ExpenseCard({ expense, members, roundingUnit }: ExpenseCardProps) {
  const mode = useExpenseTiltStore((s) => s.get(expense.id));
  const setMode = useExpenseTiltStore((s) => s.set);
  const tiltOn = mode === "rough";

  const handleTiltToggle = () => {
    setMode(expense.id, tiltOn ? "equal" : "rough");
  };

  // 清算計算
  const settlement = useMemo(() => {
    const membersById = Object.fromEntries(members.map(m => [m.id, m]));
    
    const expenseData = {
      amountYen: expense.amountYen,
      paidById: expense.paidBy.id,
      beneficiaries: expense.beneficiaries.map(b => ({ memberId: b.id })),
    };
    
    return computeSingleExpenseSettlement({
      expense: expenseData,
      membersById,
      roundingUnit,
      tiltMode: mode,
    });
  }, [expense, members, roundingUnit, mode]);

  // 送金すべき金額を計算
  const transfers = useMemo(() => {
    const transfers: Array<{ from: string; to: string; amount: number }> = [];
    
    // 支払者（プラス）から受益者（マイナス）への送金を計算
    const paidByNet = settlement[expense.paidBy.id] || 0;
    
    if (paidByNet > 0) {
      // 支払者が受け取るべき金額がある場合
      expense.beneficiaries.forEach(beneficiary => {
        const beneficiaryNet = settlement[beneficiary.id] || 0;
        if (beneficiaryNet < 0) {
          const amount = Math.min(paidByNet, -beneficiaryNet);
          if (amount > 0) {
            transfers.push({
              from: beneficiary.name,
              to: expense.paidBy.name,
              amount,
            });
          }
        }
      });
    }
    
    return transfers;
  }, [settlement, expense]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="font-medium">{expense.title}</div>
          <div className="text-lg font-bold text-right">{yen(expense.amountYen)}</div>
        </div>
        <div className="text-sm text-muted-foreground">
          {expense.paidBy.name} が支払い
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">負担者:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {expense.beneficiaries.map((beneficiary) => (
                <Badge key={beneficiary.id} variant="outline" className="text-xs">
                  {beneficiary.name}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* 送金すべき金額 */}
          {transfers.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-sm font-medium mb-2">送金すべき金額:</div>
              <div className="space-y-1">
                {transfers.map((transfer, index) => (
                  <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                    <span className="text-red-600">{transfer.from}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-600">{transfer.to}</span>
                    <span className="ml-2 font-mono">¥{transfer.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 傾斜トグルボタン */}
          <div className="pt-2 border-t">
            <Button
              onClick={handleTiltToggle}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {tiltOn ? '傾斜を解除' : '傾斜をかける'}
            </Button>
            {tiltOn && (
              <p className="text-xs text-neutral-500 mt-1 text-center">
                傾斜（役職×年齢）適用中
              </p>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {new Date(expense.createdAt).toLocaleString('ja-JP')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
