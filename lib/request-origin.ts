/** Compare with the browser-facing address, not Next.js's internal bind address. */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;

  const internalUrl = new URL(request.url);
  // Reverse proxies must overwrite these headers with the original public address.
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0].trim() ||
    request.headers.get('host') ||
    internalUrl.host;
  const protocol =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    internalUrl.protocol.slice(0, -1);
  if (!['http', 'https'].includes(protocol)) return false;
  try {
    const expected = new URL(`${protocol}://${host}`);
    const supplied = new URL(origin);
    return (
      expected.host === host && supplied.origin === origin && supplied.origin === expected.origin
    );
  } catch {
    return false;
  }
}
