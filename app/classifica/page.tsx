"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { collection, getDoc, getDocs, limit, onSnapshot, query, where, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, isConfigured } from "@/lib/firebase";
import VotePanel from "../vote-panel";
import ArchiveGallery from "./archive-gallery";
import InstagramEmbed from "../instagram-embed";

type Submission = { id: string; instagramUrl: string; contentType: "reel" | "post" | "link"; title?: string; previewImage?: string | null; creatorUsername: string; ratingTotal: number; ratingCount: number; likesCount: number; commentsCount: number; seasonId: string; createdAt?: { toMillis?: () => number } };
type Ranked = Submission & { average: number };

const rank = (items: Submission[]): Ranked[] => items.map((entry) => ({ ...entry, average: entry.ratingCount ? entry.ratingTotal / entry.ratingCount : 0 })).sort((a, b) => b.average - a.average || b.ratingCount - a.ratingCount);
const when = (item: Submission) => item.createdAt?.toMillis?.() ?? 0;
const byNewest = <T extends Submission>(list: T[]) => [...list].sort((a, b) => when(b) - when(a));
const position = (index: number) => String(index + 1).padStart(2, "0");

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    let frame = 0; const start = performance.now();
    const tick = (now: number) => { const t = Math.min(1, (now - start) / 1100); setShown(value * (1 - Math.pow(1 - t, 3))); if (t < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown.toFixed(1)}</>;
}

function Media({ item }: { item: Submission }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (live || item.contentType === "link" || !node) return;
    if (typeof IntersectionObserver === "undefined") { setLive(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setLive(true); observer.disconnect(); } }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [live, item.contentType]);
  if (item.contentType === "link") return <div className="embed">{item.previewImage ? <img src={item.previewImage} alt="" /> : <div className="link-preview">Anteprima non disponibile</div>}</div>;
  return <div className="embed" ref={ref}>{live ? <InstagramEmbed url={item.instagramUrl} title={item.title ?? `Contenuto di ${item.creatorUsername}`} /> : <button type="button" className="embed-poster" onClick={() => setLive(true)}>{item.previewImage ? <img src={item.previewImage} alt="" /> : null}<span>Guarda il video</span></button>}</div>;
}

function FeedSlide({ item, index, total, isNew, voted, onSeen, children }: { item: Submission; index: number; total: number; isNew: boolean; voted: boolean; onSeen: (id: string) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { onSeen(item.id); observer.disconnect(); } }, { threshold: 0.6 });
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return <article ref={ref} className="feed-slide"><div className="feed-meta"><span>{index + 1} di {total}</span>{voted ? <span className="flag">Votato</span> : isNew ? <span className="flag">Nuovo</span> : null}</div><Media item={item} /><div className="feed-info"><h3>{item.title ?? "Contenuto proposto"}</h3><p className="creator">di @{item.creatorUsername}</p><a className="instagram-link" href={item.instagramUrl} target="_blank" rel="noreferrer">Apri contenuto</a></div><div className="stage-panel">{children}</div></article>;
}

