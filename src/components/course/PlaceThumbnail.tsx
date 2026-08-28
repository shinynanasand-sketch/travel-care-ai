'use client';

const KIND_EMOJI: Record<string, string> = {
  ATTRACTION: '🏛️',
  RESTAURANT: '🍽️',
  WELLNESS: '🌿',
};

interface PlaceThumbnailProps {
  src?: string;
  alt: string;
  kind?: 'ATTRACTION' | 'RESTAURANT' | 'WELLNESS';
  className?: string;
}

export function PlaceThumbnail({
  src,
  alt,
  kind = 'ATTRACTION',
  className = 'h-40 w-full',
}: PlaceThumbnailProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`rounded-lg object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100 ${className}`}
      aria-hidden
    >
      <span className="text-3xl opacity-80">{KIND_EMOJI[kind] ?? '📍'}</span>
    </div>
  );
}
