"use client";

import { FormEvent, useEffect, useState } from "react";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { auth, db, isConfigured } from "@/lib/firebase";

type Comment = { id: string; body: string; username?: string; createdAt?: { toMillis?: () => number } };
type Notice = { text: string; type: "success" | "error" };
type VotePanelProps = {
  submissionId: string;
  ratingTotal: number;
  ratings: number;
  likes: number;
  commentsCount: number;
  initialScore?: number | null;
  variant?: "full" | "social";
  onRatingChange: (ratingTotal: number, ratingCount: number) => void;
  onLikeChange: (likesCount: number) => void;
  onCommentChange: (commentsCount: number) => void;
};

export default function VotePanel({ submissionId, ratingTotal: initialRatingTotal, ratings, likes, commentsCount, initialScore = null, variant = "full", onRatingChange, onLikeChange, onCommentChange }: VotePanelProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const showComments = true;
  const [ratingTotal, setRatingTotal] = useState(initialRatingTotal);
  const [ratingCount, setRatingCount] = useState(ratings);
  const [myScore, setMyScore] = useState<number | null>(initialScore);
  const [isRating, setIsRating] = useState(false);
  const showNotice = (text: string, type: Notice["type"] = "success") => setNotice({ text, type });

  useEffect(() => {
    setRatingTotal(initialRatingTotal);
    setRatingCount(ratings);
  }, [initialRatingTotal, ratings]);

  useEffect(() => {
    if (initialScore) setMyScore(initialScore);
  }, [initialScore]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!showComments || !isConfigured) return;
    return onSnapshot(
      query(collection(db, "submissions", submissionId, "comments"), where("status", "==", "visible"), limit(100)),
      (snapshot) => setComments(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Comment, "id">) })).sort((a, b) => (b.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER) - (a.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER))),
      () => showNotice("Non riesco a caricare i commenti. Riprova tra poco.", "error"),
    );
  }, [showComments, submissionId]);

  const interact = async (action: "rate" | "like" | "comment", value?: number | string) => {
    const user = auth.currentUser;
    if (!isConfigured || !user) {
      showNotice("Accedi per interagire.", "error");
      return;
    }
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/interactions", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ action, submissionId, value }) });
      const data = await response.json();
      if (!response.ok) {
        showNotice(data.error ?? "Operazione non riuscita.", "error");
        return;
      }
      return data;
    } catch {
      showNotice("Problema di connessione. Riprova tra poco.", "error");
    }
  };

  const rate = async (score: number) => {
    if (isRating) return;
    setIsRating(true);
    const data = await interact("rate", score);
    setIsRating(false);
    if (!data) return;
    setRatingTotal(data.ratingTotal);
    setRatingCount(data.ratingCount);
    onRatingChange(data.ratingTotal, data.ratingCount);
    setMyScore(score);
    showNotice(`Voto ${score}/10 registrato. Puoi cambiarlo quando vuoi.`);
  };

  const like = async () => {
    const data = await interact("like");
    if (!data) return;
    onLikeChange(data.likesCount);
    showNotice(data.liked ? "Like registrato." : "Like rimosso.");
  };

  const comment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("comment")).trim();
    if (!body) return;
    const data = await interact("comment", body);
    if (!data) return;
    setComments((old) => old.some((item) => item.id === data.id) ? old : [{ id: data.id, body, username: data.username }, ...old]);
    form.reset();
    onCommentChange(data.commentsCount);
    showNotice("Commento pubblicato.");
  };

  const displayedAverage = ratingCount ? ratingTotal / ratingCount : 0;
  return <div className="vote-panel">{variant === "full" && <><div className="metrics"><strong>{displayedAverage ? displayedAverage.toFixed(1) : "—"}</strong><span>/10 su {ratingCount} {ratingCount === 1 ? "voto" : "voti"}</span></div><div className="rating-actions" aria-label="Vota da uno a dieci">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => <button key={score} type="button" onClick={() => rate(score)} disabled={isRating} aria-pressed={myScore === score} aria-label={`Vota ${score} su 10`}>{score}</button>)}</div></>}<div className="vote-extras"><button className="like" type="button" onClick={like}>Mi piace {likes}</button></div><div className="comments"><h4>{commentsCount === 0 ? "Nessun commento ancora" : `Commenti del gruppo (${commentsCount})`}</h4><form onSubmit={comment}><input name="comment" maxLength={1000} placeholder="Scrivi un commento" aria-label="Commento" /><button>Invia</button></form>{comments.map((item) => <p key={item.id}><b>@{item.username?.trim() || "utente"}</b> {item.body}</p>)}</div>{notice && <div className={`action-toast ${notice.type}`} role="status" aria-live="polite"><span aria-hidden="true">{notice.type === "success" ? "✓" : "!"}</span>{notice.text}</div>}</div>;
}
