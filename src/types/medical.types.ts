export type MedicalFacilityType = 'HOSPITAL' | 'PHARMACY' | 'EMERGENCY';

export interface MedicalFacility {
  name: string;
  type: MedicalFacilityType;
  address: string;
  phone: string;
  coordinates: { lat: number; lng: number };
  distanceM: number;
  availableBeds?: number;
}
