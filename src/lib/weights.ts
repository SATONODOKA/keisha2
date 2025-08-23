export const ROLE_BASE = {
  EXEC: 1.60,     // 役員
  MANAGER: 1.30,  // 部長/課長
  SENIOR: 1.10,   // 主任/リーダー
  MEMBER: 1.00,   // 一般
  JUNIOR: 0.80,   // 新人/インターン
} as const;

export type RoleKey = keyof typeof ROLE_BASE;

// 年齢補正：基準30歳、±0.5%/年、0.85〜1.15にクリップ（暴れ防止）
export function ageFactor(age?: number | null) {
  if (age == null) return 1.0;
  const raw = 1 + (age - 30) * 0.005;
  return Math.min(1.15, Math.max(0.85, Number(raw.toFixed(3))));
}

// 役職×年齢（Phase2はこれ一択。将来「役職のみ」「年齢のみ」も追加予定）
export function weightOf(role: string | undefined, age?: number | null) {
  const base = ROLE_BASE[(role as RoleKey) ?? "MEMBER"] ?? 1.0;
  return Number((base * ageFactor(age)).toFixed(3));
}

// 重みによる整数配分（円）。端数は raw-floor の大きい順に+1で決定的に配布
export function allocateByWeights(total: number, items: { id: string; weight: number }[]) {
  const positive = items.map(it => ({ ...it, weight: Math.max(0, it.weight) }));
  const W = positive.reduce((s, x) => s + x.weight, 0);
  if (W <= 0) {
    const k = positive.length, base = Math.floor(total / k);
    let r = total - base * k;
    return Object.fromEntries(positive.map((it, i) => [it.id, base + (i < r ? 1 : 0)]));
  }
  const raw = positive.map(x => ({ id: x.id, raw: (total * x.weight) / W }));
  const base = raw.map(x => ({ id: x.id, val: Math.floor(x.raw) }));
  let r = total - base.reduce((s, x) => s + x.val, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x.raw - base[i].val }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && r > 0; k++) { base[order[k].i].val += 1; r--; }
  return Object.fromEntries(base.map(x => [x.id, x.val]));
}
