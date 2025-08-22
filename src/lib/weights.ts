// 役職の基礎係数（必要なら後で調整可）
export const ROLE_BASE: Record<string, number> = {
  EXEC:    1.60, // 役員
  MANAGER: 1.30, // 部長/課長
  SENIOR:  1.10, // 主任/リーダー
  MEMBER:  1.00, // 一般
  JUNIOR:  0.80, // 新人/インターン
};

// 年齢補正：基準30歳、±0.5%/年、下限0.85〜上限1.15でクリップ
export function ageFactor(age?: number | null) {
  if (!age) return 1.0;
  const raw = 1 + (age - 30) * 0.005;
  return Math.min(1.15, Math.max(0.85, Number(raw.toFixed(3))));
}

export function memberWeight(role: string, age?: number | null) {
  const base = ROLE_BASE[role] ?? 1.0;
  return Number((base * ageFactor(age)).toFixed(3));
}

/**
 * 重みから配分整数（円）を作る。端数はraw- floorの大きい順に+1で埋める。
 */
export function allocateByWeights(totalYen: number, items: {id: string, weight: number}[]) {
  const W = items.reduce((s, x) => s + (x.weight > 0 ? x.weight : 0), 0);
  if (W <= 0) {
    // 全員重み0なら均等
    const k = items.length, base = Math.floor(totalYen / k);
    let r = totalYen - base * k;
    return Object.fromEntries(items.map((it, i) => [it.id, base + (i < r ? 1 : 0)]));
  }
  const raw = items.map(x => ({ id: x.id, raw: (totalYen * x.weight) / W }));
  const base = raw.map(x => ({ id: x.id, val: Math.floor(x.raw) }));
  let r = totalYen - base.reduce((s, x) => s + x.val, 0);
  // 端数を raw-base の大きい順に+1
  const order = raw
    .map((x, i) => ({ i, frac: x.raw - base[i].val }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && r > 0; k++) {
    base[order[k].i].val += 1;
    r--;
  }
  return Object.fromEntries(base.map(x => [x.id, x.val]));
}
