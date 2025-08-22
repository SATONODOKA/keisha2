interface GroupHistory {
  id: string;
  name: string;
  lastAccessed: number;
  memberCount: number;
}

const STORAGE_KEY = 'walica_group_history';

export function saveGroupHistory(groupKey: string, groupName: string, memberCount: number) {
  try {
    const history = getGroupHistory();
    const existingIndex = history.findIndex(h => h.id === groupKey);
    
    const newEntry: GroupHistory = {
      id: groupKey,
      name: groupName,
      lastAccessed: Date.now(),
      memberCount
    };
    
    if (existingIndex >= 0) {
      history[existingIndex] = newEntry;
    } else {
      history.unshift(newEntry);
    }
    
    // 最新10件のみ保存
    const recentHistory = history.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentHistory));
  } catch (error) {
    console.error('グループ履歴の保存に失敗:', error);
  }
}

export function getGroupHistory(): GroupHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('グループ履歴の取得に失敗:', error);
    return [];
  }
}

export function clearGroupHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('グループ履歴の削除に失敗:', error);
  }
}
