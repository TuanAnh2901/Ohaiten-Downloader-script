/**
 * Netscape cookies.txt parsing + conversion to Playwright / HTTP header forms.
 *
 * Netscape format (7 tab-separated fields):
 *   domain  includeSubdomains(TRUE/FALSE)  path  secure(TRUE/FALSE)
 *   expires(epoch sec, 0 = session)  name  value
 * Comment lines start with `#`. `#HttpOnly_` may prefix the domain field.
 */

export interface ParsedCookie {
  domain: string;
  includeSubdomains: boolean;
  path: string;
  secure: boolean;
  /** Epoch seconds; 0 = session cookie. */
  expires: number;
  name: string;
  value: string;
  httpOnly: boolean;
}

/** Structural subset of Playwright's `Cookie` type (addCookies). */
export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  /** Epoch seconds; -1 = session cookie (Playwright convention). */
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

const HTTP_ONLY_PREFIX = '#HttpOnly_';

export function parseNetscapeFile(content: string): ParsedCookie[] {
  const cookies: ParsedCookie[] = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // #HttpOnly_ is a domain-prefix marker, not a comment.
    const isHttpOnly = trimmed.startsWith(HTTP_ONLY_PREFIX);
    if (!isHttpOnly && trimmed.startsWith('#')) continue;

    const parts = trimmed.split('\t');
    if (parts.length < 7) continue;

    let domain = parts[0];
    const httpOnly = isHttpOnly;
    if (httpOnly) domain = domain.slice(HTTP_ONLY_PREFIX.length);

    cookies.push({
      domain,
      includeSubdomains: parts[1] === 'TRUE',
      path: parts[2],
      secure: parts[3] === 'TRUE',
      expires: Number(parts[4]),
      name: parts[5],
      value: parts[6],
      httpOnly,
    });
  }
  return cookies;
}

export function toPlaywrightCookies(
  parsed: ParsedCookie[],
): PlaywrightCookie[] {
  return parsed.map((c) => ({
    name: c.name,
    value: c.value,
    // Playwright needs a leading dot so the cookie matches subdomains.
    domain: c.domain.startsWith('.') ? c.domain : `.${c.domain}`,
    path: c.path,
    // Playwright uses -1 for session cookies.
    expires: c.expires === 0 ? -1 : c.expires,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: 'Lax',
  }));
}


