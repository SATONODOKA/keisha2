'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, Plus, X, Users, UserPlus, History, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getGroupHistory, saveGroupHistory, type GroupHistory } from '@/lib/storage';

export default function NewGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [roundingUnit, setRoundingUnit] = useState<1 | 10 | 100 | 1000>(1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // メンバー追加用
  const [groupKey, setGroupKey] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // 最近のグループ
  const [recentGroups, setRecentGroups] = useState<GroupHistory[]>([]);

  useEffect(() => {
    // 最近のグループを取得
    const history = getGroupHistory();
    setRecentGroups(history);
  }, []);

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

  const addNewMember = () => {
    if (!newMemberName.trim()) return;
    if (newMembers.includes(newMemberName.trim())) {
      toast.error('同じ名前のメンバーは追加できません');
      return;
    }
    setNewMembers([...newMembers, newMemberName.trim()]);
    setNewMemberName('');
  };

  const removeNewMember = (index: number) => {
    setNewMembers(newMembers.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMember();
    }
  };

  const handleNewMemberKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewMember();
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
      
      // グループ履歴を保存
      saveGroupHistory(key, groupName.trim(), members.length);
      
      toast.success('グループを作成しました！');
      router.push(`/group/${key}/share`);
    } catch (error) {
      console.error('グループ作成エラー:', error);
      toast.error(error instanceof Error ? error.message : 'グループ作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupKey.trim()) {
      toast.error('グループキーを入力してください');
      return;
    }
    
    if (newMembers.length === 0) {
      toast.error('メンバーを少なくとも1人追加してください');
      return;
    }

    setIsAddingMembers(true);
    
    try {
      const response = await fetch(`/api/groups/${groupKey.trim()}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: newMembers }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'メンバーの追加に失敗しました');
      }
      
      const result = await response.json();
      
      // グループ履歴を更新
      saveGroupHistory(groupKey.trim(), `グループ (${groupKey.slice(0, 6)}...)`, result.added);
      
      toast.success(`${result.added}人のメンバーを追加しました！`);
      setGroupKey('');
      setNewMembers([]);
      router.push(`/group/${groupKey.trim()}`);
    } catch (error) {
      console.error('メンバー追加エラー:', error);
      toast.error(error instanceof Error ? error.message : 'メンバーの追加に失敗しました');
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleGroupClick = (groupId: string) => {
    router.push(`/group/${groupId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Walica</h1>
        </div>

        {/* 最近のグループ */}
        {recentGroups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                最近のグループ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentGroups.slice(0, 3).map((group) => (
                  <div 
                    key={group.id}
                    onClick={() => handleGroupClick(group.id)}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-gray-500">
                        {group.memberCount}人のメンバー
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(group.lastAccessed).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              新規作成
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              メンバーを追加
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
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
          </TabsContent>

          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>既存グループにメンバーを追加</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleAddMembers} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      グループキー
                    </label>
                    <Input
                      type="text"
                      placeholder="例：RHTKUXR32"
                      value={groupKey}
                      onChange={(e) => setGroupKey(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      共有されたグループキーを入力してください
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      追加するメンバー
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="例：佐藤"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyPress={handleNewMemberKeyPress}
                      />
                      <Button type="button" onClick={addNewMember} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {newMembers.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {newMembers.map((member, index) => (
                          <div key={index} className="flex items-center justify-between bg-green-100 px-3 py-2 rounded">
                            <span>{member}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNewMember(index)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isAddingMembers}>
                    {isAddingMembers ? '追加中...' : 'メンバーを追加'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
