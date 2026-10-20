"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore";
import { auth, db, isConfigured } from "@/lib/firebase";

type Submission = { id: string; instagramUrl: string; contentType: string; title?: string; creatorUsername: string };

export default function AdminPage() {
  const [items, setItems] = useState<Submission[]>([]); const [status, setStatus] = useState("Controllo autorizzazione…");
  useEffect(() => { void load(); }, []);
  async function load() { if (!isConfigured) return setStatus("Configura Firebase per usare la moderazione."); const user = auth.currentUser; if (!user) return setStatus("Accedi con un account admin per continuare."); if (!(await getDoc(doc(db, "admins", user.uid))).exists()) return setStatus("Non hai i permessi per moderare i contenuti."); const pending = await getDocs(query(collection(db, "submissions"), where("status", "==", "pending"), orderBy("createdAt", "asc"))); setItems(pending.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Submission, "id">) }))); setStatus(""); }
  async function moderate(id: string, status: "approved" | "hidden") { try { await updateDoc(doc(db, "submissions", id), { status }); setItems((current) => current.filter((item) => item.id !== id)); } catch { setStatus("Non riesco a modificare questo contenuto."); } }
  return <main className="admin"><nav><Link className="brand" href="/">REEL<span>RANK</span></Link><Link href="/">Torna alla classifica</Link></nav><section><p className="season">MODERAZIONE</p><h1>Proposte da verificare</h1><p className="lede">Controlla link e attribuzione prima di pubblicare il contenuto.</p>{status && <p className="feedback">{status}</p>}{!status && !items.length && <div className="empty"><h2>Tutto in ordine.</h2><p>Non ci sono proposte da approvare.</p></div>}<div className="moderation-list">{items.map((item) => <article key={item.id}><div><p className="content-type">{item.contentType}</p><h2>{item.title ?? "Senza titolo"}</h2><p>Creator indicato: <strong>@{item.creatorUsername}</strong></p><a href={item.instagramUrl} target="_blank" rel="noreferrer">Apri il contenuto Instagram</a></div><div className="moderation-actions"><button className="button" onClick={() => moderate(item.id, "approved")}>Approva</button><button className="button ghost" onClick={() => moderate(item.id, "hidden")}>Nascondi</button></div></article>)}</div></section></main>;
}
