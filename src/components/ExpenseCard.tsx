'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { yen } from '@/lib/format';
import { useExpenseTiltStore } from '@/stores/expenseTiltStore';

interface ExpenseCardProps {
  expense: {
    id: string;
    title: string;
    amountYen: number;
    paidBy: { id: string; name: string };
    beneficiaries: { id: string; name: string }[];
    createdAt: string;
  };
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const mode = useExpenseTiltStore((s) => s.get(expense.id));
  const setMode = useExpenseTiltStore((s) => s.set);
  const tiltOn = mode === "rough";

  const handleTiltToggle = () => {
    setMode(expense.id, tiltOn ? "equal" : "rough");
  };

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
