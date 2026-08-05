'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GuardianPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [fcmToken, setFcmToken] = useState('');
  const [notifyLevel, setNotifyLevel] = useState('WARNING');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const guardians = JSON.parse(
      localStorage.getItem('guardians') ?? '[]'
    );
    guardians.push({
      name,
      phone,
      relationship,
      notifyLevel,
      fcmToken: fcmToken.trim() || undefined,
    });
    localStorage.setItem('guardians', JSON.stringify(guardians));
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">보호자 설정</h1>
      <p className="text-sm text-gray-500">
        혈당 위험 시 보호자에게 FCM 알림을 전송합니다.
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
          <Input
            placeholder="FCM 토큰 (실알림 시 필요, 선택)"
            value={fcmToken}
            onChange={(e) => setFcmToken(e.target.value)}
          />
          <p className="text-xs text-gray-400">
            Firebase 프로젝트 설정 + 기기 토큰이 있어야 실제 푸시가 전송됩니다.
            미설정 시 서버는 mock 로그만 남깁니다.
          </p>
          <div>
            <p className="mb-2 text-sm text-gray-600">알림 레벨</p>
            <select
              value={notifyLevel}
              onChange={(e) => setNotifyLevel(e.target.value)}
              className="w-full rounded-lg border p-3 text-base"
            >
              <option value="WARNING">경고 이상</option>
              <option value="DANGER">위험 이상</option>
              <option value="EMERGENCY">응급만</option>
            </select>
          </div>
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
