"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import InstagramEmbed from "../instagram-embed";

export type GalleryItem = { id: string; instagramUrl: string; contentType: "reel" | "post" | "link"; title?: string; previewImage?: string | null; creatorUsername: string; seasonId: string; createdAt?: { toMillis?: () => number } };

const stamp = (item: GalleryItem) => item.createdAt?.toMillis?.() ?? 0;
const dateLabel = (item: GalleryItem) => stamp(item) ? new Date(stamp(item)).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : "Senza data";
const nameOf = (item: GalleryItem) => item.title ?? "Contenuto proposto";

function Poster({ item }: { item: GalleryItem }) {
  return item.previewImage ? <img src={item.previewImage} alt="" loading="lazy" /> : <span className="tile-blank" aria-hidden="true" />;
}

export default function ArchiveGallery({ items, seasonName }: { items: GalleryItem[]; seasonName: (seasonId: string) => string }) {
  const [creator, setCreator] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => { const id = new URLSearchParams(window.location.search).get("video"); if (id) setOpenId(id); }, []);

  const creators = [...new Set(items.map((item) => item.creatorUsername))].sort((a, b) => a.localeCompare(b));
  const visible = creator ? items.filter((item) => item.creatorUsername === creator) : items;
  const index = visible.findIndex((item) => item.id === openId);
  const current = index >= 0 ? visible[index]! : null;

  const close = useCallback(() => { setOpenId(null); returnTo.current?.focus(); }, []);
  const step = useCallback((direction: number) => {
    if (!visible.length || index < 0) return;
    setOpenId(visible[(index + direction + visible.length) % visible.length]!.id);
  }, [visible, index]);

  useEffect(() => {
    if (!current) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey); };
  }, [current, close, step]);

  if (!items.length) return <div className="empty"><p>Nessun video inserito, per ora.</p></div>;

  return <>
    <div className="gallery-filter" role="group" aria-label="Filtra per creator">
      <button type="button" aria-pressed={creator === ""} onClick={() => setCreator("")}>Tutti</button>
      {creators.map((name) => <button type="button" key={name} aria-pressed={creator === name} onClick={() => setCreator(name)}>@{name}</button>)}
    </div>
    <ul className="gallery">
      {visible.map((item, i) => <li key={item.id} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
        <button type="button" className="tile" onClick={(event) => { returnTo.current = event.currentTarget; setOpenId(item.id); }} aria-label={`Guarda ${nameOf(item)}`}>
          <span className="tile-frame"><Poster item={item} /><span className="tile-play" aria-hidden="true" /></span>
          <span className="tile-title">{nameOf(item)}</span>
          <span className="tile-meta">@{item.creatorUsername}, {dateLabel(item)}</span>
        </button>
      </li>)}
    </ul>

    {current && createPortal(<div className="player-backdrop" onClick={close}>
      <div className="player" role="dialog" aria-modal="true" aria-label={nameOf(current)} onClick={(event) => event.stopPropagation()}>
        <div className="player-stage" key={`m-${current.id}`}>
          {current.contentType === "link"
            ? current.previewImage ? <img src={current.previewImage} alt="" /> : <div className="link-preview">Anteprima non disponibile</div>
            : <InstagramEmbed url={current.instagramUrl} title={nameOf(current)} />}
        </div>
        <div className="player-side" key={`s-${current.id}`}>
          <div className="player-top"><span>{index + 1} di {visible.length}</span><button type="button" ref={closeButton} onClick={close}>Chiudi</button></div>
          <div className="player-info">
            <h3>{nameOf(current)}</h3>
            <p>di @{current.creatorUsername}</p>
            <p>{dateLabel(current)}, {seasonName(current.seasonId)}</p>
            <a className="instagram-link" href={current.instagramUrl} target="_blank" rel="noreferrer">Apri su Instagram</a>
          </div>
          <div className="player-nav"><button type="button" onClick={() => step(-1)}>Precedente</button><button type="button" onClick={() => step(1)}>Successivo</button></div>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
