#!/usr/bin/env bash
# Provision a fresh Ubuntu 22.04 DigitalOcean Droplet for Invictus.
# Run once as root on the droplet: bash deploy.sh
# Assumes repo is cloned to /opt/invictus and .env is present there.
set -euo pipefail

REPO_DIR="/opt/invictus"
SERVICE_USER="invictus"
VENV_DIR="$REPO_DIR/.venv"
LOG_FILE="/var/log/invictus.log"
LOGROTATE_CONF="/etc/logrotate.d/invictus"

echo "==> Updating system packages"
apt-get update -y
apt-get install -y python3.11 python3.11-venv python3-pip git curl logrotate

echo "==> Creating service user ($SERVICE_USER)"
id "$SERVICE_USER" &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
chown -R "$SERVICE_USER:$SERVICE_USER" "$REPO_DIR"

echo "==> Creating virtualenv"
sudo -u "$SERVICE_USER" python3.11 -m venv "$VENV_DIR"

echo "==> Installing Python dependencies"
sudo -u "$SERVICE_USER" "$VENV_DIR/bin/pip" install --upgrade pip
sudo -u "$SERVICE_USER" "$VENV_DIR/bin/pip" install -e "$REPO_DIR[dev]"

echo "==> Installing Playwright Chromium"
sudo -u "$SERVICE_USER" "$VENV_DIR/bin/playwright" install chromium
"$VENV_DIR/bin/playwright" install-deps chromium

echo "==> Verifying .env exists"
if [ ! -f "$REPO_DIR/.env" ]; then
    echo "ERROR: $REPO_DIR/.env not found. Copy .env.example and fill in values."
    exit 1
fi

echo "==> Creating log file"
touch "$LOG_FILE"
chown "$SERVICE_USER:$SERVICE_USER" "$LOG_FILE"

echo "==> Installing logrotate config"
cat > "$LOGROTATE_CONF" <<EOF
$LOG_FILE {
    daily
    rotate 14
    compress
    missingok
    notifempty
    create 0644 $SERVICE_USER $SERVICE_USER
}
EOF

echo "==> Installing cron job (hourly, runs as $SERVICE_USER)"
CRON_CMD="0 * * * * $SERVICE_USER cd $REPO_DIR && $VENV_DIR/bin/python run.py >> $LOG_FILE 2>&1"
CRON_FILE="/etc/cron.d/invictus"
echo "$CRON_CMD" > "$CRON_FILE"
chmod 644 "$CRON_FILE"

echo "==> Done. Invictus will run at the top of every hour."
echo "    Logs: $LOG_FILE"
echo "    Test run now: sudo -u $SERVICE_USER bash -c 'cd $REPO_DIR && $VENV_DIR/bin/python run.py'"
