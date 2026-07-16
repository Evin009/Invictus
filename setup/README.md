# Invictus — DigitalOcean Deployment

## 1. Create a Droplet

- **Image:** Ubuntu 22.04 LTS
- **Size:** 1 GB RAM ($6-7/mo) preferred. On the $4/mo 512MB tier, `deploy.sh`
  provisions a 2GB swap file automatically — works, just slower under memory
  pressure (swap is disk, not RAM) since Playwright + latexmk + Python can
  exceed 512MB of physical RAM on their own.
- **Region:** Any
- **Authentication:** SSH key (recommended)

## 2. Clone the repo on the droplet

```bash
ssh root@<droplet-ip>
git clone https://github.com/<your-username>/Invictus.git /opt/invictus
```

## 3. Set up environment variables

```bash
cp /opt/invictus/.env.example /opt/invictus/.env
nano /opt/invictus/.env   # fill in all values
```

Required variables (see `.env.example` for the full list):
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — same project the web app uses
- `GMAIL_CREDENTIALS_PATH` — path to the authorized token JSON on the droplet (see step 4)
- `HUNTER_API_KEY` — optional, only gates cold-outreach contact lookup

Slack is no longer a static env var — it's connected per-user through the web app's
Settings page (OAuth), stored in the `slack_integration` table. Nothing to set here.

## 4. Gmail credentials

The OAuth consent flow (`setup/gmail_auth.py`) needs a real browser, so run it on your
own machine first, then copy the resulting token to the droplet:

```bash
# on your machine, once:
python setup/gmail_auth.py   # opens a browser, writes gmail_token.json

# copy it to the droplet:
scp gmail_token.json root@<droplet-ip>:/opt/invictus/gmail_token.json
```

Set `GMAIL_CREDENTIALS_PATH=/opt/invictus/gmail_token.json` in `.env`.

Note: while the Google Cloud project's OAuth consent screen is in "Testing" status,
the refresh token expires after 7 days — rerun `gmail_auth.py` and re-copy weekly,
or submit the app for Google's verification to move it to "In production".

## 5. Resume, profile, preferences, watchlist

All of this now lives in Supabase, set up through the web app (onboarding, or the
Profile/Resume/Cover Letter pages) — not local files or `setup/seed.py`. As long as
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` point at the same project the web app
writes to, the backend picks it all up automatically. Nothing to seed manually here.

## 6. Run the provisioning script

```bash
bash /opt/invictus/setup/deploy.sh
```

Installs Python 3.11, all dependencies, the LaTeX toolchain (`latexmk`, `pdfinfo`),
Playwright Chromium, and registers the hourly cron job.

## 7. Verify

```bash
# Manual test run (as service user)
sudo -u invictus bash -c 'cd /opt/invictus && .venv/bin/python run.py'

# Check cron job installed
cat /etc/cron.d/invictus

# Watch logs
tail -f /var/log/invictus.log
```

## Updating

```bash
ssh root@<droplet-ip>
cd /opt/invictus
git pull
sudo -u invictus /opt/invictus/.venv/bin/pip install -e .
# cron picks up changes automatically on next run
```
