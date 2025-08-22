import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { roundToUnit } from '@/lib/format';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const { title, amount, paidById, beneficiaryIds } = await request.json();

    if (!title || !amount || !paidById || !beneficiaryIds || beneficiaryIds.length === 0) {
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
