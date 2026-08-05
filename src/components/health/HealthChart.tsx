'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useHealthStore } from '@/store/healthStore';
import { format } from 'date-fns';

export function HealthChart() {
  const records = useHealthStore((s) => s.records);
  const data = records
    .filter((r) => r.recordType === 'BLOOD_SUGAR')
    .slice(0, 10)
    .reverse()
    .map((r) => ({
      time: format(new Date(r.recordedAt), 'HH:mm'),
      value: r.value,
    }));

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        아직 기록된 혈당 데이터가 없습니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" fontSize={12} />
        <YAxis domain={[50, 300]} fontSize={12} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
