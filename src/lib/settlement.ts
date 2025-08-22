import { roundToUnit } from './format';

type Net = { memberId: string; name: string; net: number }; // net: +受取 / -支払

export function calcNets(
  members: {id:string;name:string}[],
  expenses: {amountYen:number; paidById:string; items:{memberId:string}[]}[]
): Net[] {
  const net = new Map<string, number>();
  members.forEach(m => net.set(m.id, 0));

  for (const e of expenses) {
    net.set(e.paidById, (net.get(e.paidById) ?? 0) + e.amountYen);
    const k = e.items.length;
    const share = Math.floor(e.amountYen / k);
    let rem = e.amountYen - share * k;
    e.items.forEach((it, i) => {
      const extra = rem > 0 ? 1 : 0; rem -= extra;
      net.set(it.memberId, (net.get(it.memberId) ?? 0) - (share + extra));
    });
  }

  return members.map(m => ({ memberId: m.id, name: m.name, net: net.get(m.id) ?? 0 }));
}

export function greedySettle(nets: Net[], unit: 1|10|100|1000) {
  const pos = nets.filter(n => n.net > 0).sort((a,b)=>b.net-a.net);
  const neg = nets.filter(n => n.net < 0).sort((a,b)=>a.net-b.net); // more negative first
  const tx: { fromId:string; from:string; toId:string; to:string; amount:number }[] = [];

  let i=0, j=0;
  while (i < pos.length && j < neg.length) {
    const p = pos[i], n = neg[j];
    const amt = Math.min(p.net, -n.net);
    tx.push({ fromId:n.memberId, from:n.name, toId:p.memberId, to:p.name, amount: amt });
    p.net -= amt; n.net += amt;
    if (p.net === 0) i++;
    if (n.net === 0) j++;
  }

  // 丸め：立て替えた人に多めに払う原則（切り上げ）
  if (unit > 1 && tx.length) {
    // 各トランザクションをunitの倍数に切り上げ
    const rounded = tx.map(t => {
      const roundedAmount = Math.ceil(t.amount / unit) * unit;
      return { ...t, amount: roundedAmount };
    });
    
    return rounded.filter(t => t.amount !== 0);
  }

  return tx.filter(t => t.amount !== 0);
}
