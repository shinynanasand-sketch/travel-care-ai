interface VeganMarkerProps {
  name: string;
  level?: string;
  distanceM?: number;
}

export function VeganMarker({ name, level, distanceM }: VeganMarkerProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <span className="text-xl">🌱</span>
      <div>
        <p className="text-sm font-medium">{name}</p>
        {level && <p className="text-xs text-emerald-700">{level}</p>}
        {distanceM !== undefined && (
          <p className="text-xs text-gray-500">{distanceM}m</p>
        )}
      </div>
    </div>
  );
}
