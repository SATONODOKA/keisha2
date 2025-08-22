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

    return NextResponse.json(group.members.map(m => ({ 
      id: m.id, 
      name: m.name, 
      isActive: m.isActive,
      role: m.role,
      age: m.age 
    })));
  } catch (error) {
    console.error('メンバー取得エラー:', error);
    return NextResponse.json({ error: 'メンバーの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const { members } = await request.json();

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'メンバーを指定してください' }, { status: 400 });
    }

    // グループの存在確認
    const group = await prisma.group.findUnique({
      where: { key },
      include: { members: true }
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // 重複メンバーのチェック
    const existingMemberNames = group.members.map(m => m.name);
    const duplicateMembers = members.filter((member: any) => existingMemberNames.includes(member.name));

    if (duplicateMembers.length > 0) {
      return NextResponse.json({ 
        error: `以下のメンバーは既に存在します: ${duplicateMembers.map(m => m.name).join(', ')}` 
      }, { status: 400 });
    }

    // 新しいメンバーを追加
    const newMembers = await prisma.member.createMany({
      data: members.map((member: any) => ({
        groupId: group.id,
        name: member.name.trim(),
        role: member.role || 'MEMBER',
        age: member.age || null
      }))
    });

    return NextResponse.json({ 
      success: true, 
      added: newMembers.count,
      members: members 
    }, { status: 201 });
  } catch (error) {
    console.error('メンバー追加エラー:', error);
    return NextResponse.json({ error: 'メンバーの追加に失敗しました' }, { status: 500 });
  }
}
