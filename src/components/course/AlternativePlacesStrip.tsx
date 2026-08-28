'use client';

import type { CourseAlternativePlace } from '@/types/course.types';
import { PlaceThumbnail } from './PlaceThumbnail';

const KIND_LABEL: Record<CourseAlternativePlace['kind'], string> = {
  ATTRACTION: '명소',
  RESTAURANT: '식당',
  WELLNESS: '웰니스',
};

interface AlternativePlacesStripProps {
  places: CourseAlternativePlace[];
}

export function AlternativePlacesStrip({ places }: AlternativePlacesStripProps) {
  if (places.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          💡 이런 곳은 어떠세요?
        </h2>
        <p className="text-sm text-gray-500">
          메인 코스에 담기지 않은 다른 추천 장소입니다.
        </p>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-thin">
        {places.map((place) => (
          <article
            key={place.contentId}
            className="w-36 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
          >
            <PlaceThumbnail
              src={place.imageUrl}
              alt={place.title}
              kind={place.kind}
              className="h-28 w-full rounded-none"
            />
            <div className="space-y-0.5 p-2">
              <span className="inline-block rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                {KIND_LABEL[place.kind]}
              </span>
              <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-900">
                {place.title}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
