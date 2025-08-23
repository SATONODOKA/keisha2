import { allocateByWeights, roughWeight } from "@/lib/roughTilt";

// 既存のGreedy清算アルゴリズムを共通化している関数があればimportして再利用。
// なければ下の簡易版greedyを使う。

type MemberLite = { id: string; name: string };
type ExpenseLite = {
  amountYen: number;
  paidById: string;
  beneficiaries: { memberId: string }[]; // 立替カードにある最小情報だけ想定
};

// 端数丸め（1/10/100円単位）。丸め後の合計ずれは最大1単位×人数までなので、最後に調整。
export function roundToUnit(value: number, unit: number) {
  if (unit <= 1) return value;
  return Math.round(value / unit) * unit;
}

// 均等配分（端数は先頭から+1）
export function equalAllocate(total: number, ids: string[]) {
  const k = ids.length;
  const base = Math.floor(total / k);
  let r = total - base * k;
  const map: Record<string, number> = {};
  ids.forEach((id, i) => (map[id] = base + (i < r ? 1 : 0)));
  return map;
}

// 単一立替の nets を作る（均等のみ／他カードとは無関係）
export function netsForExpense(exp: ExpenseLite, unit: number) {
  const nets: Record<string, number> = {};
  const benIds = exp.beneficiaries.map((b) => b.memberId);

  // 支払者 +amount
  nets[exp.paidById] = (nets[exp.paidById] ?? 0) + exp.amountYen;

  // 受益者 −均等配分
  const alloc = equalAllocate(exp.amountYen, benIds);
  for (const id of benIds) {
    nets[id] = (nets[id] ?? 0) - alloc[id];
  }

  // 丸め（任意のunitに合わせる）
  if (unit > 1) {
    for (const id of Object.keys(nets)) nets[id] = roundToUnit(nets[id], unit);
    // 合計ゼロへ微調整（丸め誤差の解消）
    let sum = Object.values(nets).reduce((s, v) => s + v, 0);
    if (sum !== 0) {
      // 支払者に吸収させる（最小の差分）
      nets[exp.paidById] -= sum;
    }
  }
  return nets;
}

// 均等配分用のnets作成（既存関数のエイリアス）
export function netsForExpenseEqual(exp: {
  amountYen: number; 
  paidById: string; 
  beneficiaries: { memberId: string }[];
}) {
  const nets: Record<string, number> = {};
  nets[exp.paidById] = (nets[exp.paidById] ?? 0) + exp.amountYen;
  const benIds = exp.beneficiaries.map(b => b.memberId);
  const alloc = equalAllocate(exp.amountYen, benIds);
  for (const id of benIds) nets[id] = (nets[id] ?? 0) - alloc[id];
  return nets;
}

// 粗傾斜配分用のnets作成（清算方法と同じロジック）
export function netsForExpenseRough(exp: {
  amountYen: number; 
  paidById: string; 
  beneficiaries: { memberId: string }[];
}, memberById: Record<string, { id: string; role?: string; age?: number|null }>) {
  const nets: Record<string, number> = {};
  nets[exp.paidById] = (nets[exp.paidById] ?? 0) + exp.amountYen;

  const items = exp.beneficiaries.map(b => {
    const m = memberById[b.memberId];
    return { id: b.memberId, weight: roughWeight(m?.role, m?.age ?? null) };
  });
  const alloc = allocateByWeights(exp.amountYen, items); // {memberId: 円}
  for (const [memberId, yen] of Object.entries(alloc)) {
    nets[memberId] = (nets[memberId] ?? 0) - (yen as number);
  }
  return nets;
}

// 簡易Greedy（受取>0 と 支払<0 を突き合わせ）
export function greedyTransfers(nets: Record<string, number>) {
  const debtors = Object.entries(nets)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amt: -v })); // 支払うべき額（正）
  const creditors = Object.entries(nets)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amt: v })); // 受け取るべき額（正）

  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const transfers: { fromId: string; toId: string; amountYen: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > 0) transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amountYen: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return transfers;
}

// 立替1件ぶんの清算を返す（表示専用）
export function settleSingleExpense(exp: ExpenseLite, unit: number) {
  const nets = netsForExpense(exp, unit);
  return greedyTransfers(nets);
} 