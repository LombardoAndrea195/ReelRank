"use client";

import { FormEvent, useEffect, useState } from "react";
import { isConfigured, supabase } from "@/lib/supabase";

export default function VotePanel({ submissionId, average, ratings, likes }: { submissionId: string; average: number; ratings: number; likes: number }) {
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState<{ id: string; body: string; profiles: { username: string }[] }[]>([]);
  const [showComments, setShowComments] = useState(false);
  useEffect(() => { if (isConfigured && showComments) supabase.from("comments").select("id,body,profiles(username)").eq("submission_id", submissionId).order("created_at", { ascending: false }).then(({ data }) => setComments((data ?? []) as typeof comments)); }, [showComments, submissionId]);
  const requireUser = async () => {
    if (!isConfigured) return null;
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setMessage("Accedi per votare."); return null; }
    return data.user;
  };
  const rate = async (score: number) => {
    const user = await requireUser(); if (!user) return;
    const { error } = await supabase.from("ratings").upsert({ submission_id: submissionId, user_id: user.id, score }, { onConflict: "user_id,submission_id" });
    setMessage(error ? error.message : `Hai votato ${score}/10. Puoi cambiarlo quando vuoi.`);
  };
  const like = async () => {
    const user = await requireUser(); if (!user) return;
    const { error } = await supabase.from("likes").upsert({ submission_id: submissionId, user_id: user.id }, { onConflict: "user_id,submission_id", ignoreDuplicates: true });
    setMessage(error ? error.message : "Like registrato.");
  };
  const comment = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const user = await requireUser(); if (!user) return; const form = new FormData(event.currentTarget); const body = String(form.get("comment")).trim(); if (!body) return; const { data, error } = await supabase.from("comments").insert({ submission_id: submissionId, user_id: user.id, body }).select("id,body,profiles(username)").single(); if (error) return setMessage(error.message); setComments((old) => [data as typeof comments[number], ...old]); event.currentTarget.reset(); };
  return <div className="vote-panel"><div className="metrics"><strong>{average ? average.toFixed(1) : "—"}</strong><span>/10 · {ratings} voti</span></div><div className="rating-actions" aria-label="Vota da uno a dieci">{[1,2,3,4,5,6,7,8,9,10].map((score) => <button key={score} onClick={() => rate(score)} aria-label={`Vota ${score} su 10`}>{score}</button>)}</div><button className="like" onClick={like}>♡ {likes}</button><button className="comment-toggle" onClick={() => setShowComments(!showComments)}>{showComments ? "Chiudi commenti" : "Commenta"}</button>{showComments && <div className="comments"><form onSubmit={comment}><input name="comment" maxLength={1000} placeholder="Scrivi un commento" aria-label="Commento" /><button>Invia</button></form>{comments.map((item) => <p key={item.id}><b>@{item.profiles[0]?.username ?? "utente"}</b> {item.body}</p>)}</div>}{message && <p className="feedback" role="status">{message}</p>}</div>;
}