function QueueStage({ queue, seenAtLoad, myScores, onSeen, panel }: { queue: Submission[]; seenAtLoad: Set<string>; myScores: Record<string, number>; onSeen: (id: string) => void; panel: (item: Submission) => React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [feed, setFeed] = useState(false);
  useEffect(() => { const query = window.matchMedia("(max-width: 60rem)"); const sync = () => setFeed(query.matches); sync(); query.addEventListener("change", sync); return () => query.removeEventListener("change", sync); }, []);
  const current = queue[Math.min(index, queue.length - 1)]!;
  useEffect(() => { onSeen(current.id); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);
  if (feed) return <div className="feed">{queue.map((item, i) => <FeedSlide key={item.id} item={item} index={i} total={queue.length} isNew={!seenAtLoad.has(item.id)} voted={myScores[item.id] !== undefined} onSeen={onSeen}>{panel(item)}</FeedSlide>)}</div>;
  const voted = myScores[current.id] !== undefined;
  const isNew = !seenAtLoad.has(current.id);
  return <div className="stage">
    <div className="stage-video" key={`v-${current.id}`}><Media item={current} /></div>
    <div className="stage-side">
      <div className="stage-nav"><button type="button" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>Precedente</button><span>{index + 1} di {queue.length}</span><button type="button" onClick={() => setIndex(Math.min(queue.length - 1, index + 1))} disabled={index >= queue.length - 1}>Successivo</button></div>
      <div className="stage-info" key={`i-${current.id}`}>{voted ? <span className="flag">Votato</span> : isNew ? <span className="flag">Nuovo</span> : null}<p className="content-type">{current.contentType}</p><h3>{current.title ?? "Contenuto proposto"}</h3><p className="creator">di @{current.creatorUsername}</p><a className="instagram-link" href={current.instagramUrl} target="_blank" rel="noreferrer">Apri contenuto</a></div>
      <div className="stage-panel" key={`p-${current.id}`}>{panel(current)}</div>
      <ul className="stage-list">{queue.map((item, i) => <li key={item.id}><button type="button" aria-current={i === index} onClick={() => setIndex(i)}><span>{position(i)}</span>{item.title ?? "Contenuto proposto"}{myScores[item.id] !== undefined && <small>votato</small>}</button></li>)}</ul>
    </div>
  </div>;
}

export default function RankingPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [season, setSeason] = useState("Stagione 2026");
  const [items, setItems] = useState<Submission[]>([]);
  const [archive, setArchive] = useState<{ id: string; name: string; items: Submission[] }[]>([]);
  const [myScores, setMyScores] = useState<Record<string, number>>({});
  const [votedAtLoad, setVotedAtLoad] = useState<Set<string>>(new Set());
  const [seenAtLoad, setSeenAtLoad] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<"classifica" | "da-votare" | "archivio">("classifica");
  const goTo = (next: typeof tab) => { setTab(next); document.getElementById("sezioni")?.scrollIntoView({ block: "start" }); };
  const seenKey = useRef("");

  useEffect(() => {
    let stop: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      stop?.(); stop = undefined;
      try {
        if (!user || !isConfigured) return setAllowed(false);
        const [access, admin] = await Promise.all([getDoc(doc(db, "rankingAccess", user.uid)), getDoc(doc(db, "admins", user.uid))]);
        if (!access.exists() && !admin.exists()) return setAllowed(false);
        setAllowed(true);
        const [active, seasons] = await Promise.all([getDocs(query(collection(db, "seasons"), where("status", "==", "active"), limit(1))), getDocs(collection(db, "seasons"))]);
        if (active.empty) return;
        const current = active.docs[0]!;
        setSeason(String(current.data().name));
        const names = new Map(seasons.docs.map((entry) => [entry.id, String(entry.data().name ?? entry.id)]));
        seenKey.current = `reelrank:seen:${user.uid}`;
        try { setSeenAtLoad(new Set(JSON.parse(localStorage.getItem(seenKey.current) ?? "[]"))); } catch { /* storage unavailable */ }
        let first = true;
        stop = onSnapshot(query(collection(db, "submissions"), where("status", "==", "approved")), async (snapshot) => {
          const all = snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<Submission, "id">) }));
          const currentItems = all.filter((entry) => entry.seasonId === current.id);
          setItems(currentItems);
          const past = new Map<string, Submission[]>();
          all.filter((entry) => entry.seasonId !== current.id).forEach((entry) => past.set(entry.seasonId, [...(past.get(entry.seasonId) ?? []), entry]));
          setArchive([...past.entries()].map(([id, list]) => ({ id, name: names.get(id) ?? id, items: list })).sort((a, b) => b.name.localeCompare(a.name)));
          if (!first) return;
          first = false;
          const scores: Record<string, number> = {};
          await Promise.all(currentItems.map(async (entry) => { try { const mine = await getDoc(doc(db, "submissions", entry.id, "ratings", user.uid)); if (mine.exists()) scores[entry.id] = Number(mine.data().score); } catch { /* unknown vote counts as not voted */ } }));
          setMyScores(scores);
          setVotedAtLoad(new Set(Object.keys(scores)));
        }, () => setError("Non riesco ad aggiornare i contenuti in tempo reale. Ricarica la pagina."));
      } catch {
        setError("Non riesco a verificare i permessi. Pubblica le regole Firestore aggiornate e ricarica la pagina.");
        setAllowed(false);
      }
    });
    return () => { stop?.(); unsubscribeAuth(); };
  }, []);

  const markSeen = (id: string) => {
    if (!seenKey.current) return;
    try { const stored = new Set<string>(JSON.parse(localStorage.getItem(seenKey.current) ?? "[]")); stored.add(id); localStorage.setItem(seenKey.current, JSON.stringify([...stored])); } catch { /* storage unavailable */ }
  };

  if (allowed === null) return <main className="access"><p>Verifica accesso…</p></main>;
  if (!allowed) return <main className="access"><Link className="brand" href="/submit">Home</Link><div><p className="season">{error ? "Configurazione richiesta" : "Accesso in attesa"}</p><h1>{error ? "Servono le regole aggiornate." : "La classifica è riservata."}</h1><p className="lede">{error || "Accedi con il tuo account e chiedi a un amministratore di abilitarlo. Nel frattempo puoi proporre Reel e post per la stagione."}</p><div className="access-actions"><Link className="button" href="/login">Accedi</Link><Link className="button ghost" href="/submit">Proponi un contenuto</Link></div></div></main>;

  const ranked = rank(items);
  const creators = Object.values(ranked.reduce<Record<string, { username: string; ratingTotal: number; ratingCount: number; contents: number; likes: number }>>((all, entry) => {
    const current = all[entry.creatorUsername] ?? { username: entry.creatorUsername, ratingTotal: 0, ratingCount: 0, contents: 0, likes: 0 };
    current.ratingTotal += entry.ratingTotal; current.ratingCount += entry.ratingCount; current.contents += 1; current.likes += entry.likesCount;
    all[entry.creatorUsername] = current;
    return all;
  }, {})).map((creator) => ({ ...creator, score: creator.ratingCount ? creator.ratingTotal / creator.ratingCount : 0 })).sort((a, b) => b.score - a.score || b.likes - a.likes).slice(0, 5);
  const queue = byNewest(ranked.filter((entry) => !votedAtLoad.has(entry.id)));
  const todo = queue.filter((entry) => myScores[entry.id] === undefined).length;
  const leader = ranked[0];
  const pending = byNewest(ranked.filter((entry) => myScores[entry.id] === undefined));
  const everything = byNewest<Ranked>([...ranked, ...rank(archive.flatMap((group) => group.items))]);
  const seasonNames = new Map([[items[0]?.seasonId ?? "", season], ...archive.map((group) => [group.id, group.name] as [string, string])]);

  const updateSubmissionRating = (submissionId: string, ratingTotal: number, ratingCount: number) => setItems((current) => current.map((item) => item.id === submissionId ? { ...item, ratingTotal, ratingCount } : item));
  const updateSubmissionLikes = (submissionId: string, likesCount: number) => { setItems((current) => current.map((item) => item.id === submissionId ? { ...item, likesCount } : item)); setArchive((groups) => groups.map((group) => ({ ...group, items: group.items.map((item) => item.id === submissionId ? { ...item, likesCount } : item) }))); };
  const updateSubmissionComments = (submissionId: string, commentsCount: number) => { setItems((current) => current.map((item) => item.id === submissionId ? { ...item, commentsCount } : item)); setArchive((groups) => groups.map((group) => ({ ...group, items: group.items.map((item) => item.id === submissionId ? { ...item, commentsCount } : item) }))); };
  const panel = (item: Submission) => <VotePanel submissionId={item.id} ratingTotal={item.ratingTotal} ratings={item.ratingCount} likes={item.likesCount} commentsCount={item.commentsCount ?? 0} initialScore={myScores[item.id] ?? null} onRatingChange={(ratingTotal, ratingCount) => { updateSubmissionRating(item.id, ratingTotal, ratingCount); setMyScores((all) => all[item.id] === undefined ? { ...all, [item.id]: 0 } : all); }} onLikeChange={(likesCount) => updateSubmissionLikes(item.id, likesCount)} onCommentChange={(commentsCount) => updateSubmissionComments(item.id, commentsCount)} />;

  return <main>
    <nav><Link className="brand" href="/classifica">Home</Link><div><Link href="/submit">Proponi un contenuto</Link><Link className="button ghost" href="/admin">Admin</Link></div></nav>
    <header className="hero">
      <div className="hero-copy"><div><h1 aria-label="Il talento merita una classifica.">{["Il", "talento", "merita", "una", "classifica."].map((word, i) => <span className="word" aria-hidden="true" key={word} style={{ "--i": i } as React.CSSProperties}>{word} </span>)}</h1></div><div><p className="lede">Vota i Reel e i post che meritano. Ogni contenuto attribuisce punti al creator che lo ha pubblicato.</p><Link className="button" href="/submit">Inserisci un contenuto</Link></div></div>
      <aside className="hero-field on-field" aria-label="Primo in classifica">
        <p className="label">{season}</p>
        {leader && leader.average > 0 ? <div><strong><CountUp value={leader.average} /></strong><h2>{leader.title ?? "Contenuto proposto"}</h2><p className="creator">di @{leader.creatorUsername}</p></div> : <div><strong>{ranked.length}</strong><h2>contenuti in gara</h2></div>}
        {todo > 0 ? <button className="todo" type="button" onClick={() => goTo("da-votare")}>{todo === 1 ? "1 contenuto da votare" : `${todo} contenuti da votare`}</button> : <span className="label">{ranked.length ? "Hai votato tutto." : "Nessun contenuto ancora."}</span>}
      </aside>
    </header>

    {pending.length > 0 && <div className="ticker"><button className="ticker-label" type="button" onClick={() => goTo("da-votare")}>Da votare<span className="count">{pending.length}</span></button><div className="ticker-window" aria-hidden="true"><div className="ticker-track">{[0, 1, 2, 3, 4, 5].map((n) => <ul key={n}>{pending.map((item) => <li key={item.id}>{!seenAtLoad.has(item.id) && <span className="flag">Nuovo</span>}{item.title ?? "Contenuto proposto"} <span>di @{item.creatorUsername}</span></li>)}</ul>)}</div></div></div>}
    <div className="switcher" id="sezioni"><div className="switcher-inner" role="tablist" aria-label="Sezioni"><button type="button" role="tab" aria-selected={tab === "classifica"} onClick={() => goTo("classifica")}>Classifica</button><button type="button" role="tab" aria-selected={tab === "da-votare"} onClick={() => goTo("da-votare")}>Da votare{todo > 0 && <span className="count">{todo}</span>}</button><button type="button" role="tab" aria-selected={tab === "archivio"} onClick={() => goTo("archivio")}>Archivio{everything.length > 0 && <span className="count quiet">{everything.length}</span>}</button></div></div>

    {tab === "classifica" && <>
    <section className="block" id="classifica">
      <div className="block-head"><h2>In classifica</h2><p>Ordinata per voto medio, aggiornata live.</p></div>
      {ranked.length ? <ol className="ranking-list">{ranked.map((item, index) => { const mine = myScores[item.id]; const unvoted = mine === undefined; return <li className="rank-row" key={item.id} style={{ "--i": index } as React.CSSProperties}><div className="rank-line"><span className="rank-no">{position(index)}</span><div className="rank-title"><h3>{item.title ?? "Contenuto proposto"}{unvoted && <span className="flag">Da votare</span>}</h3><p>di @{item.creatorUsername}, {item.contentType}</p></div><p className="rank-score">{item.average ? item.average.toFixed(1) : "—"}<small>/10</small></p><p className="rank-votes">{item.ratingCount} {item.ratingCount === 1 ? "voto" : "voti"}<br />{item.likesCount} mi piace, {item.commentsCount ?? 0} {(item.commentsCount ?? 0) === 1 ? "commento" : "commenti"}</p><button className="rank-toggle" type="button" aria-expanded={openId === item.id} onClick={() => setOpenId(openId === item.id ? null : item.id)}>{openId === item.id ? "Chiudi" : unvoted ? "Guarda e vota" : "Guarda"}</button></div>{openId === item.id && <div className="rank-open"><div><Media item={item} /><a className="instagram-link" href={item.instagramUrl} target="_blank" rel="noreferrer">Apri contenuto</a></div>{panel(item)}</div>}</li>; })}</ol> : <div className="empty"><h2>La classifica aspetta il primo contenuto.</h2><p>Incolla un link pubblico, attribuiscilo al creator originale e lo verificheremo automaticamente.</p><Link className="button" href="/submit">Proponi il primo</Link></div>}
    </section>

    {creators.length > 0 && <section className="block creator-ranking"><div className="block-head"><h2>Creator della stagione</h2><p>Media di tutti i voti.</p></div><ol>{creators.map((creator, index) => <li key={creator.username}><span>{position(index)}</span><strong>@{creator.username}</strong><small>{creator.contents} {creator.contents === 1 ? "contenuto" : "contenuti"}, {creator.likes} like</small><b>{creator.score.toFixed(1)}</b></li>)}</ol></section>}</>}

    {tab === "da-votare" && <section className="queue on-field" id="da-votare">
      <div className="block"><div className="block-head"><h2>Da votare</h2><p>{queue.length ? "I contenuti che non hai ancora votato. Quelli nuovi per te sono segnati." : ""}</p></div>
        {queue.length ? <QueueStage queue={queue} seenAtLoad={seenAtLoad} myScores={myScores} onSeen={markSeen} panel={panel} /> : <div className="queue-done"><h3>Hai votato tutto.</h3><p>Quando arriva un nuovo contenuto lo trovi qui.</p></div>}
      </div>
    </section>}

    {tab === "archivio" && <section className="archive" id="archivio">
      <div className="block"><div className="block-head"><h2>Archivio</h2><p>Tutti i video inseriti, dal più recente. Tocca un video per guardarlo in grande.</p></div>
        <ArchiveGallery items={everything} extras={(item) => <VotePanel variant="social" submissionId={item.id} ratingTotal={item.ratingTotal} ratings={item.ratingCount} likes={item.likesCount} commentsCount={item.commentsCount ?? 0} onRatingChange={() => {}} onLikeChange={(likesCount) => updateSubmissionLikes(item.id, likesCount)} onCommentChange={(commentsCount) => updateSubmissionComments(item.id, commentsCount)} />} seasonName={(id) => seasonNames.get(id) ?? "Stagione conclusa"} />
      </div>
    </section>}
  </main>;
}
