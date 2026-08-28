export type MedicalFacilityType = 'HOSPITAL' | 'PHARMACY' | 'EMERGENCY';

export type MedicalDataSource = 'hira' | 'kakao' | 'mock';

export interface MedicalFacility {
  name: string;
  type: MedicalFacilityType;
  address: string;
  phone: string;
  coordinates: { lat: number; lng: number };
  distanceM: number;
  availableBeds?: number;
  /** Where this row came from (for diagnostics / UI badge). */
  source?: MedicalDataSource;
}

export interface MedicalLookupMeta {
  source: MedicalDataSource;
  hiraFailed: boolean;
  hiraMessage?: string;
}
