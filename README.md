# ReelRank

Piattaforma per classificare Reel e post Instagram per stagione, con classifica dei contenuti e dei creator. Il link può essere segnalato da chiunque: il merito viene attribuito al creator Instagram indicato.

## Avvio locale

1. Crea un progetto gratuito su [Supabase](https://supabase.com).
2. Nel **SQL Editor**, esegui in ordine `supabase/migrations/001_initial.sql` e `supabase/migrations/002_admin_moderation.sql`.
3. Copia `.env.example` in `.env.local` e completa le chiavi Supabase.
4. Esegui `npm install` e poi `npm run dev`.

## Bot Telegram → database → sito

1. Crea il bot con [@BotFather](https://t.me/BotFather) e inserisci il token in `TELEGRAM_BOT_TOKEN`.
2. Genera una stringa casuale lunga e inseriscila in `TELEGRAM_WEBHOOK_SECRET`.
3. Dopo il deploy, imposta il webhook Telegram (sostituisci i valori):

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://tuo-dominio.it/api/telegram" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

4. Nel bot invia:

```text
/submit @creator_originale https://www.instagram.com/reel/CODICE/ Titolo opzionale
```

Il bot verifica il formato, crea/trova il creator, salva il contenuto nella stagione attiva e lo pubblica subito online. Le proposte inserite dal form del sito restano invece `pending`, così un moderatore può verificarne l'attribuzione prima della pubblicazione.

## Moderazione admin

Per promuovere un utente ad amministratore, dopo la sua prima registrazione esegui nel SQL Editor:

```sql
update public.profiles set role = 'admin' where username = 'il_tuo_username';
```

L'admin può quindi aprire `/admin`, verificare le proposte manuali e scegliere **Approva** (visibile nella classifica) oppure **Nascondi**.

## Deploy

Pubblica il repository su GitHub e importalo in Vercel. Copia in Vercel tutte le variabili di `.env.local`. L'endpoint Telegram deve usare un dominio HTTPS pubblico.

## Limite Instagram

Il MVP salva e incorpora URL pubblici. Non scarica Reel né legge dati privati Instagram. L'import completo dei dati richiede Meta/Instagram Graph API e un account Business o Creator autorizzato.
