'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { MedicalSummary } from '@/lib/medical/medicalSummary';

interface MedicalSummaryModalProps {
  open: boolean;
  onClose: () => void;
  summary: MedicalSummary;
}

export function MedicalSummaryModal({
  open,
  onClose,
  summary,
}: MedicalSummaryModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medical-summary-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="닫기"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div
          className={cn(
            'px-5 py-4 text-center',
            summary.isCrisis
              ? 'bg-red-600 text-white'
              : 'bg-emerald-600 text-white'
          )}
        >
          <p className="text-sm font-medium opacity-90">의료진 확인용</p>
          <h2 id="medical-summary-title" className="mt-1 text-xl font-bold">
            내 상태 요약
          </h2>
        </div>

        <div className="space-y-5 p-5">
          {summary.bloodSugar !== null ? (
            <div
              className={cn(
                'rounded-xl border-2 p-5 text-center',
                summary.isCrisis
                  ? 'border-red-300 bg-red-50'
                  : 'border-emerald-200 bg-emerald-50'
              )}
            >
              <p
                className={cn(
                  'text-lg font-bold uppercase tracking-wide',
                  summary.isCrisis ? 'text-red-700' : 'text-emerald-700'
                )}
              >
                {summary.crisisLabel}
              </p>
              <p
                className={cn(
                  'mt-2 text-5xl font-black tabular-nums leading-none',
                  summary.isCrisis ? 'text-red-600' : 'text-emerald-600'
                )}
              >
                {summary.bloodSugar}
              </p>
              <p
                className={cn(
                  'mt-1 text-lg font-semibold',
                  summary.isCrisis ? 'text-red-600' : 'text-emerald-600'
                )}
              >
                mg/dL
              </p>
              <p
                className={cn(
                  'mt-4 text-xl font-bold leading-snug',
                  summary.isCrisis ? 'text-red-800' : 'text-emerald-800'
                )}
              >
                {summary.crisisAction}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
              <p className="text-lg font-bold text-amber-800">혈당 미기록</p>
              <p className="mt-2 text-base text-amber-900">{summary.crisisAction}</p>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-500">프로필 정보</p>
            <ul className="space-y-2">
              {summary.profileLines.map((line) => (
                <li key={line} className="text-lg font-medium text-gray-900">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-gray-100 p-4">
            <p className="text-base font-semibold leading-relaxed text-gray-800">
              {summary.displayText}
            </p>
          </div>

          <p className="text-center text-xs text-gray-400">
            AI 분석 및 본 화면 정보는 참고용이며 의료 진단·처방을 대체하지 않습니다.
          </p>

          <Button variant="outline" className="w-full" size="lg" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
