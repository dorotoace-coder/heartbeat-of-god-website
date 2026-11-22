/** Only allow complete Zoom invitation URLs; reject arbitrary redirect destinations. */
export function isZoomInvitation(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && /^https:\/\/([a-z0-9-]+\.)?zoom\.us\/j\/[0-9]+\?pwd=[A-Za-z0-9._~%-]+$/.test(value);
}
