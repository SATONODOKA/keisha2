import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calcNets, greedySettle } from '@/lib/settlement';
import { yen } from '@/lib/format';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const { searchParams } = new URL(request.url);
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

    // 純額計算
    const members = group.members.map(m => ({ id: m.id, name: m.name }));
    const expenses = group.expenses.map(e => ({
      amountYen: e.amountYen,
      paidById: e.paidById,
      items: e.items.map(i => ({ memberId: i.memberId }))
    }));

    const nets = calcNets(members, expenses);
    // URLパラメータのunitを使って清算を計算
    const settlements = greedySettle(nets, unit);

    // コピー用テキスト生成（URLパラメータのunitを使う）
    const settlementText = settlements.length > 0
      ? `清算方法（丸め単位：¥${unit}）
${settlements.map(s => `${s.from} → ${s.to}：${yen(s.amount)}`).join('\n')}
（合計受取＝合計支払＝${yen(settlements.reduce((sum, s) => sum + s.amount, 0))}）`
      : '清算の必要はありません';

    return NextResponse.json({
      members: group.members.map(m => ({ id: m.id, name: m.name })),
      nets,
      settlements,
      settlementText,
      // URLパラメータのunitを返す（データベースの値ではなく）
      roundingUnit: unit
    });
  } catch (error) {
    console.error('清算サマリー取得エラー:', error);
    return NextResponse.json({ error: '清算サマリーの取得に失敗しました' }, { status: 500 });
  }
}
