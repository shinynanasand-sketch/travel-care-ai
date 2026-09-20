'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requestFcmToken } from '@/lib/firebase';

export type GuardianContact = {
  name: string;
  phone: string;
  relationship: string;
  /** 푸시 수신용 — 없으면 연락처 안내만 가능 */
  fcmToken?: string;
};

export default function GuardianPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [useThisDeviceForPush, setUseThisDeviceForPush] = useState(false);
  const [guardians, setGuardians] = useState<GuardianContact[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(
        localStorage.getItem('guardians') ?? '[]'
      ) as GuardianContact[];
      setGuardians(Array.isArray(raw) ? raw : []);
    } catch {
      setGuardians([]);
    }
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);

    let fcmToken: string | undefined;
    if (useThisDeviceForPush) {
      const result = await requestFcmToken();
      if (!result.token) {
        setSaving(false);
        setError(
          result.permission === 'denied'
            ? '알림 권한이 거부되어 푸시 수신 기기로 등록할 수 없습니다. 연락처만 저장됩니다.'
            : `푸시 토큰을 받지 못했습니다${result.error ? `: ${result.error}` : ''}. 연락처만 저장합니다.`
        );
      } else {
        fcmToken = result.token;
      }
    }

    const entry: GuardianContact = {
      name,
      phone,
      relationship,
      ...(fcmToken ? { fcmToken } : {}),
    };

    const next = [...guardians, entry];
    localStorage.setItem('guardians', JSON.stringify(next));
    setGuardians(next);
    setName('');
    setPhone('');
    setRelationship('');
    setUseThisDeviceForPush(false);
    setSaved(true);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">보호자 설정</h1>
      <p className="text-sm text-gray-500">
        저혈당 등 위급 시 등록된 보호자 연락처를 안내합니다. 푸시 알림은 수신
        기기 토큰이 등록된 경우에만 전송됩니다.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">보호자 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="전화번호"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            placeholder="관계 (배우자, 자녀 등)"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          />
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={useThisDeviceForPush}
              onChange={(e) => setUseThisDeviceForPush(e.target.checked)}
            />
            <span>
              이 기기를 푸시 수신 기기로 등록 (데모·본인 기기 테스트용). 체크하지
              않으면 연락처만 저장되며, 위급 시 전화 안내만 표시됩니다.
            </span>
          </label>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={() => void handleSave()}
        disabled={!name || !phone || saving}
      >
        {saving ? '저장 중…' : '보호자 저장'}
      </Button>

      {saved && (
        <p className="text-center text-sm text-emerald-600">
          보호자 정보가 저장되었습니다.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      {guardians.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">등록된 보호자</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {guardians.map((g, i) => (
              <div key={`${g.phone}-${i}`} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {g.name}
                  {g.relationship ? ` (${g.relationship})` : ''}
                </p>
                <a
                  href={`tel:${g.phone.replace(/[^0-9+]/g, '')}`}
                  className="text-blue-700"
                >
                  {g.phone}
                </a>
                <p className="mt-1 text-xs text-gray-500">
                  {g.fcmToken
                    ? '푸시 수신 기기 등록됨'
                    : '푸시 미등록 — 위급 시 전화 안내만 가능'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
