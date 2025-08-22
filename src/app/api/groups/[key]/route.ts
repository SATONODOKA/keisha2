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
      select: { id: true, name: true, roundingUnit: true, createdAt: true }
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('グループ取得エラー:', error);
    return NextResponse.json({ error: 'グループの取得に失敗しました' }, { status: 500 });
  }
}
