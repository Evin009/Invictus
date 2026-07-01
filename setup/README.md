# Invictus — DigitalOcean Deployment

## 1. Create a Droplet

- **Image:** Ubuntu 22.04 LTS
- **Size:** Basic / Regular — $6/mo (1 vCPU, 1 GB RAM) is sufficient
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

Required variables (see `.env.example` for full list):
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_WEBHOOK_URL`
- `GMAIL_CREDENTIALS_PATH` — path to OAuth credentials JSON on the droplet
- `HUNTER_API_KEY`

## 4. Upload Gmail credentials

```bash
scp gmail_credentials.json root@<droplet-ip>:/opt/invictus/gmail_credentials.json
```

Then set `GMAIL_CREDENTIALS_PATH=/opt/invictus/gmail_credentials.json` in `.env`.

## 5. Upload your resume

```bash
scp resume.tex root@<droplet-ip>:/opt/invictus/resumes/resume.tex
```

Then set `BASE_RESUME_TEX=/opt/invictus/resumes/resume.tex` in `.env`.

## 6. Seed the database

Edit `setup/seed.py` — fill in your profile, preferences, watchlist, and tone examples. Then run:

```bash
python setup/seed.py
```

Run this once on the droplet after `.env` is filled. Re-run any time you update your preferences or watchlist.

## 7. Embed your resume

```bash
python -c "from src.rag.embedder import embed_resumes; embed_resumes('resumes/')"
```

Re-run whenever `resumes/resume.tex` changes.

## 8. Run the provisioning script

```bash
bash /opt/invictus/setup/deploy.sh
```

This installs Python 3.11, all dependencies, Playwright Chromium, and registers the hourly cron job.

## 9. Verify

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
