/** The public URL PayPal redirects back to. Set APP_URL to your tunnel or Render URL. */
export function baseUrl(req: Request): string {
  return (process.env.APP_URL ?? new URL(req.url).origin).replace(/\/$/, "");
}
