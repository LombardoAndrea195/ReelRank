"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { isConfigured, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured) return setMessage("Aggiungi prima le chiavi Supabase.");
    const form = new FormData(event.currentTarget); const email = String(form.get("email")); const password = String(form.get("password"));
    const action = mode === "login" ? supabase.auth.signInWithPassword({ email, password }) : supabase.auth.signUp({ email, password, options: { data: { username: form.get("username") } } });
    const { error } = await action;
    setMessage(error ? error.message : mode === "login" ? "Accesso effettuato. Torna alla classifica." : "Controlla l'email per confermare il tuo account.");
  }
  return <main className="auth"><Link className="brand" href="/">REEL<span>RANK</span></Link><form onSubmit={submit}><h1>{mode === "login" ? "Bentornato." : "Entra in classifica."}</h1><p>{mode === "login" ? "Accedi per votare e commentare." : "Crea il tuo account gratuito."}</p>{mode === "signup" && <label>Username<input required name="username" minLength={3} /></label>}<label>Email<input required type="email" name="email" /></label><label>Password<input required type="password" name="password" minLength={8} /></label><button className="button">{mode === "login" ? "Accedi" : "Crea account"}</button>{message && <p className="feedback" role="status">{message}</p>}<button className="text-button" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}</button></form></main>;
}
