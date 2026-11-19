/**
 * Guard for the cron routes in vercel.json. Vercel Cron sends
 * "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set on the
 * project. Without CRON_SECRET the routes refuse every call (inert).
 */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
