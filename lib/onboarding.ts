export const ONBOARDED_KEY = "along_onboarded";

export function hasOnboarded() {
  return typeof window !== "undefined" && localStorage.getItem(ONBOARDED_KEY) === "true";
}

export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "true");
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDED_KEY);
}
