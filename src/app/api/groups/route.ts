import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateGroupKey } from '@/lib/key';
import { roundToUnit } from '@/lib/format';

export async function POST(request: NextRequest) {
  try {
    const { name, members, roundingUnit = 1 } = await request.json();

    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'グループ名とメンバーは必須です' }, { status: 400 });
    }

    // グループキーの生成（重複チェック付き）
    let key: string;
    let attempts = 0;
    do {
      key = generateGroupKey();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json({ error: 'グループキーの生成に失敗しました' }, { status: 500 });
      }
    } while (await prisma.group.findUnique({ where: { key } }));

    // グループ作成
    const group = await prisma.group.create({
      data: {
        key,
        name,
        roundingUnit: roundToUnit(roundingUnit, 1), // 1に丸める
      }
    });

    // メンバー作成
    await prisma.member.createMany({
      data: members.map((memberName: string) => ({
        groupId: group.id,
        name: memberName
      }))
    });

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    console.error('グループ作成エラー:', error);
    return NextResponse.json({ error: 'グループ作成に失敗しました' }, { status: 500 });
  }
}
