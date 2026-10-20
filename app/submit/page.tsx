"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { contentType, isInstagramContentUrl, normalizeCreator } from "@/lib/instagram";
import { auth, db, isConfigured } from "@/lib/firebase";

export default function SubmitPage() {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured) return setMessage("Aggiungi prima le chiavi Supabase.");
    const formElement = event.currentTarget;
    const form = new FormData(formElement); const url = String(form.get("url")).trim(); const username = normalizeCreator(String(form.get("creator")));
    if (!isInstagramContentUrl(url)) return setMessage("Inserisci un link valido a un Reel o post Instagram.");
    const user = auth.currentUser; if (!user) return setMessage("Accedi prima di proporre un contenuto.");
    try { const seasons = await getDocs(query(collection(db, "seasons"), where("status", "==", "active"), limit(1))); if (seasons.empty) return setMessage("Non c'è una stagione attiva."); const creator = doc(db, "creators", username); if (!(await getDoc(creator)).exists()) await setDoc(creator, { instagramUsername: username, createdAt: serverTimestamp() }); await addDoc(collection(db, "submissions"), { seasonId: seasons.docs[0]!.id, creatorUsername: username, submittedByUserId: user.uid, instagramUrl: url, contentType: contentType(url), title: String(form.get("title")).trim() || null, status: "pending", source: "web", ratingTotal: 0, ratingCount: 0, likesCount: 0, commentsCount: 0, createdAt: serverTimestamp() }); setMessage("Contenuto inviato: sarà visibile dopo la verifica del team."); formElement.reset(); } catch (error) { setMessage(error instanceof Error ? error.message : "Non riesco a inviare il contenuto."); }
  }
  return <main className="submit"><nav><Link className="brand" href="/classifica">REEL<span>RANK</span></Link><div><Link href="/login">Accedi</Link><Link href="/classifica">Torna alla classifica</Link></div></nav><div className="submit-grid"><div><p className="season">NUOVA PROPOSTA</p><h1>Il merito va<br />al creator.</h1><p className="lede">Puoi segnalare il Reel o il post di chiunque. Indica sempre il profilo Instagram che l&apos;ha pubblicato originariamente.</p></div><form onSubmit={submit}><label>Link Instagram<input required name="url" type="url" placeholder="https://instagram.com/reel/..." /></label><label>Creator originale<input required name="creator" placeholder="@nomecreator" pattern="@?[A-Za-z0-9._]+" /></label><label>Titolo opzionale<input name="title" maxLength={100} placeholder="Una breve descrizione" /></label><button className="button">Invia alla stagione</button>{message && <p className="feedback" role="status">{message}</p>}<p className="fine-print">Confermi che il contenuto è attribuito al creator indicato e può essere valutato dalla community.</p></form></div></main>;
}
