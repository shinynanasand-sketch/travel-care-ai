interface MedicalMarkerProps {
  name: string;
  type: 'HOSPITAL' | 'PHARMACY' | 'EMERGENCY';
  distanceM: number;
  address?: string;
  phone?: string;
}

const icons = {
  HOSPITAL: '🏥',
  PHARMACY: '💊',
  EMERGENCY: '🚨',
};

export function MedicalMarker({
  name,
  type,
  distanceM,
  address,
  phone,
}: MedicalMarkerProps) {
  const phoneHref = phone?.replace(/[^0-9+]/g, '');

  return (
    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <span className="text-xl leading-none">{icons[type]}</span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <p className="shrink-0 text-xs text-gray-500">{distanceM}m</p>
        </div>
        {address ? (
          <p className="text-xs leading-snug text-gray-600">{address}</p>
        ) : null}
        {phone ? (
          <a
            href={phoneHref ? `tel:${phoneHref}` : undefined}
            className="inline-block text-xs font-medium text-blue-700 underline-offset-2 hover:underline"
          >
            {phone}
          </a>
        ) : null}
      </div>
    </div>
  );
}
