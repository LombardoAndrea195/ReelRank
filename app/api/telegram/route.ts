import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { contentType, isInstagramContentUrl, normalizeCreator } from "@/lib/instagram";

const usage = "Invia: /submit @creator https://instagram.com/reel/... Titolo opzionale";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) return new NextResponse("Unauthorized", { status: 401 });
  const update = await request.json(); const message = update.message as { text?: string; chat?: { id?: number } } | undefined; const text = message?.text?.trim() ?? ""; const url = text.match(/https?:\/\/[^\s]+/i)?.[0]; const creatorMatch = text.match(/@([A-Za-z0-9._]+)/);
  if (!url || !creatorMatch || !isInstagramContentUrl(url)) return reply(message?.chat?.id, `Link non valido. ${usage}`);
  const creatorUsername = normalizeCreator(creatorMatch[0]); const title = text.replace(/^\/submit\s*/i, "").replace(creatorMatch[0], "").replace(url, "").trim() || null; const db = adminDb(); const seasons = await db.collection("seasons").where("status", "==", "active").limit(1).get(); if (seasons.empty) return reply(message?.chat?.id, "Non c'è una stagione attiva al momento.");
  const season = seasons.docs[0]!; const duplicate = await db.collection("submissions").where("seasonId", "==", season.id).where("instagramUrl", "==", url).limit(1).get(); if (!duplicate.empty) return reply(message?.chat?.id, "Questo contenuto è già presente nella stagione.");
  await db.collection("creators").doc(creatorUsername).set({ instagramUsername: creatorUsername, createdAt: FieldValue.serverTimestamp() }, { merge: true }); await db.collection("submissions").add({ seasonId: season.id, creatorUsername, instagramUrl: url, contentType: contentType(url), title, status: "approved", source: "telegram", ratingTotal: 0, ratingCount: 0, likesCount: 0, commentsCount: 0, createdAt: FieldValue.serverTimestamp() }); return reply(message?.chat?.id, `Pubblicato per @${creatorUsername}. Ora è online e votabile.`);
}

async function reply(chatId: number | undefined, text: string) { if (chatId && process.env.TELEGRAM_BOT_TOKEN) await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) }); return NextResponse.json({ ok: true }); }
