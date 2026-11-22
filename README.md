# Saraha-style anonymous messages site
Run: `node server.js` -> http://localhost:3000 (Node 18+, no packages). Tests: `node test.js`.
Site name: set `SITE_NAME="..."` (default همسه). Public URL used in emails: `BASE_URL`.

## Real sending (all optional; without these, messages are saved to the local outbox page /#/outbox only)
- Email / Gmail address notifications and password reset: `RESEND_API_KEY` + `MAIL_FROM` (needs a Resend account and a verified sender domain)
- Telegram: `TELEGRAM_BOT_TOKEN` (bot from @BotFather; user must start the bot, then enters their chat id)
- WhatsApp: `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` (Meta WhatsApp Cloud API, approved message templates)
- In production set `DEV_OUTBOX=0` to disable the local outbox page.

## Free deploy (Render)
Push this folder to a GitHub repo, then Render > New > Blueprint (uses render.yaml). Free plan sleeps after 15 min idle and its disk is erased on restart/redeploy, so data does not persist. Set BASE_URL to the service URL.

## Admin dashboard
Set `ADMIN_PASSWORD` (16+ chars) in the environment, then open `/#/admin`. Without it the admin API does not exist (404).
The admin sees counts and metadata only. Message text is visible only for threads the owner reported or the word filter flagged. Every action goes to the audit log.
Run `node test-admin.js` to check it.

## Durable storage (optional, free)
Without it, data lives in `data.json` (wiped on Render's free plan). To keep data across deploys, create a Supabase project and run:

    create table kv (id text primary key, data jsonb not null);

then set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. The whole database is stored as one row. The server refuses to start if it cannot load it, so it never overwrites good data with an empty one.
