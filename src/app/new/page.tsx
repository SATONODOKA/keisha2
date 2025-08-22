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

interface MemberData {
  name: string;
  role: string;
  age: number | null;
}

export default function NewGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<string>('MEMBER');
  const [memberAge, setMemberAge] = useState<string>('');
  const [members, setMembers] = useState<MemberData[]>([]);
  const [roundingUnit, setRoundingUnit] = useState<1 | 10 | 100 | 1000>(1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // メンバー追加用
  const [groupKey, setGroupKey] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<string>('MEMBER');
  const [newMemberAge, setNewMemberAge] = useState<string>('');
  const [newMembers, setNewMembers] = useState<MemberData[]>([]);
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
    if (members.some(m => m.name === memberName.trim())) {
      toast.error('同じ名前のメンバーは追加できません');
      return;
    }
    setMembers([...members, {
      name: memberName.trim(),
      role: memberRole,
      age: memberAge ? parseInt(memberAge) : null
    }]);
    setMemberName('');
    setMemberAge('');
    setMemberRole('MEMBER');
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const addNewMember = () => {
    if (!newMemberName.trim()) return;
    if (newMembers.some(m => m.name === newMemberName.trim())) {
      toast.error('同じ名前のメンバーは追加できません');
      return;
    }
    setNewMembers([...newMembers, {
      name: newMemberName.trim(),
      role: newMemberRole,
      age: newMemberAge ? parseInt(newMemberAge) : null
    }]);
    setNewMemberName('');
    setNewMemberAge('');
    setNewMemberRole('MEMBER');
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
      
      // 履歴に保存
      saveGroupHistory({
        key,
        name: groupName.trim(),
        memberCount: members.length,
        timestamp: Date.now()
      });
      
      toast.success('グループを作成しました！');
      router.push(`/group/${key}`);
    } catch (error) {
      console.error('グループ作成エラー:', error);
      toast.error(error instanceof Error ? error.message : 'グループ作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMemberToExistingGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupKey.trim()) {
      toast.error('グループキーを入力してください');
      return;
    }
    if (newMembers.length === 0) {
      toast.error('追加するメンバーを少なくとも1人入力してください');
      return;
    }

    setIsAddingMembers(true);
    try {
      const response = await fetch(`/api/groups/${groupKey}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: newMembers }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'メンバーの追加に失敗しました');
      }

      toast.success('メンバーを追加しました！');
      setGroupKey('');
      setNewMembers([]);
      setRecentGroups(getGroupHistory()); // Refresh recent groups
      router.push(`/group/${groupKey}`); // Navigate to group page
    } catch (error) {
      console.error('メンバー追加エラー:', error);
      toast.error(error instanceof Error ? error.message : 'メンバーの追加に失敗しました');
    } finally {
      setIsAddingMembers(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Walica</h1>
        </div>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">新規作成</TabsTrigger>
            <TabsTrigger value="add-member">メンバーを追加</TabsTrigger>
          </TabsList>
          <TabsContent value="new">
            <Card>
              <CardContent className="p-6 space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      グループ名
                    </label>
                    <Input
                      type="text"
                      placeholder="例：サークル飲み会"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メンバー
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        type="text"
                        placeholder="例：たろう"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button type="button" onClick={addMember} disabled={isLoading}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 役職・年齢入力 */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">役職</label>
                        <Select value={memberRole} onValueChange={setMemberRole} disabled={isLoading}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXEC">役員</SelectItem>
                            <SelectItem value="MANAGER">部長/課長</SelectItem>
                            <SelectItem value="SENIOR">主任/リーダー</SelectItem>
                            <SelectItem value="MEMBER">一般</SelectItem>
                            <SelectItem value="JUNIOR">新人/インターン</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">年齢（任意）</label>
                        <Input
                          type="number"
                          placeholder="例：25"
                          value={memberAge}
                          onChange={(e) => setMemberAge(e.target.value)}
                          disabled={isLoading}
                          className="h-8"
                          min="15"
                          max="80"
                        />
                      </div>
                    </div>

                    {members.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {members.map((member, index) => (
                          <div key={index} className="flex items-center justify-between bg-green-50 text-green-800 px-3 py-2 rounded-md">
                            <div>
                              <span>{member.name}</span>
                              <span className="text-xs ml-2 text-green-600">
                                ({member.role}{member.age ? `, ${member.age}歳` : ''})
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(index)}
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full">
                        詳細設定
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          丸め単位
                        </label>
                        <Select 
                          value={roundingUnit.toString()} 
                          onValueChange={(value) => setRoundingUnit(Number(value) as 1 | 10 | 100 | 1000)}
                        >
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
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '作成中...' : 'グループを作成'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="add-member">
            <Card>
              <CardHeader>
                <CardTitle>既存グループにメンバーを追加</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleAddMemberToExistingGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      グループキー
                    </label>
                    <Input
                      type="text"
                      placeholder="共有されたグループキーを入力"
                      value={groupKey}
                      onChange={(e) => setGroupKey(e.target.value)}
                      disabled={isAddingMembers}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      追加するメンバー名
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        type="text"
                        placeholder="例：たろう"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyPress={handleNewMemberKeyPress}
                        disabled={isAddingMembers}
                        className="flex-1"
                      />
                      <Button type="button" onClick={addNewMember} disabled={isAddingMembers}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 役職・年齢入力 */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">役職</label>
                        <Select value={newMemberRole} onValueChange={setNewMemberRole} disabled={isAddingMembers}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXEC">役員</SelectItem>
                            <SelectItem value="MANAGER">部長/課長</SelectItem>
                            <SelectItem value="SENIOR">主任/リーダー</SelectItem>
                            <SelectItem value="MEMBER">一般</SelectItem>
                            <SelectItem value="JUNIOR">新人/インターン</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">年齢（任意）</label>
                        <Input
                          type="number"
                          placeholder="例：25"
                          value={newMemberAge}
                          onChange={(e) => setNewMemberAge(e.target.value)}
                          disabled={isAddingMembers}
                          className="h-8"
                          min="15"
                          max="80"
                        />
                      </div>
                    </div>

                    {newMembers.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {newMembers.map((member, index) => (
                          <div key={index} className="flex items-center justify-between bg-green-50 text-green-800 px-3 py-2 rounded-md">
                            <div>
                              <span>{member.name}</span>
                              <span className="text-xs ml-2 text-green-600">
                                ({member.role}{member.age ? `, ${member.age}歳` : ''})
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNewMember(index)}
                              disabled={isAddingMembers}
                            >
                              <X className="h-4 w-4" />
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

        {/* 最近のグループ */}
        {recentGroups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                最近のグループ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentGroups.slice(0, 5).map((group) => (
                <div
                  key={group.key}
                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => router.push(`/group/${group.key}`)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{group.name}</p>
                    <p className="text-sm text-gray-500">
                      {group.memberCount}人 • {new Date(group.timestamp).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
