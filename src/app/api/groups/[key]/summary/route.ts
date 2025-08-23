import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calcNets, greedySettle } from '@/lib/settlement';
import { yen } from '@/lib/format';
import { roughWeight, allocateByWeights } from '@/lib/roughTilt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const { searchParams } = new URL(request.url);
    const tilt = (searchParams.get('tilt') ?? 'none') as 'none' | 'rough';
    const unit = parseInt(searchParams.get('unit') || '1') as 1 | 10 | 100 | 1000;

    // グループとメンバー、立替記録を取得
    const group = await prisma.group.findUnique({
      where: { key },
      include: {
        members: { where: { isActive: true } },
        expenses: {
          include: {
            paidBy: true,
            items: { include: { member: true } }
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // メンバーID→メンバー情報のマップを作成
    const memberById = Object.fromEntries(group.members.map(m => [m.id, m]));

    let nets: { memberId: string; name: string; net: number }[] = [];

    if (tilt === 'rough') {
      // ざっくり傾斜：各立替の負担者を role×age の粗係数で配分
      const netsMap: Record<string, number> = {};
      group.members.forEach(m => (netsMap[m.id] = 0));

      for (const e of group.expenses) {
        netsMap[e.paidById] += e.amountYen; // 支払者+（従来どおり）

        const benMembers = e.items.map(item => memberById[item.memberId]);
        const items = benMembers.map(m => ({
          id: m.id,
          weight: roughWeight(m.role, m.age),
        }));
        const alloc = allocateByWeights(e.amountYen, items); // {memberId: 円}

        for (const [memberId, yen] of Object.entries(alloc)) {
          netsMap[memberId] -= yen as number;
        }
      }

      // netsMapを配列形式に変換
      nets = group.members.map(m => ({
        memberId: m.id,
        name: m.name,
        net: netsMap[m.id]
      }));
    } else {
      // 従来の均等配分で nets 計算（現状の実装そのまま）
      const members = group.members.map(m => ({ id: m.id, name: m.name }));
      const expenses = group.expenses.map(e => ({
        amountYen: e.amountYen,
        paidById: e.paidById,
        items: e.items.map(i => ({ memberId: i.memberId }))
      }));

      nets = calcNets(members, expenses);
    }

    // URLパラメータのunitを使って清算を計算
    const settlements = greedySettle(nets, unit);

    // コピー用テキスト生成（URLパラメータのunitを使う）
    const settlementText = settlements.length > 0
      ? `清算方法（丸め単位：¥${unit}${tilt === 'rough' ? '、傾斜：役職×年齢（粗）' : ''}）
${settlements.map(s => `${s.from} → ${s.to}：${yen(s.amount)}`).join('\n')}
（合計受取＝合計支払＝${yen(settlements.reduce((sum, s) => sum + s.amount, 0))}）`
      : '清算の必要はありません';

    return NextResponse.json({
      members: group.members.map(m => ({ id: m.id, name: m.name })),
      nets,
      settlements,
      settlementText,
      // URLパラメータのunitを返す（データベースの値ではなく）
      roundingUnit: unit,
      // 現在の傾斜モードを返す
      tilt: tilt
    });
  } catch (error) {
    console.error('清算サマリー取得エラー:', error);
    return NextResponse.json({ error: '清算サマリーの取得に失敗しました' }, { status: 500 });
  }
}
