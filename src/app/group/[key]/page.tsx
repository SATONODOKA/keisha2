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
import { saveGroupHistory } from '@/lib/storage';

interface Member {
  id: string;
  name: string;
  role?: string;
  age?: number | null;
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
  tilt: string;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [unit, setUnit] = useState<1 | 10 | 100 | 1000>(1);
  const [tiltOn, setTiltOn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

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
      setGroupName('グループ');

      // 立替履歴取得
      const expensesResponse = await fetch(`/api/groups/${groupKey}/expenses`);
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData);
      }

      // 清算サマリー取得
      await fetchSummary();
      
      // グループ履歴を保存
      saveGroupHistory(groupKey, 'グループ', membersData.length);
    } catch (error) {
      console.error('データ取得エラー:', error);
      toast.error('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async (roundingUnit = unit, tiltMode = tiltOn) => {
    try {
      setIsUpdating(true);
      const tiltParam = tiltMode ? '&tilt=rough' : '';
      const response = await fetch(`/api/groups/${groupKey}/summary?unit=${roundingUnit}${tiltParam}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('清算サマリー取得エラー:', error);
      toast.error('清算サマリーの取得に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnitChange = (value: string) => {
    const newUnit = parseInt(value) as 1 | 10 | 100 | 1000;
    setUnit(newUnit);
    fetchSummary(newUnit, tiltOn);
  };

  const handleTiltToggle = () => {
    const newTiltOn = !tiltOn;
    setTiltOn(newTiltOn);
    fetchSummary(unit, newTiltOn);
  };

  useEffect(() => {
    if (groupKey) {
      fetchData();
    }
  }, [groupKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
                  <CardTitle className="flex items-center gap-2">
                    清算方法
                    {isUpdating && (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    )}
                  </CardTitle>
                  {summary && (
                    <div className="flex items-center gap-2">
                      <Select value={unit.toString()} onValueChange={handleUnitChange} disabled={isUpdating}>
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

                {/* 現在の残高表示 */}
                {summary && summary.nets.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">現在の残高</h4>
                    <div className="space-y-2">
                      {summary.nets.map((netItem) => (
                        <div key={netItem.memberId} className="flex items-center justify-between text-sm">
                          <span>{netItem.name}</span>
                          <span className={`font-mono ${netItem.net > 0 ? 'text-green-600' : netItem.net < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {netItem.net > 0 ? '+' : ''}{yen(netItem.net)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 傾斜をかけるボタン */}
                {summary && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Button
                        onClick={handleTiltToggle}
                        variant="outline"
                        disabled={isUpdating}
                        className="flex-1 mr-2"
                      >
                        {tiltOn ? '傾斜を解除' : '傾斜をかける'}
                      </Button>
                      {tiltOn && (
                        <span className="text-xs text-neutral-500 whitespace-nowrap">
                          傾斜（役職×年齢）適用中
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {tiltOn
                        ? '役職と年齢をざっくり考慮して再計算しました'
                        : '通常は全員が等しく負担します'
                      }
                    </p>
                  </div>
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
              {expenses.map((expense) => {
                // membersByIdを作成（各立替カードで清算表示に使用）
                const membersById = members.reduce((acc, member) => {
                  acc[member.id] = { id: member.id, name: member.name };
                  return acc;
                }, {} as Record<string, { id: string; name: string }>);
                
                return (
                  <ExpenseCard 
                    key={expense.id} 
                    expense={expense} 
                    membersById={membersById}
                    roundingUnit={unit}
                  />
                );
              })}
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
