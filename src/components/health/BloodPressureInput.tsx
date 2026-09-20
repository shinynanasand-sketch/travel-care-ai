'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BloodPressureInputProps {
  onSubmit: (systolic: number, diastolic: number) => void;
  loading?: boolean;
}

export function BloodPressureInput({
  onSubmit,
  loading,
}: BloodPressureInputProps) {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    if (!isNaN(sys) && !isNaN(dia) && sys > 0 && dia > 0) {
      onSubmit(sys, dia);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <Input
        type="number"
        placeholder="수축 (mmHg)"
        value={systolic}
        onChange={(e) => setSystolic(e.target.value)}
        min={50}
        max={300}
        className="min-w-[7rem] flex-1"
      />
      <Input
        type="number"
        placeholder="이완 (mmHg)"
        value={diastolic}
        onChange={(e) => setDiastolic(e.target.value)}
        min={30}
        max={200}
        className="min-w-[7rem] flex-1"
      />
      <Button type="submit" disabled={loading || !systolic || !diastolic}>
        기록
      </Button>
    </form>
  );
}
