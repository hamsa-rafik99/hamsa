# v18 pre-release gates

Nothing in this version activates a provider, schedules a backup, sends a real message, changes DNS or deploys the site.

## Email recovery and notifications
- Existing Resend code is now explicitly opt-in with EMAIL_ENABLED=1 plus RESEND_API_KEY and MAIL_FROM.
- Requires owner-approved account access and a sender/domain verified in Resend. Do not buy a domain or create an account without approval.
- Collect credentials securely. Do not paste API keys in chat or source.
- Provider acceptance is not delivery. End-to-end mailbox delivery, expiry, single use and invalidating old sessions must be checked with an approved test recipient before calling it ready.
- Recovery responses must not disclose whether a user exists. When not configured, all users get the same unavailable state.
- Production outgoing metadata omits destinations, content and password-reset URLs. Existing stored records are not migrated/deleted by this code.
- Telegram unchanged except accepted-request wording; no activation or send tested here.

## WhatsApp
- Disabled unless WHATSAPP_ENABLED=1 plus token, phone ID, WHATSAPP_API_VERSION, approved WHATSAPP_TEMPLATE and optional language code.
- Adapter expects an approved body template with two text parameters (notification title, inbox URL). Template compatibility is not live-tested.
- Need a sender account, recipient opt-in, template approval and owner approval of any charges. Number saved in settings is not verification that the person owns it. Do not activate until opt-in/ownership and template tests are complete.
- No claim of zero-cost WhatsApp sending. No signup or purchase performed.

## Public pages
- Privacy, terms, safety, FAQ and contact are DRAFTS. Owner must approve published support contact, data retention/deletion rules, operator identity, audience/age policy and applicable legal requirements.
- Current text intentionally says contact/retention are not fixed rather than inventing them. Do not publish it as a finalized legal policy.
- Existing admin UI privacy is distinct from server/database operator access. Copy now explains that limit.

## Backup preparation, not operational backup
- backup.js creates AES-256-GCM encrypted snapshots from an already-authorized LOCAL database export. It never retrieves live data or uploads anything.
- Use a separate 32-byte random key file created securely by an operator. Do not include the key with the snapshot, source archive, Drive release folder or chat. Key loss makes restore impossible.
- Commands: node backup.js create LOCAL_DB NEW_SNAPSHOT KEY_FILE; verify SNAPSHOT unused KEY_FILE; restore SNAPSHOT NEW_LOCAL_DB KEY_FILE.
- Restore always refuses overwrite, checks authenticated encryption/structure, clears sessions/reset tokens/outbox and writes a NEW local file. It does not replace production data.
- Database snapshot alone is NOT a full system backup. It excludes private storage objects, environment secrets and provider configuration. Story objects need a separately approved export procedure; expired stories must not be republished on restore.
- Still need approved offsite private destination, retention, key custody, schedule, storage budget and a full restore drill. No live backup or restore has happened.

## SEO
- Homepage initial HTML now contains useful public content. FAQ, safety and draft policy pages are server-rendered real URLs included in the sitemap, without private accounts/messages.
- Existing hash-based app routes remain for compatibility. This is not a full app routing migration or a promise of search ranking.
