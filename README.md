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
