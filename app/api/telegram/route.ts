import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { contentType, isInstagramContentUrl, normalizeCreator } from "@/lib/instagram";

const usage = "Invia: /submit @creator https://instagram.com/reel/... Titolo opzionale";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) return new NextResponse("Unauthorized", { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return new NextResponse("Server not configured", { status: 500 });
  const update = await request.json();
  const message = update.message as { text?: string; chat?: { id?: number } } | undefined;
  const text = message?.text?.trim() ?? "";
  const url = text.match(/https?:\/\/[^\s]+/i)?.[0];
  const creatorMatch = text.match(/@([A-Za-z0-9._]+)/);
  if (!url || !creatorMatch || !isInstagramContentUrl(url)) return reply(message?.chat?.id, `Link non valido. ${usage}`);
  const creatorName = normalizeCreator(creatorMatch[0]);
  const title = text.replace(/^\/submit\s*/i, "").replace(creatorMatch[0], "").replace(url, "").trim() || null;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: season } = await admin.from("seasons").select("id").eq("status", "active").maybeSingle();
  if (!season) return reply(message?.chat?.id, "Non c'è una stagione attiva al momento.");
  const { data: creator, error: creatorError } = await admin.from("creators").upsert({ instagram_username: creatorName }, { onConflict: "instagram_username", ignoreDuplicates: false }).select("id").single();
  if (creatorError) return reply(message?.chat?.id, "Non riesco a salvare il creator. Riprova.");
  const { error } = await admin.from("submissions").insert({ season_id: season.id, creator_id: creator.id, instagram_url: url, content_type: contentType(url), title, status: "approved", source: "telegram" });
  if (error?.code === "23505") return reply(message?.chat?.id, "Questo contenuto è già presente nella stagione.");
  return reply(message?.chat?.id, error ? "Non riesco a pubblicare il contenuto. Riprova." : `Pubblicato per @${creatorName}. Ora è online e votabile.`);
}

async function reply(chatId: number | undefined, text: string) {
  if (chatId && process.env.TELEGRAM_BOT_TOKEN) await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) });
  return NextResponse.json({ ok: true });
}
