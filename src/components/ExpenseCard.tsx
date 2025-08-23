'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { yen } from '@/lib/format';
import { netsForExpenseEqual, netsForExpenseRough, greedyTransfers } from '@/lib/expenseSettlement';

interface ExpenseCardProps {
  expense: {
    id: string;
    title: string;
    amountYen: number;
    paidBy: { id: string; name: string };
    beneficiaries: { id: string; name: string }[];
    createdAt: string;
  };
  membersById: Record<string, { id: string; name: string; role?: string; age?: number | null }>;
  roundingUnit?: number;
}

export function ExpenseCard({ expense, membersById, roundingUnit = 1 }: ExpenseCardProps) {
  const [tiltOn, setTiltOn] = useState(false); // カード内だけの状態

  // この立替1件分の清算を計算（均等 or 粗傾斜）
  const transfers = useMemo(() => {
    const expenseData = {
      amountYen: expense.amountYen,
      paidById: expense.paidBy.id,
      beneficiaries: expense.beneficiaries.map(b => ({ memberId: b.id }))
    };
    
    const nets = tiltOn
      ? netsForExpenseRough(expenseData, membersById)  // 「清算方法」と同じ粗傾斜ロジック
      : netsForExpenseEqual(expenseData);              // 均等
    return greedyTransfers(nets);
  }, [tiltOn, expense, membersById]);

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
          
          {/* この立替の清算 */}
          <div className="mt-3 text-xs text-muted-foreground">この立替の清算</div>
          <div className="mt-1 space-y-1">
            {transfers.length === 0 ? (
              <div className="text-neutral-400 text-xs">—</div>
            ) : (
              transfers.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between rounded bg-neutral-50 px-3 py-2 text-sm">
                  <span className="text-neutral-700">
                    {membersById[t.fromId]?.name ?? "?"} → {membersById[t.toId]?.name ?? "?"}
                  </span>
                  <span className="font-semibold text-neutral-900">¥{t.amountYen.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>

          {/* 傾斜をかけるボタン（カード内だけで完結） */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setTiltOn(v => !v)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {tiltOn ? "傾斜を解除" : "傾斜をかける"}
            </Button>
            {tiltOn && (
              <span className="text-xs text-neutral-500 whitespace-nowrap">
                傾斜（役職×年齢）適用中
              </span>
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
