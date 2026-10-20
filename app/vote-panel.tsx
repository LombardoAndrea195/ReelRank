"use client";

import { FormEvent, useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db, isConfigured } from "@/lib/firebase";

type Comment = { id: string; body: string; username: string };
type VotePanelProps = {
  submissionId: string;
  average: number;
  ratings: number;
  likes: number;
  onRatingChange: (ratingTotal: number, ratingCount: number) => void;
};

export default function VotePanel({ submissionId, average, ratings, likes, onRatingChange }: VotePanelProps) {
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [ratingTotal, setRatingTotal] = useState(average * ratings);
  const [ratingCount, setRatingCount] = useState(ratings);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [isRating, setIsRating] = useState(false);

  useEffect(() => {
    if (!showComments || !isConfigured) return;

    getDocs(query(
      collection(db, "submissions", submissionId, "comments"),
      where("status", "==", "visible"),
      limit(100),
    ))
      .then((snapshot) => setComments(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Comment, "id">) }))))
      .catch(() => setMessage("Non riesco a caricare i commenti. Riprova tra poco."));
  }, [showComments, submissionId]);

  const interact = async (action: "rate" | "like" | "comment", value?: number | string) => {
    const user = auth.currentUser;
    if (!isConfigured || !user) return setMessage("Accedi per interagire.");

    const token = await user.getIdToken();
    const response = await fetch("/api/interactions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, submissionId, value }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Operazione non riuscita.");
    return data;
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
    setMessage(`Hai votato ${score}/10. Puoi cambiarlo quando vuoi.`);
  };

  const like = async () => {
    const data = await interact("like");
    if (data) setMessage(data.liked ? "Like registrato." : "Like rimosso.");
  };

  const comment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("comment")).trim();
    if (!body) return;
    const data = await interact("comment", body);
    if (!data) return;

    setComments((old) => [{ id: data.id, body, username: data.username }, ...old]);
    form.reset();
  };

  const displayedAverage = ratingCount ? ratingTotal / ratingCount : 0;

  return <div className="vote-panel"><div className="metrics"><strong>{displayedAverage ? displayedAverage.toFixed(1) : "—"}</strong><span>/10 · {ratingCount} voti</span></div><div className="rating-actions" aria-label="Vota da uno a dieci">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => <button key={score} type="button" onClick={() => rate(score)} disabled={isRating} aria-pressed={myScore === score} aria-label={`Vota ${score} su 10`}>{score}</button>)}</div><button className="like" type="button" onClick={like}>♡ {likes}</button><button className="comment-toggle" type="button" onClick={() => setShowComments(!showComments)}>{showComments ? "Chiudi commenti" : "Commenta"}</button>{showComments && <div className="comments"><form onSubmit={comment}><input name="comment" maxLength={1000} placeholder="Scrivi un commento" aria-label="Commento" /><button>Invia</button></form>{comments.map((item) => <p key={item.id}><b>@{item.username}</b> {item.body}</p>)}</div>}{message && <p className="feedback" role="status">{message}</p>}</div>;
}
