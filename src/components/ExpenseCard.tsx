'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { yen } from '@/lib/format';
import { settleSingleExpense } from '@/lib/expenseSettlement';

interface ExpenseCardProps {
  expense: {
    id: string;
    title: string;
    amountYen: number;
    paidBy: { id: string; name: string };
    beneficiaries: { id: string; name: string }[];
    createdAt: string;
  };
  membersById: Record<string, { id: string; name: string }>;
  roundingUnit?: number;
}

export function ExpenseCard({ expense, membersById, roundingUnit = 1 }: ExpenseCardProps) {
  // この立替1件分の清算を計算
  const transfers = settleSingleExpense(
    {
      amountYen: expense.amountYen,
      paidById: expense.paidBy.id,
      beneficiaries: expense.beneficiaries.map(b => ({ memberId: b.id })),
    },
    roundingUnit
  );

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
          
          <div className="text-xs text-muted-foreground">
            {new Date(expense.createdAt).toLocaleString('ja-JP')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
