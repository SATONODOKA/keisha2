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
            items: { include: { member: true } },
            allocations: { include: { member: true } }
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // 純額計算
    const members = group.members.map(m => ({ id: m.id, name: m.name }));
    const nets = new Map<string, number>();

    // 初期化
    members.forEach(m => nets.set(m.id, 0));

    for (const expense of group.expenses) {
      // 支払者はプラス
      nets.set(expense.paidById, (nets.get(expense.paidById) ?? 0) + expense.amountYen);

      // ExpenseAllocationがある場合は優先使用
      if (expense.allocations && expense.allocations.length > 0) {
        // 配分された金額で各メンバーにマイナス
        for (const alloc of expense.allocations) {
          nets.set(alloc.memberId, (nets.get(alloc.memberId) ?? 0) - alloc.amountYen);
        }
      } else {
        // 従来の均等割り
        const k = expense.items.length;
        const share = Math.floor(expense.amountYen / k);
        let rem = expense.amountYen - share * k;
        expense.items.forEach((it, i) => {
          const extra = rem > 0 ? 1 : 0; rem -= extra;
          nets.set(it.memberId, (nets.get(it.memberId) ?? 0) - (share + extra));
        });
      }
    }

    // Mapを配列に変換
    const netArray = members.map(m => ({ memberId: m.id, name: m.name, net: nets.get(m.id) ?? 0 }));

    const settlements = greedySettle(netArray, unit);

    // コピー用テキスト生成
    const settlementText = settlements.length > 0
      ? `清算方法（丸め単位：¥${unit}）
${settlements.map(s => `${s.from} → ${s.to}：${yen(s.amount)}`).join('\n')}
（合計受取＝合計支払＝${yen(settlements.reduce((sum, s) => sum + s.amount, 0))}）`
      : '清算の必要はありません';

    return NextResponse.json({
      members: group.members.map(m => ({ id: m.id, name: m.name })),
      nets: netArray,
      settlements,
      settlementText,
      roundingUnit: unit
    });
  } catch (error) {
    console.error('清算サマリー取得エラー:', error);
    return NextResponse.json({ error: '清算サマリーの取得に失敗しました' }, { status: 500 });
  }
}
