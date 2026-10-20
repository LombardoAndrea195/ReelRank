"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isConfigured } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured) return setMessage("Aggiungi prima le chiavi Supabase.");
    try { const form = new FormData(event.currentTarget); const email = String(form.get("email")); const password = String(form.get("password")); if (mode === "login") await signInWithEmailAndPassword(auth, email, password); else { const username = String(form.get("username")); const credential = await createUserWithEmailAndPassword(auth, email, password); await updateProfile(credential.user, { displayName: username }); await setDoc(doc(db, "users", credential.user.uid), { username, email, createdAt: serverTimestamp() }); } router.push("/classifica"); } catch (error) { setMessage(error instanceof Error ? error.message : "Non riesco ad accedere."); }
  }
  const google = async () => { try { const credential = await signInWithPopup(auth, new GoogleAuthProvider()); await setDoc(doc(db, "users", credential.user.uid), { username: credential.user.displayName?.replaceAll(" ", "_") ?? "utente", email: credential.user.email, createdAt: serverTimestamp() }, { merge: true }); router.push("/classifica"); } catch (error) { setMessage(error instanceof Error ? error.message : "Accesso Google non riuscito."); } };
  return <main className="auth"><Link className="brand" href="/">REEL<span>RANK</span></Link><form onSubmit={submit}><h1>{mode === "login" ? "Bentornato." : "Entra in classifica."}</h1><p>{mode === "login" ? "Accedi per votare e commentare." : "Crea il tuo account gratuito."}</p>{mode === "signup" && <label>Username<input required name="username" minLength={3} /></label>}<label>Email<input required type="email" name="email" /></label><label>Password<input required type="password" name="password" minLength={8} /></label><button className="button">{mode === "login" ? "Accedi" : "Crea account"}</button><button className="google" type="button" onClick={google}>Continua con Google</button>{message && <p className="feedback" role="status">{message}</p>}<button className="text-button" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}</button></form></main>;
}
