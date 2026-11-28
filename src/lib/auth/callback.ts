/** Where to go after signing in. Only Pulse OS pages on this site; anything else goes to /admin. */
export function safeCallback(search: string) {
  const value = new URLSearchParams(search).get("callbackUrl");
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) return "/admin";
  try {
    const url = new URL(value, "https://placeholder.invalid");
    if (url.origin !== "https://placeholder.invalid" || !url.pathname.startsWith("/admin")) return "/admin";
    return url.pathname + url.search;
  } catch { return "/admin"; }
}
