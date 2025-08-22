import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { roundToUnit } from '@/lib/format';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await request.json();
    console.log('Request body:', body);

    const { title, amount, paidById, beneficiaryIds, allocations } = body;

    console.log('Parsed data:', { title, amount, paidById, beneficiaryIds, allocations });

    if (!title || !amount || !paidById || !beneficiaryIds || !Array.isArray(beneficiaryIds) || beneficiaryIds.length === 0) {
      return NextResponse.json({ error: '全ての項目を入力してください' }, { status: 400 });
    }

    // グループ取得
    const group = await prisma.group.findUnique({
      where: { key },
      include: { members: true }
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // 支払者と負担者がグループに属しているかチェック
    const validMemberIds = group.members.map(m => m.id);
    if (!validMemberIds.includes(paidById)) {
      return NextResponse.json({ error: '支払者がグループに属していません' }, { status: 400 });
    }

    for (const id of beneficiaryIds) {
      if (!validMemberIds.includes(id)) {
        return NextResponse.json({ error: '負担者がグループに属していません' }, { status: 400 });
      }
    }

    // 金額を整数化（四捨五入）
    const amountYen = Math.round(amount);

    // 立替記録作成
    const expense = await prisma.expense.create({
      data: {
        groupId: group.id,
        title,
        amountYen,
        paidById,
      }
    });

    // 負担者作成
    await prisma.beneficiary.createMany({
      data: beneficiaryIds.map((memberId: string) => ({
        expenseId: expense.id,
        memberId
      }))
    });

    // allocationsがある場合、ExpenseAllocationに保存
    if (allocations && Array.isArray(allocations) && allocations.length > 0) {
      // 合計金額の検証
      const totalAlloc = allocations.reduce((sum: number, alloc: any) => sum + alloc.amountYen, 0);
      if (totalAlloc !== amountYen) {
        return NextResponse.json({
          error: `配分金額の合計（${totalAlloc.toLocaleString()}円）が総額（${amountYen.toLocaleString()}円）と一致しません`
        }, { status: 400 });
      }

      // 全てのmemberIdがbeneficiaryIdsに含まれているかチェック
      for (const alloc of allocations) {
        if (!beneficiaryIds.includes(alloc.memberId)) {
          return NextResponse.json({
            error: `配分に含まれているメンバー（${alloc.memberId}）が負担者に含まれていません`
          }, { status: 400 });
        }
      }

      // ExpenseAllocationに保存（個別作成でエラーハンドリング）
      try {
        for (const alloc of allocations) {
          await prisma.expenseAllocation.create({
            data: {
              expenseId: expense.id,
              memberId: alloc.memberId,
              amountYen: alloc.amountYen
            }
          });
        }
      } catch (allocError) {
        console.error('配分保存エラー:', allocError);
        return NextResponse.json({ error: '配分の保存に失敗しました' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('立替記録エラー:', error);
    return NextResponse.json({ error: '立替記録に失敗しました' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const group = await prisma.group.findUnique({
      where: { key },
      include: {
        expenses: {
          include: {
            paidBy: true,
            items: { include: { member: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    const expenses = group.expenses.map(expense => ({
      id: expense.id,
      title: expense.title,
      amountYen: expense.amountYen,
      paidBy: { id: expense.paidBy.id, name: expense.paidBy.name },
      beneficiaries: expense.items.map(item => ({ id: item.member.id, name: item.member.name })),
      createdAt: expense.createdAt
    }));

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('立替履歴取得エラー:', error);
    return NextResponse.json({ error: '立替履歴の取得に失敗しました' }, { status: 500 });
  }
}
