export function isInstagramContentUrl(value: string) {
  try {
    const url = new URL(value);
    return ["instagram.com", "www.instagram.com"].includes(url.hostname) && /\/(reel|p)\//.test(url.pathname);
  } catch {
    return false;
  }
}

export function contentType(url: string) {
  return new URL(url).pathname.includes("/reel/") ? "reel" : "post";
}

export function normalizeCreator(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}
