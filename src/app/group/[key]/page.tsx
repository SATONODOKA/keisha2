'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberChips } from '@/components/MemberChips';
import { ExpenseCard } from '@/components/ExpenseCard';
import { CopyButton } from '@/components/CopyButton';
import { Plus, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { yen } from '@/lib/format';

interface Member {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  title: string;
  amountYen: number;
  paidBy: { id: string; name: string };
  beneficiaries: { id: string; name: string }[];
  createdAt: string;
}

interface Settlement {
  fromId: string;
  from: string;
  toId: string;
  to: string;
  amount: number;
}

interface Summary {
  members: Member[];
  nets: { memberId: string; name: string; net: number }[];
  settlements: Settlement[];
  settlementText: string;
  roundingUnit: number;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [unit, setUnit] = useState<1 | 10 | 100 | 1000>(1);
  const [isLoading, setIsLoading] = useState(true);

  const groupKey = params.key as string;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // メンバー取得
      const membersResponse = await fetch(`/api/groups/${groupKey}/members`);
      if (!membersResponse.ok) {
        throw new Error('グループが見つかりません');
      }
      const membersData = await membersResponse.json();
      setMembers(membersData);
      
      // グループ名を仮設定（実際はAPIで取得する必要あり）
      const groupResponse = await fetch(`/api/groups/${groupKey}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroupName(groupData.name);
      }

      // 立替履歴取得
      const expensesResponse = await fetch(`/api/groups/${groupKey}/expenses`);
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData);
      }

      // 清算サマリー取得
      await fetchSummary();
    } catch (error) {
      console.error('データ取得エラー:', error);
      toast.error('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async (roundingUnit = unit) => {
    try {
      const response = await fetch(`/api/groups/${groupKey}/summary?unit=${roundingUnit}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('サマリー取得エラー:', error);
    }
  };

  useEffect(() => {
    if (groupKey) {
      fetchData();
    }
  }, [groupKey]);

  const handleUnitChange = (value: string) => {
    const newUnit = Number(value) as 1 | 10 | 100 | 1000;
    setUnit(newUnit);
    fetchSummary(newUnit);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{groupName}</h1>
          <div className="mt-2">
            <MemberChips members={members} />
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 左カラム：アクション */}
          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-4">
                <Button 
                  onClick={() => router.push(`/group/${groupKey}/payment/new`)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  立替え記録を追加
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右カラム：清算結果 */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>清算方法</CardTitle>
                  {summary && (
                    <div className="flex items-center gap-2">
                      <Select value={unit.toString()} onValueChange={handleUnitChange}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1円単位</SelectItem>
                          <SelectItem value="10">10円単位</SelectItem>
                          <SelectItem value="100">100円単位</SelectItem>
                          <SelectItem value="1000">1000円単位</SelectItem>
                        </SelectContent>
                      </Select>
                      <CopyButton text={summary.settlementText}>
                        <Copy className="h-4 w-4" />
                      </CopyButton>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {summary && summary.settlements.length > 0 ? (
                  <div className="space-y-2">
                    {summary.settlements.map((settlement, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span>
                          {settlement.from} → {settlement.to}
                        </span>
                        <span className="font-bold">{yen(settlement.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">清算の必要はありません</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 立替履歴 */}
        <div>
          <h2 className="text-xl font-bold mb-4">立替履歴</h2>
          {expenses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {expenses.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                まだ立替記録がありません
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
