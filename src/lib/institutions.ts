export interface InstitutionOption {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  country: "US" | "CA";
  timeZone: string;
}

export function institutionLocation(institution: InstitutionOption) {
  return [institution.city, institution.region, institution.country]
    .filter(Boolean)
    .join(", ");
}
