"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isConfigured, supabase } from "@/lib/supabase";

type Submission = { id: string; instagram_url: string; content_type: string; title: string | null; created_at: string; creators: { instagram_username: string }[] };

export default function AdminPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [status, setStatus] = useState("Controllo autorizzazione…");
  useEffect(() => { void load(); }, []);
  async function load() {
    if (!isConfigured) return setStatus("Configura Supabase per usare la moderazione.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setStatus("Accedi con un account admin per continuare.");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
    if (profile?.role !== "admin") return setStatus("Non hai i permessi per moderare i contenuti.");
    const { data, error } = await supabase.from("submissions").select("id,instagram_url,content_type,title,created_at,creators(instagram_username)").eq("status", "pending").order("created_at", { ascending: true });
    if (error) return setStatus(error.message);
    setItems((data ?? []) as Submission[]); setStatus("");
  }
  async function moderate(id: string, nextStatus: "approved" | "hidden") {
    const { error } = await supabase.from("submissions").update({ status: nextStatus }).eq("id", id);
    if (error) return setStatus(error.message);
    setItems((current) => current.filter((item) => item.id !== id));
  }
  return <main className="admin"><nav><Link className="brand" href="/">REEL<span>RANK</span></Link><Link href="/">Torna alla classifica</Link></nav><section><p className="season">MODERAZIONE</p><h1>Proposte da verificare</h1><p className="lede">Controlla link e attribuzione prima di pubblicare il contenuto.</p>{status && <p className="feedback">{status}</p>}{!status && !items.length && <div className="empty"><h2>Tutto in ordine.</h2><p>Non ci sono proposte da approvare.</p></div>}<div className="moderation-list">{items.map((item) => <article key={item.id}><div><p className="content-type">{item.content_type}</p><h2>{item.title ?? "Senza titolo"}</h2><p>Creator indicato: <strong>@{item.creators[0]?.instagram_username}</strong></p><a href={item.instagram_url} target="_blank" rel="noreferrer">Apri il contenuto Instagram</a></div><div className="moderation-actions"><button className="button" onClick={() => moderate(item.id, "approved")}>Approva</button><button className="button ghost" onClick={() => moderate(item.id, "hidden")}>Nascondi</button></div></article>)}</div></section></main>;
}
