"use client";
import { useMemo, useState } from "react";

type Person = { id: string; name: string };
type Props = {
  totalYen: number;
  people: Person[];             // 負担者のみを渡す
  onChange: (alloc: Record<string, number>) => void; // 保存時に使う
};

export default function EqualAdjuster({ totalYen, people, onChange }: Props) {
  // 初期は均等割り（端数は上から+1）
  const initial = useMemo(() => {
    const k = people.length;
    const base = Math.floor(totalYen / k);
    let r = totalYen - base * k;
    const obj: Record<string, number> = {};
    people.forEach((p, i) => (obj[p.id] = base + (i < r ? 1 : 0)));
    return obj;
  }, [totalYen, people]);

  const [alloc, setAlloc] = useState<Record<string, number>>(initial);

  // 合計は常に totalYen に一致させる：誰かを変えた分は残りから均等に増減
  const updateOne = (targetId: string, newValue: number) => {
    newValue = Math.max(0, Math.round(newValue)); // 負は不可
    const current = alloc[targetId];
    if (newValue === current) return;

    const diff = newValue - current; // 正=増やす / 負=減らす
    const others = Object.keys(alloc).filter((id) => id !== targetId);
    // 均等配分（整数）
    const per = Math.trunc(diff / others.length);
    let remainder = diff - per * others.length;

    const next: Record<string, number> = { ...alloc, [targetId]: newValue };
    for (let i = 0; i < others.length; i++) {
      const id = others[i];
      let delta = per + (remainder > 0 ? 1 : remainder < 0 ? -1 : 0);
      remainder += delta > per ? -1 : delta < per ? 1 : 0;
      next[id] = Math.max(0, next[id] - delta); // 0円下限（必要なら下限を500円等に変更可）
    }

    // 合計を微調整（丸め・下限でズレた分は、targetに吸収）
    const sum = Object.values(next).reduce((s, v) => s + v, 0);
    const drift = sum - totalYen;
    if (drift !== 0) next[targetId] -= drift;

    setAlloc(next);
    onChange(next);
  };

  const sum = Object.values(alloc).reduce((s, v) => s + v, 0);
  const ok = sum === totalYen;

  return (
    <div className="space-y-3">
      <div className={`text-sm ${ok ? "text-green-600" : "text-red-600"}`}>
        合計チェック：{ok ? "OK" : `NG（差分 ¥${(sum - totalYen).toLocaleString()}）`}
      </div>

      <div className="grid gap-2">
        {people.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="w-36 truncate text-sm text-neutral-700">{p.name}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded px-2 py-1 border"
                onClick={() => updateOne(p.id, alloc[p.id] - 100)}
              >
                -100
              </button>
              <input
                type="number"
                className="w-28 rounded border px-2 py-1 text-right"
                value={alloc[p.id]}
                onChange={(e) => updateOne(p.id, Number(e.target.value))}
                min={0}
              />
              <button
                type="button"
                className="rounded px-2 py-1 border"
                onClick={() => updateOne(p.id, alloc[p.id] + 100)}
              >
                +100
              </button>
              <div className="w-24 text-right font-medium">
                ¥{alloc[p.id].toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-right text-sm text-neutral-600">
        合計：¥{sum.toLocaleString()}（総額 ¥{totalYen.toLocaleString()}）
      </div>
    </div>
  );
}
