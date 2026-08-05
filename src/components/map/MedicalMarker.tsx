interface MedicalMarkerProps {
  name: string;
  type: 'HOSPITAL' | 'PHARMACY' | 'EMERGENCY';
  distanceM: number;
}

const icons = {
  HOSPITAL: '🏥',
  PHARMACY: '💊',
  EMERGENCY: '🚨',
};

export function MedicalMarker({ name, type, distanceM }: MedicalMarkerProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <span className="text-xl">{icons[type]}</span>
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-gray-500">{distanceM}m</p>
      </div>
    </div>
  );
}
