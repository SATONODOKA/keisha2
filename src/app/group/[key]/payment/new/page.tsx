'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import EqualAdjuster from '@/components/EqualAdjuster';
import { memberWeight, allocateByWeights } from '@/lib/weights';

interface Member {
  id: string;
  name: string;
  role: string;
  age: number | null;
}

export default function NewPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [paidById, setPaidById] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [beneficiaryIds, setBeneficiaryIds] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"equal" | "tilt">("equal");

  const groupKey = params.key as string;

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/groups/${groupKey}/members`);
        if (!response.ok) {
          throw new Error('グループが見つかりません');
        }
        const data = await response.json();
        setMembers(data);
        // デフォルトで全員を選択
        setBeneficiaryIds(data.map((m: Member) => m.id));
      } catch (error) {
        console.error('メンバー取得エラー:', error);
        toast.error('メンバーの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (groupKey) {
      fetchMembers();
    }
  }, [groupKey]);

  // 負担者リスト（Memberオブジェクト）
  const beneficiaries = members.filter(m => beneficiaryIds.includes(m.id));
  // 総額が入力され、負担者が選択されている場合のみEqualAdjusterを表示
  const showEqualAdjuster = amount && beneficiaryIds.length > 0;

  // 初期配分の生成
  useEffect(() => {
    if (!showEqualAdjuster) return;

    const total = Number(amount);
    if (mode === "equal") {
      // 均等割り
      const k = beneficiaries.length, base = Math.floor(total / k);
      let r = total - base * k;
      const init = Object.fromEntries(
        beneficiaries.map((m, i) => [m.id, base + (i < r ? 1 : 0)])
      );
      setAllocations(init);
    } else {
      // 傾斜初期化（役職×年齢の重み）
      const items = beneficiaries.map((m) => ({
        id: m.id,
        weight: memberWeight(m.role, m.age),
      }));
      setAllocations(allocateByWeights(total, items));
    }
  }, [mode, amount, JSON.stringify(beneficiaries), showEqualAdjuster]);

  const handleBeneficiaryChange = (memberId: string, checked: boolean) => {
    if (checked) {
      setBeneficiaryIds([...beneficiaryIds, memberId]);
    } else {
      setBeneficiaryIds(beneficiaryIds.filter(id => id !== memberId));
    }
  };

  const handleAllocationChange = (alloc: Record<string, number>) => {
    setAllocations(alloc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paidById) {
      toast.error('支払者を選択してください');
      return;
    }
    
    if (!title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }
    
    if (!amount || isNaN(Number(amount))) {
      toast.error('金額を正しく入力してください');
      return;
    }
    
    if (beneficiaryIds.length === 0) {
      toast.error('負担者を少なくとも1人選択してください');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // allocationsがある場合、配列形式に変換
      const allocationsArray = Object.keys(allocations).length > 0 
        ? Object.entries(allocations).map(([memberId, amountYen]) => ({
            memberId,
            amountYen
          }))
        : undefined;

      const response = await fetch(`/api/groups/${groupKey}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          amount: Number(amount),
          paidById,
          beneficiaryIds,
          allocations: allocationsArray,
          mode: mode // ログ用
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '立替記録に失敗しました');
      }
      
      toast.success('立替記録を追加しました！');
      router.push(`/group/${groupKey}`);
    } catch (error) {
      console.error('立替記録エラー:', error);
      toast.error(error instanceof Error ? error.message : '立替記録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">立替記録を追加</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center text-gray-700 space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Select value={paidById} onValueChange={setPaidById}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="支払者" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>が</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span>の</span>
                    <Input
                      type="text"
                      placeholder="例：ランチ代"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-32"
                    />
                    <span>を払って、</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span>¥</span>
                  <Input
                    type="number"
                    placeholder="3000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-24"
                  />
                  <span>かかった。</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  負担者（チェックを外すとその人は負担しない）
                </label>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={member.id}
                        checked={beneficiaryIds.includes(member.id)}
                        onCheckedChange={(checked) => 
                          handleBeneficiaryChange(member.id, checked as boolean)
                        }
                      />
                      <label htmlFor={member.id} className="text-sm">
                        {member.name}
                        <span className="text-xs text-gray-500 ml-2">
                          ({member.role}{member.age ? `, ${member.age}歳` : ''})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 割り方選択 */}
              {showEqualAdjuster && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    割り方
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="mode"
                        value="equal"
                        checked={mode === "equal"}
                        onChange={() => setMode("equal")}
                        className="mr-2"
                      />
                      <span className="text-sm">均等</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="mode"
                        value="tilt"
                        checked={mode === "tilt"}
                        onChange={() => setMode("tilt")}
                        className="mr-2"
                      />
                      <span className="text-sm">傾斜（役職×年齢）</span>
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {mode === "equal" 
                      ? "全員で均等に割ります"
                      : "役職×年齢の重みで初期配分します。数値は下で微調整できます"}
                  </div>
                </div>
              )}

              {/* 傾斜調整UI */}
              {showEqualAdjuster && (
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full">
                      配分調整
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="rounded-lg border p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        各人の負担額を調整
                      </h4>
                      <EqualAdjuster
                        totalYen={Number(amount)}
                        people={beneficiaries}
                        onChange={handleAllocationChange}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? '登録中...' : '登録'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
