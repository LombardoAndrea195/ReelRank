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

export function normalizeInstagramUrl(value: string) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/(reel|p)\/([^/]+)/);
  if (!match) throw new Error("Inserisci un link valido a un Reel o post Instagram.");
  return `https://www.instagram.com/${match[1]}/${match[2]}/`;
}

export function instagramEmbedUrl(value: string) {
  const url = normalizeInstagramUrl(value);
  return `${url}embed/`;
}

export function normalizeCreator(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}
