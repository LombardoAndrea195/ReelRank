const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(value: string) {
  return value.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (match, hex, dec, name) => {
    if (name) return named[name.toLowerCase()] ?? match;
    const code = hex ? parseInt(hex, 16) : parseInt(dec, 10);
    try { return String.fromCodePoint(code); } catch { return match; }
  });
}
