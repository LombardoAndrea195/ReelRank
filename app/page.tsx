import Link from "next/link";
import { isConfigured } from "@/lib/firebase-config";
import { adminDb } from "@/lib/firebase-admin";
import VotePanel from "./vote-panel";

export const dynamic = "force-dynamic";

type Submission = { id: string; instagramUrl: string; contentType: "reel" | "post"; title?: string; creatorUsername: string; ratingTotal: number; ratingCount: number; likesCount: number };

export default async function Home() {
  let submissions: Submission[] = [];
  let seasonName = "Stagione in arrivo";
  if (isConfigured) {
    const firestore = adminDb();
    const season = await firestore.collection("seasons").where("status", "==", "active").limit(1).get();
    if (!season.empty) { const active = season.docs[0]!; seasonName = String(active.data().name); const content = await firestore.collection("submissions").where("seasonId", "==", active.id).where("status", "==", "approved").get(); submissions = content.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Submission)); }
  }
  const ranked = submissions.map((entry) => ({ ...entry, average: entry.ratingCount ? entry.ratingTotal / entry.ratingCount : 0 })).sort((a, b) => b.average - a.average || b.ratingCount - a.ratingCount);
  const creators = Object.values(ranked.reduce<Record<string, { username: string; scores: number[]; likes: number }>>((all, entry) => {
    const username = entry.creatorUsername ?? "creator";
    const current = all[username] ?? { username, scores: [], likes: 0 };
    current.scores.push(entry.average); current.likes += entry.likesCount; all[username] = current; return all;
  }, {})).map((creator) => ({ ...creator, score: creator.scores.sort((a, b) => b - a).slice(0, 3).reduce((sum, score) => sum + score, 0) / Math.min(creator.scores.length, 3) || 0 })).sort((a, b) => b.score - a.score || b.likes - a.likes).slice(0, 5);

  return <main>
    <nav><Link className="brand" href="/">REEL<span>RANK</span></Link><div><Link href="/submit">Proponi un contenuto</Link><Link className="button ghost" href="/login">Accedi</Link></div></nav>
    <header className="hero"><p className="season">{seasonName}</p><h1>Il talento merita<br />una classifica.</h1><p className="lede">Vota i Reel e i post che meritano. Ogni contenuto attribuisce punti al creator che lo ha pubblicato.</p><Link className="button" href="/submit">Inserisci un Reel o post</Link></header>
    {!isConfigured && <aside className="setup"><strong>Configura Supabase per iniziare.</strong> Copia <code>.env.example</code> in <code>.env.local</code>, applica la migrazione SQL e aggiungi le chiavi.</aside>}
    <section className="ranking"><div className="section-heading"><h2>In classifica</h2><p>Ordinata per voto medio · aggiornata live</p></div>
      {ranked.length ? <div className="grid">{ranked.map((item, index) => <article className="entry" key={item.id}><div className="rank">{String(index + 1).padStart(2, "0")}</div><div className="embed"><iframe title={item.title ?? `Contenuto di ${item.creatorUsername}`} src={`${item.instagramUrl}embed`} loading="lazy" /></div><div className="entry-body"><p className="content-type">{item.contentType}</p><h3>{item.title ?? "Contenuto proposto"}</h3><p className="creator">di @{item.creatorUsername}</p><VotePanel submissionId={item.id} average={item.average} ratings={item.ratingCount} likes={item.likesCount} /></div></article>)}</div> : <div className="empty"><h2>La classifica aspetta il primo contenuto.</h2><p>Incolla un link Instagram e attribuiscilo al suo creator originale.</p><Link className="button" href="/submit">Proponi il primo</Link></div>}
    </section>
    {creators.length > 0 && <section className="creator-ranking"><div className="section-heading"><h2>Creator della stagione</h2><p>Media dei migliori 3 contenuti</p></div><ol>{creators.map((creator, index) => <li key={creator.username}><span>{String(index + 1).padStart(2, "0")}</span><strong>@{creator.username}</strong><small>{creator.scores.length} contenuti · {creator.likes} like</small><b>{creator.score.toFixed(1)}</b></li>)}</ol></section>}
  </main>;
}
