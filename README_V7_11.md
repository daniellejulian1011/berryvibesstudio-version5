# Berry Vibes CCD V7.11 — Existing Progress Recovery

This patch fixes browser-local sign-in recovery when a user has existing Berry Vibes progress but the auth record is missing, corrupted, stored under an older key, or the saved profile label does not match the login username.

## What changed
- Keeps normal password verification for current accounts.
- Keeps V6/V7 legacy account migration.
- Scans Berry/CCD storage for meaningful saved progress if the auth record cannot be verified.
- Scores candidate progress and prefers identity-matched/richer history.
- Creates a recovery backup before migration.
- Offers explicit confirmation before re-binding unmatched browser progress.
- Re-binds the existing progress to the username/email and password entered on the login form.
- Adds a `RECOVER MY EXISTING PROGRESS` button to the login card as a manual fallback.
- Does not clear logs, recipes, fasts, movement history, restaurant data, grocery data, period data, settings, or profile data during recovery.

## Install
If your site is already on V7.8–V7.10, replace only `script.js`, deploy GitHub Pages, and hard-refresh (Ctrl+F5).

On the login page, enter your existing username/email and password and press Sign In. If the old login record cannot be verified but progress is found, accept the recovery confirmation. You can also use the new recovery button directly.
