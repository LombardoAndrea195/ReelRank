"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isConfigured } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured) return setMessage("Aggiungi prima le chiavi Supabase.");
    try { const form = new FormData(event.currentTarget); const email = String(form.get("email")); const password = String(form.get("password")); const username = String(form.get("username")).trim(); const credential = mode === "login" ? await signInWithEmailAndPassword(auth, email, password) : await createUserWithEmailAndPassword(auth, email, password); if (mode === "signup") { await updateProfile(credential.user, { displayName: username }); await setDoc(doc(db, "users", credential.user.uid), { username, email: credential.user.email ?? email, createdAt: serverTimestamp() }, { merge: true }); } router.push("/classifica"); } catch (error) { setMessage(error instanceof Error ? error.message : "Non riesco ad accedere."); }
  }
  const google = async () => { try { const credential = await signInWithPopup(auth, new GoogleAuthProvider()); const profile = doc(db, "users", credential.user.uid); if (!(await getDoc(profile)).exists()) await setDoc(profile, { username: credential.user.displayName?.replaceAll(" ", "_") ?? "utente", email: credential.user.email, createdAt: serverTimestamp() }); router.push("/classifica"); } catch (error) { setMessage(error instanceof Error ? error.message : "Accesso Google non riuscito."); } };
  return <main className="auth"><Link className="brand" href="/">Home</Link><form onSubmit={submit}><h1>{mode === "login" ? "Bentornato." : "Entra in classifica."}</h1><p>{mode === "login" ? "Accedi per votare e commentare." : "Crea il tuo account gratuito."}</p>{mode === "signup" && <label>Username<input required name="username" minLength={3} /></label>}<label>Email<input required type="email" name="email" /></label><label>Password<input required type="password" name="password" minLength={8} /></label><button className="button">{mode === "login" ? "Accedi" : "Crea account"}</button><button className="google" type="button" onClick={google}><svg className="google-icon" aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285f4" d="M21.35 12.27c0-.79-.07-1.55-.21-2.27H12v4.29h5.23a4.47 4.47 0 0 1-1.94 2.93v2.78h3.57c2.09-1.92 3.29-4.75 3.29-7.73Z"/><path fill="#34a853" d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.57-2.78c-.99.66-2.26 1.05-3.86 1.05-2.97 0-5.48-2-6.38-4.69H.93v2.87A9.7 9.7 0 0 0 12 21.75Z"/><path fill="#fbbc05" d="M5.62 12c0-.9.15-1.77.43-2.58V6.55H2.36A9.72 9.72 0 0 0 2.25 12c0 1.75.42 3.4 1.16 4.84l3.69-2.87A6.12 6.12 0 0 1 5.62 12Z"/><path fill="#ea4335" d="M12 6.34c1.74 0 3.3.6 4.53 1.77l3.4-3.4C16.81 1.8 14.62.25 12 .25A9.7 9.7 0 0 0 2.36 6.55l3.69 2.87C6.95 8.34 9.03 6.34 12 6.34Z"/></svg>Continua con Google</button>{message && <p className="feedback" role="status">{message}</p>}<button className="text-button" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}</button></form></main>;
}
