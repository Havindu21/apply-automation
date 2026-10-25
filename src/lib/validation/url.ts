import * as net from "net";
import * as dns from "dns/promises";

/**
 * Validates whether an IP address is a private, reserved, loopback,
 * or cloud metadata address.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip) return true;

  // Check IPv4
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [b0, b1] = parts;

    if (b0 === 0) return true; // 0.0.0.0/8 Current network
    if (b0 === 10) return true; // 10.0.0.0/8 Private
    if (b0 === 127) return true; // 127.0.0.0/8 Loopback
    if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 Link-local / Cloud Metadata
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12 Private
    if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16 Private
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true; // 100.64.0.0/10 Carrier-grade NAT
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true; // 198.18.0.0/15 Benchmark
    if (b0 >= 224) return true; // 224.0.0.0/4 Multicast & 240.0.0.0/4 Reserved
    return false;
  }

  // Check IPv6
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fe80:")) return true; // Link-local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // Unique local fc00::/7
    // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (normalized.includes("::ffff:")) {
      const v4Part = normalized.split("::ffff:")[1];
      if (v4Part && net.isIPv4(v4Part)) {
        return isPrivateOrReservedIp(v4Part);
      }
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Synchronously checks external job and application URLs to protect against SSRF,
 * private network probing, and malicious protocol handlers.
 */
export function validateSafeJobUrl(rawUrl: string): { isValid: boolean; error?: string; cleanUrl?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "URL is required" };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }

  // Protocol check: strictly http and https only
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      isValid: false,
      error: `Disallowed URL protocol: '${parsed.protocol}'. Only http: and https: are permitted.`,
    };
  }

  // Reject embedded credentials (e.g. https://user:pass@example.com)
  if (parsed.username || parsed.password) {
    return { isValid: false, error: "URLs with embedded credentials are not allowed." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Strip brackets from IPv6 hostnames like [::1]
  const cleanHostname = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  // SSRF Protection: Static checks for loopbacks, private networks, and cloud metadata
  if (
    cleanHostname === "localhost" ||
    cleanHostname.endsWith(".localhost") ||
    cleanHostname.endsWith(".internal") ||
    cleanHostname.endsWith(".local") ||
    cleanHostname.endsWith(".arpa") ||
    cleanHostname === "metadata.google.internal"
  ) {
    return {
      isValid: false,
      error: `SSRF Guard: Target hostname '${hostname}' is an internal or reserved network domain.`,
    };
  }

  // If hostname is directly an IP literal, evaluate it
  if (net.isIP(cleanHostname)) {
    if (isPrivateOrReservedIp(cleanHostname)) {
      return {
        isValid: false,
        error: `SSRF Guard: Target IP '${cleanHostname}' is a private or reserved network address.`,
      };
    }
  }

  // Check for common decimal/octal/hex encoded IP tricks (e.g., 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(cleanHostname)) {
    return { isValid: false, error: "Numeric decimal IP hostnames are disallowed." };
  }
  if (/^0x[0-9a-f]+$/i.test(cleanHostname)) {
    return { isValid: false, error: "Hexadecimal IP hostnames are disallowed." };
  }

  return { isValid: true, cleanUrl: parsed.toString() };
}

/**
 * Asynchronously validates external URLs, resolving DNS to detect DNS rebinding
 * and domains pointing to internal or reserved IP addresses.
 */
export async function validateSafeJobUrlAsync(
  rawUrl: string
): Promise<{ isValid: boolean; error?: string; cleanUrl?: string; resolvedIps?: string[] }> {
  const syncCheck = validateSafeJobUrl(rawUrl);
  if (!syncCheck.isValid || !syncCheck.cleanUrl) {
    return syncCheck;
  }

  const parsed = new URL(syncCheck.cleanUrl);
  const hostname = parsed.hostname.toLowerCase();
  const cleanHostname = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  // If already an IP address, synchronous check handled it
  if (net.isIP(cleanHostname)) {
    return { isValid: true, cleanUrl: syncCheck.cleanUrl, resolvedIps: [cleanHostname] };
  }

  try {
    const records = await dns.lookup(cleanHostname, { all: true });
    if (!records || records.length === 0) {
      return { isValid: false, error: `DNS resolution failed for hostname '${cleanHostname}'` };
    }

    const resolvedIps = records.map((r) => r.address);
    for (const record of records) {
      if (isPrivateOrReservedIp(record.address)) {
        return {
          isValid: false,
          error: `SSRF Guard: Hostname '${cleanHostname}' resolved to private/reserved IP '${record.address}'.`,
        };
      }
    }

    return { isValid: true, cleanUrl: syncCheck.cleanUrl, resolvedIps };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "DNS resolution error";
    return { isValid: false, error: `DNS lookup failed for '${cleanHostname}': ${msg}` };
  }
}

/**
 * SSRF-Safe Fetch: Performs HTTP requests while strictly validating all target
 * hostnames and HTTP redirect locations against DNS rebinding and internal IP access.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
  maxRedirects: number = 5
): Promise<Response> {
  let currentUrl = url;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const validation = await validateSafeJobUrlAsync(currentUrl);
    if (!validation.isValid || !validation.cleanUrl) {
      throw new Error(`SSRF Guard blocked request to '${currentUrl}': ${validation.error}`);
    }

    const response = await fetch(validation.cleanUrl, {
      ...init,
      redirect: "manual", // Prevent automatic redirect following
    });

    // Check for 3xx redirect status
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        return response; // No redirect header, return as is
      }

      // Resolve relative redirect location against current URL
      const redirectUrl = new URL(location, validation.cleanUrl).toString();
      currentUrl = redirectUrl;
      redirectsRemaining--;
      continue;
    }

    return response;
  }

  throw new Error(`SSRF Guard: Exceeded maximum redirects (${maxRedirects}) for '${url}'`);
}
