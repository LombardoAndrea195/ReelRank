"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import VotePanel from "../../vote-panel";
import ArchiveGallery from "../archive-gallery";
import InstagramEmbed from "../../instagram-embed";

type Submission = { id: string; instagramUrl: string; contentType: "reel" | "post" | "link"; title?: string; previewImage?: string | null; creatorUsername: string; ratingTotal: number; ratingCount: number; likesCount: number; commentsCount: number; seasonId: string; createdAt?: { toMillis?: () => number } };
type Ranked = Submission & { average: number };


const art = (a: string, b: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/></svg>`)}`;
const DAY = 86400000;
const stamp: Record<string, number> = { d1: -30, d2: -22, d3: -3, d4: -18, d5: -1, d6: -2, a1: -200, a2: -260, a3: -320 };
const mk = (id: string, title: string, creator: string, total: number, count: number, a: string, b: string, season = "s26"): Submission => ({ id, instagramUrl: "https://www.instagram.com/", contentType: "link", title, previewImage: art(a, b), creatorUsername: creator, ratingTotal: total, ratingCount: count, likesCount: 4, commentsCount: 2, seasonId: season, createdAt: { toMillis: () => DAY * (stamp[id] ?? 0) + 1.76e12 } });
const DEMO_ITEMS: Submission[] = [
  mk("d1", "Il gol dal parcheggio", "marco_r", 109, 12, "#1d3fbf", "#0d1630"),
  mk("d2", "Pasta in 30 secondi", "giulia.cucina", 95, 11, "#e0533a", "#6b1d12"),
  mk("d3", "Il gatto che apre le porte", "luca_b", 98, 12, "#2f7d6b", "#10302a"),
  mk("d4", "Skate sotto la pioggia", "sara.k", 67, 9, "#6a6f85", "#1c2030"),
  mk("d5", "Cover di chitarra", "dani_music", 69, 10, "#c79a2b", "#3c2c06"),
  mk("d6", "Tramonto a Procida", "anna_v", 40, 5, "#d9667f", "#3a1020"),
];
const DEMO_ARCHIVE = [{ id: "s25", name: "Stagione 2025", items: [mk("a1", "Il tuffo impossibile", "marco_r", 88, 10, "#1d3fbf", "#0d1630", "s25"), mk("a2", "Gelato a mezzanotte", "giulia.cucina", 80, 10, "#e0533a", "#6b1d12", "s25"), mk("a3", "Il pianista in stazione", "dani_music", 71, 9, "#6a6f85", "#1c2030", "s25")] }];

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

export default function RankingDemoPage() {
    const [season] = useState("Stagione 2026");
  const [items, setItems] = useState<Submission[]>(DEMO_ITEMS);
  const [archive, setArchive] = useState<{ id: string; name: string; items: Submission[] }[]>(DEMO_ARCHIVE);
  const [myScores, setMyScores] = useState<Record<string, number>>({ d1: 9, d2: 8, d4: 7 });
  const [votedAtLoad, setVotedAtLoad] = useState<Set<string>>(new Set(["d1", "d2", "d4"]));
  const [seenAtLoad, setSeenAtLoad] = useState<Set<string>>(new Set(["d3"]));
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<"classifica" | "da-votare" | "archivio">("classifica");
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("tab"); if (t === "da-votare" || t === "archivio") setTab(t); }, []);
  const goTo = (next: typeof tab) => { setTab(next); document.getElementById("sezioni")?.scrollIntoView({ block: "start" }); };
  const seenKey = useRef("");

  const markSeen = (id: string) => {
    if (!seenKey.current) return;
    try { const stored = new Set<string>(JSON.parse(localStorage.getItem(seenKey.current) ?? "[]")); stored.add(id); localStorage.setItem(seenKey.current, JSON.stringify([...stored])); } catch { /* storage unavailable */ }
  };

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
  const tickerPeople = Array.from(pending.reduce((map, entry) => map.set(entry.creatorUsername, (map.get(entry.creatorUsername) ?? false) || !seenAtLoad.has(entry.id)), new Map<string, boolean>()), ([name, isNew]) => ({ name, isNew }));
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

    {pending.length > 0 && <div className="ticker"><button className="ticker-label" type="button" onClick={() => goTo("da-votare")}>Da votare<span className="count">{pending.length}</span></button><div className="ticker-window" aria-hidden="true"><div className="ticker-track" style={{ animationDuration: `${Math.max(60, tickerPeople.length * 15)}s` }}>{[0, 1, 2, 3, 4, 5].map((n) => <ul key={n}>{tickerPeople.map((person) => <li key={person.name}>{person.isNew && <span className="flag">Nuovo</span>}@{person.name}</li>)}</ul>)}</div></div></div>}
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
