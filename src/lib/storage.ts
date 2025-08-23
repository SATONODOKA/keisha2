export interface GroupHistory {
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
    if (!stored) return [];
    
    const history = JSON.parse(stored);
    if (!Array.isArray(history)) return [];
    
    // データの整合性を確認
    return history.filter(item => 
      item && 
      typeof item === 'object' && 
      typeof item.id === 'string' && 
      typeof item.name === 'string' && 
      typeof item.lastAccessed === 'number' && 
      typeof item.memberCount === 'number'
    );
  } catch (error) {
    console.error('グループ履歴の取得に失敗:', error);
    return [];
  }
}
