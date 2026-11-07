export const PERSONAL_DETAILS_STORAGE_KEY = "nbe_personal_details";

export type PersonalDetails = {
  fullName: string;
  email: string;
  phone: string;
  nationalId: string;
  companyName: string;
};

function parseDetails(raw: string | null): PersonalDetails | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<PersonalDetails>;
    return {
      fullName: typeof value.fullName === "string" ? value.fullName : "",
      email: typeof value.email === "string" ? value.email : "",
      phone: typeof value.phone === "string" ? value.phone : "",
      nationalId: typeof value.nationalId === "string" ? value.nationalId : "",
      companyName: typeof value.companyName === "string" ? value.companyName : "",
    };
  } catch {
    return null;
  }
}

export function readPersonalDetails(): PersonalDetails | null {
  if (typeof window === "undefined") return null;

  try {
    const local = parseDetails(window.localStorage.getItem(PERSONAL_DETAILS_STORAGE_KEY));
    if (local) return local;
  } catch {
    void 0;
  }

  try {
    return parseDetails(window.sessionStorage.getItem(PERSONAL_DETAILS_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasCompletePersonalDetails(details: PersonalDetails | null): boolean {
  return Boolean(details?.fullName && details.email && details.phone && details.nationalId);
}

export function savePersonalDetails(details: PersonalDetails): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(details);

  try {
    window.localStorage.setItem(PERSONAL_DETAILS_STORAGE_KEY, raw);
  } catch {
    void 0;
  }

  try {
    window.sessionStorage.setItem(PERSONAL_DETAILS_STORAGE_KEY, raw);
  } catch {
    void 0;
  }
}
