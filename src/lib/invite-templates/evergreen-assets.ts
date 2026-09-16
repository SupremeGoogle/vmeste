export const EVERGREEN_SAMPLE_IMAGES = [
  "/media/invite-evergreen/couple.webp",
  "/media/invite-evergreen/venue.webp",
  "/media/invite-evergreen/rings.webp",
  "/media/invite-evergreen/dinner.webp",
  "/media/invite-evergreen/dance.webp",
] as const;

export function isEvergreenSampleImage(value: string): boolean {
  return EVERGREEN_SAMPLE_IMAGES.some((image) => image === value);
}
