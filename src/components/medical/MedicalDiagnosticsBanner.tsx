'use client';

import type { MedicalLookupMeta } from '@/types/medical.types';

/** HIRA/Kakao diagnostics banner — hidden by default for demo recordings. */
export function shouldShowMedicalDiagnostics(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_MEDICAL_DIAGNOSTICS === 'true';
}

function shortHiraHint(message?: string): string {
  if (!message) return '';
  if (
    /SERVICE_KEY_IS_NOT_REGISTERED|등록되지 않은 서비스키|returnReasonCode.:.?30/.test(
      message
    )
  ) {
    return '공공데이터포털에서 「병원정보서비스」「약국정보서비스」에 지금 쓰는 인증키가 연결·승인돼 있는지 확인하세요. Decoding 키를 Vercel PUBLIC_DATA_API_KEY에 넣었는지도 확인하세요.';
  }
  if (/timeout/i.test(message)) {
    return '심평원 응답이 느려 시간 초과되었습니다. 잠시 후 다시 코스를 생성해 보세요.';
  }
  return message.length > 180 ? `${message.slice(0, 180)}…` : message;
}

/** 일반 사용자용 — mock 소스일 때만 항상 표시 */
export function MedicalSampleBanner({
  meta,
}: {
  meta: MedicalLookupMeta | null | undefined;
}) {
  if (!meta || meta.source !== 'mock') return null;
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
    >
      표시된 병원·약국 일부는 샘플(참고용) 위치일 수 있습니다. 실제 방문 전
      전화·지도로 확인해 주세요.
    </div>
  );
}

export function MedicalDiagnosticsBanner({
  meta,
  label = '의료 데이터',
}: {
  meta: MedicalLookupMeta | null | undefined;
  label?: string;
}) {
  // 사용자용 mock 안내는 항상, 개발 배너는 플래그 on일 때만
  const showDev = shouldShowMedicalDiagnostics();
  if (!meta) return null;

  if (!showDev) {
    return <MedicalSampleBanner meta={meta} />;
  }

  if (!meta.hiraFailed && meta.source === 'hira') return null;

  const sourceLabel =
    meta.source === 'kakao'
      ? '카카오 Local (HIRA 폴백)'
      : meta.source === 'mock'
        ? '샘플(mock)'
        : '심평원 HIRA';

  return (
    <div className="space-y-2">
      <MedicalSampleBanner meta={meta} />
      <div
        role="status"
        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950"
      >
        <p className="font-semibold">
          [개발] {label}: 소스={sourceLabel}
          {meta.hiraFailed ? ' · HIRA 실패/빈결과' : ''}
        </p>
        {meta.hiraMessage ? (
          <p className="mt-1 text-amber-800/90">{shortHiraHint(meta.hiraMessage)}</p>
        ) : null}
        {meta.source === 'kakao' ? (
          <p className="mt-0.5 text-amber-800/80">
            심평원 API를 쓸 수 없어 카카오 장소 검색(병원 HP8 · 약국 PM9)으로
            대체했습니다. (앱 기능은 정상, 참고용 배너)
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function MedicalSourceBadge({ source }: { source?: string }) {
  if (!source || source === 'hira') return null;
  const text =
    source === 'kakao' ? '카카오' : source === 'mock' ? '샘플' : source;
  return (
    <span className="ml-1 rounded bg-gray-200 px-1 py-0.5 text-[10px] font-medium text-gray-700">
      {text}
    </span>
  );
}
