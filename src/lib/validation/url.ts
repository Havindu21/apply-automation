/**
 * Validates external job and application URLs to protect against SSRF,
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

  // Protocol check
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { isValid: false, error: `Disallowed URL protocol: '${parsed.protocol}'. Only http: and https: are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // SSRF Protection: Block localhost, loopbacks, private networks, and cloud metadata endpoints
  const isPrivateOrInternal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname === "169.254.169.254" || // AWS / GCP / Azure metadata endpoint
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  if (isPrivateOrInternal) {
    return { isValid: false, error: `SSRF Guard: Target hostname '${hostname}' is an internal or reserved network address.` };
  }

  return { isValid: true, cleanUrl: parsed.toString() };
}
