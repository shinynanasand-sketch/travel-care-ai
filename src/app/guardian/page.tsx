'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GuardianPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const guardians = JSON.parse(
      localStorage.getItem('guardians') ?? '[]'
    );
    guardians.push({
      name,
      phone,
      relationship,
    });
    localStorage.setItem('guardians', JSON.stringify(guardians));
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">보호자 설정</h1>
      <p className="text-sm text-gray-500">
        저혈당 등 위급 상황 발생 시, 등록된 보호자에게 즉시 긴급 알림을 전송합니다.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">보호자 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="전화번호" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            placeholder="관계 (배우자, 자녀 등)"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          />
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={handleSave}
        disabled={!name || !phone}
      >
        보호자 저장
      </Button>

      {saved && (
        <p className="text-center text-sm text-emerald-600">
          보호자 정보가 저장되었습니다.
        </p>
      )}
    </div>
  );
}
