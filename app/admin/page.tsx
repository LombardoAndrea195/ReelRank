"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, isConfigured } from "@/lib/firebase";

type Submission = { id: string; instagramUrl: string; contentType: string; title?: string; creatorUsername: string };
type User = { id: string; username?: string | null; email?: string | null };

export default function AdminPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [published, setPublished] = useState<Submission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("Controllo autorizzazione…");

  useEffect(() => {
    if (!isConfigured) {
      setStatus("Configura Firebase per usare la moderazione.");
      return;
    }

    return onAuthStateChanged(auth, (user) => { void load(user); });
  }, []);

  async function load(user = auth.currentUser) {
    try {
      if (!user) return setStatus("Accedi con un account admin per continuare.");
      if (!(await getDoc(doc(db, "admins", user.uid))).exists()) return setStatus("Non hai i permessi per moderare i contenuti.");

      const [pending, approved, members, access] = await Promise.all([
        getDocs(query(collection(db, "submissions"), where("status", "==", "pending"))),
        getDocs(query(collection(db, "submissions"), where("status", "==", "approved"))),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "rankingAccess")),
      ]);

      setItems(pending.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Submission, "id">) })));
      setPublished(approved.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Submission, "id">) })));
      setUsers(members.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<User, "id">) })));
      setEnabled(access.docs.map((item) => item.id));
      setStatus("");
    } catch {
      setStatus("Non riesco a caricare utenti e proposte. Verifica le regole Firestore e ricarica la pagina.");
    }
  }

  async function moderate(id: string, status: "approved" | "hidden") {
    try {
      await updateDoc(doc(db, "submissions", id), { status });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch {
      setStatus("Non riesco a modificare questo contenuto.");
    }
  }

  async function removeContent(item: Submission) {
    if (!window.confirm(`Eliminare definitivamente “${item.title ?? "questo contenuto"}” dalla classifica?`)) return;

    try {
      await deleteDoc(doc(db, "submissions", item.id));
      setPublished((current) => current.filter((entry) => entry.id !== item.id));
    } catch {
      setStatus("Non riesco a eliminare questo contenuto.");
    }
  }

  async function toggleAccess(id: string) {
    try {
      if (enabled.includes(id)) {
        await deleteDoc(doc(db, "rankingAccess", id));
        setEnabled((all) => all.filter((entry) => entry !== id));
      } else {
        await setDoc(doc(db, "rankingAccess", id), { grantedAt: serverTimestamp() });
        setEnabled((all) => [...all, id]);
      }
    } catch {
      setStatus("Non riesco a modificare l'accesso.");
    }
  }

  function startEditing(member: User) {
    setEditingUserId(member.id);
    setUsername(member.username ?? "");
  }

  function cancelEditing() {
    setEditingUserId(null);
    setUsername("");
  }

  async function saveUsername(member: User) {
    const nextUsername = username.trim();
    if (!nextUsername) {
      setStatus("Inserisci uno username prima di salvare.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", member.id), { username: nextUsername });
      setUsers((current) => current.map((user) => user.id === member.id ? { ...user, username: nextUsername } : user));
      cancelEditing();
      setStatus(`Username di ${member.email ?? "questo utente"} aggiornato.`);
    } catch {
      setStatus("Non riesco a modificare lo username. Verifica le regole Firestore.");
    }
  }

  return (
    <main className="admin">
      <nav>
        <Link className="brand" href="/classifica">REEL<span>RANK</span></Link>
        <Link href="/classifica">Torna alla classifica</Link>
      </nav>
      <section>
        <p className="season">MODERAZIONE</p>
        <h1>Proposte da verificare</h1>
        <p className="lede">Controlla link e attribuzione prima di pubblicare il contenuto.</p>
        {status && <p className="feedback" role="status">{status}</p>}
        {!status && !items.length && <div className="empty"><h2>Tutto in ordine.</h2><p>Non ci sono proposte da approvare.</p></div>}

        <div className="moderation-list">
          {items.map((item) => <article key={item.id}><div><p className="content-type">{item.contentType}</p><h2>{item.title ?? "Senza titolo"}</h2><p>Creator indicato: <strong>@{item.creatorUsername}</strong></p><a href={item.instagramUrl} target="_blank" rel="noreferrer">Apri il contenuto</a></div><div className="moderation-actions"><button className="button" onClick={() => moderate(item.id, "approved")}>Approva</button><button className="button ghost" onClick={() => moderate(item.id, "hidden")}>Nascondi</button></div></article>)}
        </div>

        <div className="published-list">
          <p className="season">IN CLASSIFICA</p>
          <h2>Contenuti pubblicati</h2>
          <p>Elimina un contenuto se non deve più comparire nella classifica.</p>
          {!status && !published.length && <p className="empty-access">Non ci sono ancora contenuti pubblicati.</p>}
          {published.map((item) => <article key={item.id}><div><p className="content-type">{item.contentType}</p><h3>{item.title ?? "Senza titolo"}</h3><p>Creator indicato: <strong>@{item.creatorUsername}</strong></p><a href={item.instagramUrl} target="_blank" rel="noreferrer">Apri il contenuto</a></div><button className="button danger" onClick={() => removeContent(item)}>Elimina</button></article>)}
        </div>

        <div className="access-list">
          <p className="season">ACCESSO CLASSIFICA</p>
          <h2>Abilita utenti</h2>
          <p>Seleziona la casella per consentire classifica, voti, like e commenti.</p>
          {!status && !users.length && <p className="empty-access">Nessun utente registrato ancora. Gli utenti compaiono qui dopo aver creato un account o aver effettuato l&apos;accesso con Google.</p>}
          {users.map((member) => {
            const isEditing = editingUserId === member.id;
            const displayName = member.username?.trim() || "Username mancante";
            return (
              <div key={member.id} className="access-row">
                <div className="user-details">
                  {isEditing ? <label className="username-editor">Username<input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} aria-label={`Username per ${member.email ?? "utente"}`} /></label> : <span><strong>{displayName}</strong><small>{member.email ?? "Email non disponibile"}</small></span>}
                </div>
                <div className="access-actions">
                  {isEditing ? <><button className="button" type="button" onClick={() => saveUsername(member)}>Salva</button><button className="text-button" type="button" onClick={cancelEditing}>Annulla</button></> : <button className="text-button" type="button" onClick={() => startEditing(member)}>Modifica</button>}
                  <label className="access-toggle"><span className="sr-only">Abilita {displayName} alla classifica</span><input type="checkbox" checked={enabled.includes(member.id)} onChange={() => toggleAccess(member.id)} /></label>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
