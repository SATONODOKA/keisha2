import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const group = await prisma.group.findUnique({
      where: { key },
      include: { members: { where: { isActive: true } } }
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(group.members.map(m => ({ id: m.id, name: m.name, isActive: m.isActive })));
  } catch (error) {
    console.error('メンバー取得エラー:', error);
    return NextResponse.json({ error: 'メンバーの取得に失敗しました' }, { status: 500 });
  }
}
