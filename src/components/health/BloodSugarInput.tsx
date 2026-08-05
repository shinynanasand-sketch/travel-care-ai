'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BloodSugarInputProps {
  onSubmit: (value: number) => void;
  loading?: boolean;
}

export function BloodSugarInput({ onSubmit, loading }: BloodSugarInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) onSubmit(num);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="number"
        placeholder="혈당 (mg/dL)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        min={20}
        max={600}
        className="flex-1"
      />
      <Button type="submit" disabled={loading || !value}>
        기록
      </Button>
    </form>
  );
}
