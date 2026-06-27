#!/usr/bin/env bash
# Provision a fresh Ubuntu 22.04 DigitalOcean Droplet for Invictus.
# Run once as root on the droplet: bash deploy.sh
# Assumes repo is cloned to /opt/invictus and .env is present there.
set -euo pipefail

REPO_DIR="/opt/invictus"
VENV_DIR="$REPO_DIR/.venv"
CRON_USER="root"
LOG_FILE="/var/log/invictus.log"

echo "==> Updating system packages"
apt-get update -y
apt-get install -y python3.11 python3.11-venv python3-pip git curl

echo "==> Creating virtualenv"
python3.11 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

echo "==> Installing Python dependencies"
pip install --upgrade pip
pip install -e "$REPO_DIR[dev]"

echo "==> Installing Playwright Chromium"
playwright install chromium
playwright install-deps chromium

echo "==> Verifying .env exists"
if [ ! -f "$REPO_DIR/.env" ]; then
    echo "ERROR: $REPO_DIR/.env not found. Copy .env.example and fill in values."
    exit 1
fi

echo "==> Creating log file"
touch "$LOG_FILE"

echo "==> Installing cron job (hourly)"
CRON_CMD="0 * * * * cd $REPO_DIR && $VENV_DIR/bin/python run.py >> $LOG_FILE 2>&1"
(crontab -l -u "$CRON_USER" 2>/dev/null | grep -v "invictus"; echo "$CRON_CMD") | crontab -u "$CRON_USER" -

echo "==> Done. Invictus will run at the top of every hour."
echo "    Logs: $LOG_FILE"
echo "    Test run now: cd $REPO_DIR && $VENV_DIR/bin/python run.py"
