import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!bearer) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

    const user = await adminAuth().verifyIdToken(bearer);
    const { action, submissionId, value } = await request.json();
    if (typeof submissionId !== "string" || !submissionId) return NextResponse.json({ error: "Contenuto non valido." }, { status: 400 });

    const db = adminDb();
    const [access, admin] = await Promise.all([
      db.collection("rankingAccess").doc(user.uid).get(),
      db.collection("admins").doc(user.uid).get(),
    ]);
    if (!access.exists && !admin.exists) return NextResponse.json({ error: "Non sei abilitato alla classifica." }, { status: 403 });

    const submission = db.collection("submissions").doc(submissionId);
    const snapshot = await submission.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Contenuto non trovato." }, { status: 404 });
    const content = snapshot.data()!;
    if (content.status !== "approved") return NextResponse.json({ error: "Questo contenuto non è votabile." }, { status: 403 });
    const season = await db.collection("seasons").doc(content.seasonId).get();
    if (season.data()?.status !== "active") return NextResponse.json({ error: "La stagione non è attiva." }, { status: 403 });

    if (action === "rate") {
      const score = Number(value);
      if (!Number.isInteger(score) || score < 1 || score > 10) return NextResponse.json({ error: "Voto non valido." }, { status: 400 });

      const rating = submission.collection("ratings").doc(user.uid);
      const result = await db.runTransaction(async (tx) => {
        const [currentSubmission, previous] = await Promise.all([tx.get(submission), tx.get(rating)]);
        if (!currentSubmission.exists) throw new Error("Contenuto non trovato.");

        const current = currentSubmission.data()!;
        const oldScore = previous.exists ? Number(previous.data()!.score) : 0;
        const ratingTotal = Number(current.ratingTotal ?? 0) - oldScore + score;
        const ratingCount = Number(current.ratingCount ?? 0) + (previous.exists ? 0 : 1);

        tx.set(rating, { score, updatedAt: FieldValue.serverTimestamp() });
        tx.update(submission, { ratingTotal, ratingCount });
        return { ratingTotal, ratingCount };
      });

      return NextResponse.json({ ok: true, score, ...result });
    }
    if (action === "like") { const like = submission.collection("likes").doc(user.uid); const existing = await like.get(); const liked = !existing.exists; await db.runTransaction(async (tx) => { if (liked) { tx.set(like, { createdAt: FieldValue.serverTimestamp() }); tx.update(submission, { likesCount: (content.likesCount ?? 0) + 1 }); } else { tx.delete(like); tx.update(submission, { likesCount: Math.max(0, (content.likesCount ?? 0) - 1) }); } }); return NextResponse.json({ ok: true, liked }); }
    if (action === "comment") { const body = String(value ?? "").trim(); if (!body || body.length > 1000) return NextResponse.json({ error: "Commento non valido." }, { status: 400 }); const profile = await db.collection("users").doc(user.uid).get(); const username = profile.data()?.username ?? user.email?.split("@")[0] ?? "utente"; const comment = await submission.collection("comments").add({ body, username, userId: user.uid, status: "visible", createdAt: FieldValue.serverTimestamp() }); await submission.update({ commentsCount: FieldValue.increment(1) }); return NextResponse.json({ ok: true, id: comment.id, username }); }
    return NextResponse.json({ error: "Azione non valida." }, { status: 400 });
  } catch { return NextResponse.json({ error: "Operazione non riuscita." }, { status: 500 }); }
}
