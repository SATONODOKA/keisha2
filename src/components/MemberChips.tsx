'use client';

import { Badge } from '@/components/ui/badge';

interface MemberChipsProps {
  members: { id: string; name: string }[];
}

export function MemberChips({ members }: MemberChipsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {members.map((member, index) => (
        <Badge key={member.id} variant="secondary">
          {member.name}
        </Badge>
      ))}
    </div>
  );
}
