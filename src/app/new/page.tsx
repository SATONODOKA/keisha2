'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function NewGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [roundingUnit, setRoundingUnit] = useState<1 | 10 | 100 | 1000>(1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const addMember = () => {
    if (!memberName.trim()) return;
    if (members.includes(memberName.trim())) {
      toast.error('同じ名前のメンバーは追加できません');
      return;
    }
    setMembers([...members, memberName.trim()]);
    setMemberName('');
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMember();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      toast.error('グループ名を入力してください');
      return;
    }
    
    if (members.length === 0) {
      toast.error('メンバーを少なくとも1人追加してください');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim(), members, roundingUnit }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'グループ作成に失敗しました');
      }
      
      const { key } = await response.json();
      router.push(`/group/${key}/share`);
    } catch (error) {
      console.error('グループ作成エラー:', error);
      toast.error(error instanceof Error ? error.message : 'グループ作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Walica</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>グループ作成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  グループ名
                </label>
                <Input
                  type="text"
                  placeholder="例：沖縄旅行"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メンバー
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="例：田中"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button type="button" onClick={addMember} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {members.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {members.map((member, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded">
                        <span>{member}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    丸め単位設定
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Select value={roundingUnit.toString()} onValueChange={(value) => setRoundingUnit(Number(value) as 1 | 10 | 100 | 1000)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1円単位</SelectItem>
                      <SelectItem value="10">10円単位</SelectItem>
                      <SelectItem value="100">100円単位</SelectItem>
                      <SelectItem value="1000">1000円単位</SelectItem>
                    </SelectContent>
                  </Select>
                </CollapsibleContent>
              </Collapsible>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '作成中...' : 'グループを作成'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
