'use client';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CopyButtonProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
}

export function CopyButton({ text, children = 'コピー', className }: CopyButtonProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('コピーしました！');
    } catch (error) {
      toast.error('コピーに失敗しました');
    }
  };

  return (
    <Button onClick={handleCopy} className={className}>
      {children}
    </Button>
  );
}
