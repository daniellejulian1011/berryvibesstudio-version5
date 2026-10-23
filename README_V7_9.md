# Berry Vibes CCD V7.9 — Legacy Sign-In Migration Fix

This patch fixes older Berry Vibes browser accounts that were created with the original `berryVibesAccountsV6` account format.

## What changed
- Login now checks the current account format first.
- If no current match is found, it securely checks the older V6 browser account store.
- Older V6 passwords are verified using the original V6 hash format; no password is hardcoded into the site.
- A valid legacy account is automatically migrated into the current account format.
- The current Berry Vibes data/profile is preserved when present.
- If only old V6 account data exists, compatible profile/log/custom-recipe/restaurant data is imported into the new account container.

## Replace
Replace only `script.js` if you are already on V7.8.

Then hard-refresh the site (Ctrl+F5 on Windows).
