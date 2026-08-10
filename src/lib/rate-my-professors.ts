const RATE_MY_PROFESSORS_ORIGIN = "https://www.ratemyprofessors.com";

export function buildRateMyProfessorsSearchUrl(instructorName: string) {
  const encodedName = encodeURIComponent(instructorName.trim());
  return `${RATE_MY_PROFESSORS_ORIGIN}/search/professors/?q=${encodedName}`;
}

export function getSafeRateMyProfessorsProfileUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isRateMyProfessorsHost =
      url.hostname === "ratemyprofessors.com" ||
      url.hostname === "www.ratemyprofessors.com";
    const isProfessorProfile = url.pathname.startsWith("/professor/");

    return url.protocol === "https:" &&
      isRateMyProfessorsHost &&
      isProfessorProfile
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
