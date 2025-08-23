import { roughWeight, allocateByWeights } from './roughTilt';
import { roundToUnit } from './format';

// 均等配分
export function equalAllocate(total: number, memberIds: string[]): Record<string, number> {
  const k = memberIds.length;
  const share = Math.floor(total / k);
  let rem = total - share * k;
  
  const result: Record<string, number> = {};
  memberIds.forEach((id, i) => {
    const extra = rem > 0 ? 1 : 0;
    rem -= extra;
    result[id] = share + extra;
  });
  
  return result;
}

// 重み付き配分
export function allocateByWeightsWithMembers(
  total: number, 
  members: { id: string; role?: string; age?: number | null }[]
): Record<string, number> {
  const items = members.map(m => ({
    id: m.id,
    weight: roughWeight(m.role, m.age),
  }));
  return allocateByWeights(total, items);
}

// 丸め処理（既存のロジックに合わせる）
export function roundNetsToUnit(nets: Record<string, number>, unit: 1 | 10 | 100 | 1000): Record<string, number> {
  if (unit <= 1) return nets;
  
  const rounded: Record<string, number> = {};
  let drift = 0;
  
  // 各netを丸める
  for (const [id, net] of Object.entries(nets)) {
    rounded[id] = roundToUnit(net, unit);
    drift += net - rounded[id];
  }
  
  // 丸めによる誤差を支払超過者（プラス最大）に吸収
  if (drift !== 0) {
    const maxId = Object.entries(rounded).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (maxId) {
      rounded[maxId] -= drift;
    }
  }
  
  return rounded;
}

// グループ全体の清算計算（各立替の傾斜モードに応じて集計）
export function computeGroupTransfers({
  expenses,
  membersById,
  roundingUnit,
  getTiltMode,
}: {
  expenses: Array<{ id: string; amountYen: number; paidById: string; beneficiaries: { memberId: string }[] }>;
  membersById: Record<string, { id: string; role?: string; age?: number | null }>;
  roundingUnit: 1 | 10 | 100 | 1000;
  getTiltMode: (expenseId: string) => "equal" | "rough";
}) {
  // 1) 全メンバーの nets を0初期化
  let nets: Record<string, number> = {};
  Object.keys(membersById).forEach(id => (nets[id] = 0));

  // 2) 立替ごとに、カードの選択モードに応じて nets に反映
  for (const e of expenses) {
    nets[e.paidById] += e.amountYen;

    const benIds = e.beneficiaries.map(b => b.memberId);
    const mode = getTiltMode(e.id); // "equal" | "rough"
    let alloc: Record<string, number>;

    if (mode === "rough") {
      const benMembers = benIds.map(id => membersById[id]);
      alloc = allocateByWeightsWithMembers(e.amountYen, benMembers);
    } else {
      alloc = equalAllocate(e.amountYen, benIds);
    }

    for (const id of benIds) {
      nets[id] -= alloc[id];
    }
  }

  // 3) 丸め（単位を合わせる）
  if (roundingUnit > 1) {
    nets = roundNetsToUnit(nets, roundingUnit);
  }

  return nets;
} 