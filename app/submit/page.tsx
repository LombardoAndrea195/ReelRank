"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { contentType, isInstagramContentUrl, normalizeCreator } from "@/lib/instagram";
import { isConfigured, supabase } from "@/lib/supabase";

export default function SubmitPage() {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured) return setMessage("Aggiungi prima le chiavi Supabase.");
    const form = new FormData(event.currentTarget); const url = String(form.get("url")).trim(); const username = normalizeCreator(String(form.get("creator")));
    if (!isInstagramContentUrl(url)) return setMessage("Inserisci un link valido a un Reel o post Instagram.");
    const { data: user } = await supabase.auth.getUser(); if (!user.user) return setMessage("Accedi prima di proporre un contenuto.");
    const { data: season } = await supabase.from("seasons").select("id").eq("status", "active").maybeSingle(); if (!season) return setMessage("Non c'è una stagione attiva.");
    let { data: creator } = await supabase.from("creators").select("id").eq("instagram_username", username).maybeSingle();
    if (!creator) { const result = await supabase.from("creators").insert({ instagram_username: username }).select("id").single(); creator = result.data; if (result.error) return setMessage(result.error.message); }
    const { error } = await supabase.from("submissions").insert({ season_id: season.id, creator_id: creator!.id, submitted_by_user_id: user.user.id, instagram_url: url, content_type: contentType(url), title: String(form.get("title")).trim() || null });
    setMessage(error ? error.message : "Contenuto inviato: sarà visibile dopo la verifica del team."); if (!error) event.currentTarget.reset();
  }
  return <main className="submit"><nav><Link className="brand" href="/">REEL<span>RANK</span></Link><Link href="/">Torna alla classifica</Link></nav><div className="submit-grid"><div><p className="season">NUOVA PROPOSTA</p><h1>Il merito va<br />al creator.</h1><p className="lede">Puoi segnalare il Reel o il post di chiunque. Indica sempre il profilo Instagram che l&apos;ha pubblicato originariamente.</p></div><form onSubmit={submit}><label>Link Instagram<input required name="url" type="url" placeholder="https://instagram.com/reel/..." /></label><label>Creator originale<input required name="creator" placeholder="@nomecreator" pattern="@?[A-Za-z0-9._]+" /></label><label>Titolo opzionale<input name="title" maxLength={100} placeholder="Una breve descrizione" /></label><button className="button">Invia alla stagione</button>{message && <p className="feedback" role="status">{message}</p>}<p className="fine-print">Confermi che il contenuto è attribuito al creator indicato e può essere valutato dalla community.</p></form></div></main>;
}
