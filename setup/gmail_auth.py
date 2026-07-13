#!/usr/bin/env python3
"""
One-time Gmail OAuth consent flow. Run once locally after placing the
downloaded OAuth client-secret JSON at the repo root as credentials.json:

  python setup/gmail_auth.py

Opens a browser for you to approve access, then writes the authorized
token (access + refresh token) to gmail_token.json. Point
GMAIL_CREDENTIALS_PATH at gmail_token.json in .env — reply_tracker.py
reads an authorized-user token file, not the raw client secret.

Note: while this Google Cloud project's OAuth consent screen is in
"Testing" status, the refresh token Google issues expires after 7 days —
you'll need to rerun this script weekly until the app is moved to
"In production" (requires Google's verification review).
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_SECRET_PATH = "credentials.json"
TOKEN_PATH = "gmail_token.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def main():
    if not os.path.exists(CLIENT_SECRET_PATH):
        print(f"ERROR: {CLIENT_SECRET_PATH} not found. Download it from Google Cloud Console first.")
        sys.exit(1)

    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_PATH, SCOPES)
    creds = flow.run_local_server(port=0)

    with open(TOKEN_PATH, "w") as f:
        f.write(creds.to_json())

    print(f"Saved authorized token to {TOKEN_PATH}")
    print(f"Set GMAIL_CREDENTIALS_PATH={TOKEN_PATH} in .env")


if __name__ == "__main__":
    main()
