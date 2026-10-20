"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { auth, db, isConfigured } from "@/lib/firebase";

export default function SubmitPage() {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured) return setMessage("Aggiungi prima le chiavi Supabase.");
    const formElement = event.currentTarget;
    const form = new FormData(formElement); const rawUrl = String(form.get("url")).trim(); const username = String(form.get("creator")).trim().replace(/^@/, "").toLowerCase();
    if (!rawUrl) return setMessage("Inserisci un link da verificare.");
    const user = auth.currentUser; if (!user) return setMessage("Accedi prima di proporre un contenuto.");
    try { setMessage("Verifico il link…"); const previewResponse = await fetch("/api/link-preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: rawUrl }) }); const preview = await previewResponse.json(); if (!previewResponse.ok) return setMessage(preview.error ?? "Link non valido."); const [seasons, access, admin] = await Promise.all([getDocs(query(collection(db, "seasons"), where("status", "==", "active"), limit(1))), getDoc(doc(db, "rankingAccess", user.uid)), getDoc(doc(db, "admins", user.uid))]); if (seasons.empty) return setMessage("Non c'è una stagione attiva."); const status = access.exists() || admin.exists() ? "approved" : "pending"; const creator = doc(db, "creators", username); if (!(await getDoc(creator)).exists()) await setDoc(creator, { instagramUsername: username, createdAt: serverTimestamp() }); await addDoc(collection(db, "submissions"), { seasonId: seasons.docs[0]!.id, creatorUsername: username, submittedByUserId: user.uid, instagramUrl: preview.url, contentType: preview.contentType, title: String(form.get("title")).trim() || preview.title || null, previewImage: preview.image, status, source: "web", ratingTotal: 0, ratingCount: 0, likesCount: 0, commentsCount: 0, createdAt: serverTimestamp() }); setMessage(status === "approved" ? "Link verificato e pubblicato subito in classifica." : "Link verificato e contenuto inviato: sarà visibile dopo la verifica del team."); formElement.reset(); } catch (error) { setMessage(error instanceof Error ? error.message : "Non riesco a inviare il contenuto."); }
  }
  return <main className="submit"><nav><Link className="brand" href="/classifica">REEL<span>RANK</span></Link><div><Link href="/login">Accedi</Link><Link href="/classifica">Torna alla classifica</Link></div></nav><div className="submit-grid"><div><p className="season">NUOVA PROPOSTA</p><h1>Il merito va<br />al creator.</h1><p className="lede">Puoi segnalare un Reel, un post o qualsiasi pagina pubblica. Il link viene verificato e l&apos;anteprima viene recuperata automaticamente.</p></div><form onSubmit={submit}><label>Link del contenuto<input required name="url" type="url" placeholder="https://…" /></label><label>Creator originale<input required name="creator" placeholder="@nomecreator" pattern="@?[A-Za-z0-9._]+" /></label><label>Titolo opzionale<input name="title" maxLength={100} placeholder="Usa quello trovato automaticamente" /></label><button className="button">Verifica e invia</button>{message && <p className="feedback" role="status">{message}</p>}<p className="fine-print">Confermi che il contenuto è attribuito al creator indicato e può essere valutato dalla community.</p></form></div></main>;
}
