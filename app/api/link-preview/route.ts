import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { contentType, isInstagramContentUrl, normalizeInstagramUrl } from "@/lib/instagram";

const blockedHosts = new Set(["localhost", "0.0.0.0", "127.0.0.1", "::1"]);

function privateAddress(address: string) {
  if (address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) return true;
  const parts = address.split(".").map(Number);
  return parts.length === 4 && (parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
}

async function publicUrl(value: unknown) {
  const url = new URL(String(value));
  if (!/^https?:$/.test(url.protocol) || blockedHosts.has(url.hostname) || url.hostname.endsWith(".local")) throw new Error("Inserisci un link pubblico valido.");
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.some(({ address }) => privateAddress(address))) throw new Error("Inserisci un link pubblico valido.");
  return url;
}

function meta(html: string, key: string) {
  const tag = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i").exec(html)?.[0];
  return tag?.match(/content=["']([^"']*)["']/i)?.[1]?.replaceAll("&amp;", "&");
}

export async function POST(request: NextRequest) {
  try {
    const requested = await publicUrl((await request.json()).url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(requested, { headers: { "user-agent": "ReelRank preview bot" }, redirect: "follow", signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return NextResponse.json({ error: "Il link non è raggiungibile." }, { status: 422 });

    const finalUrl = await publicUrl(response.url);
    const canonicalUrl = isInstagramContentUrl(finalUrl.href) ? normalizeInstagramUrl(finalUrl.href) : finalUrl.href;
    const html = (await response.text()).slice(0, 500_000);
    const title = meta(html, "og:title") ?? meta(html, "twitter:title") ?? finalUrl.hostname;
    const image = meta(html, "og:image") ?? meta(html, "twitter:image") ?? null;
    return NextResponse.json({ url: canonicalUrl, title, image, contentType: contentType(canonicalUrl) });
  } catch {
    return NextResponse.json({ error: "Non riesco a verificare questo link. Controlla che sia pubblico e riprova." }, { status: 422 });
  }
}
