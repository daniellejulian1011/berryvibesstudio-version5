# Berry Vibes CCD V6.6

V6.6 repairs the Get Started experience, isolates fresh-account data, and adds account/cache/data controls to Settings.

## New in V6.6
- Get Started is locked to the viewport: no browser scrollbars, no nested step scrollbars, and no sideways overflow.
- Step transitions now use smoother slide/fade/blur motion, staggered cards, animated aurora/grid movement, and responsive height-aware sizing.
- Height and age controls support smooth wheel/drag interaction without scrolling the page.
- Fresh accounts start with fresh CCD storage. Existing browser data is cleared from the newly-created account flow instead of appearing in the new account.
- Local browser accounts now snapshot their own CCD data before account switching/sign-out and restore it when that account signs back in, reducing cross-account data bleed.
- Get Started is intended for newly created/incomplete accounts. Completed accounts are redirected back to Today if they revisit it directly.
- Settings now includes CLEAR CACHE, CLEAR ALL DATA, and DELETE ACCOUNT.
- CLEAR CACHE removes temporary browser/session caches while keeping the account and saved CCD data.
- CLEAR ALL DATA keeps the login account but resets CCD data/profile settings and routes back through Get Started.
- DELETE ACCOUNT removes the current local account or calls the backend deletion endpoint when server mode is connected.
- The Node backend now supports `DELETE /api/account/data` and `DELETE /api/account`.

# Berry Vibes CCD V6.5

V6.5 adds complete calorie display coverage for the recipe vault, a save-recipe system, and an animated post-signup Get Started experience.

## New in V6.5
- Every archive recipe now displays a non-zero calorie value. Preserved recipe calories are used first; missing archive values fall back to a deterministic same-group median estimate so recipe cards never show blank/0 by accident.
- Save/unsave recipes with heart buttons, save from the full recipe dialog, and browse a Saved Recipes collection.
- New `get-started.html` onboarding shown immediately after account creation.
- Onboarding saves goal, height, age, and typical activity to the profile, then triggers the animated Berry Vibes intro before entering Today.
- Server profile persistence extended for onboarding fields.

# Berry Vibes CCD V6.2

V6.2 fixes login intro ordering, adds Settings directly to the visible menu bar, makes recipe-change calorie math update live while typing, removes manual fast start, and adds full individual fasting-log detail views.

# Berry Vibes × CCD — V6 Dynamic Lab Build

This is the current GitHub-ready Berry Vibes CCD website package.

## V6 changes

- Removed the standalone SOTD page and its navigation entry. Saved snack/treat content remains available through the Food page filters and food archive.
- Food now starts with an **ALL FOODS** category that combines the complete food library, custom foods, and recipes created in the Recipe Builder Lab.
- Reworked photo selection controls so the real browser file input is visible and tappable on mobile. Food photos, recipe-card photos, custom-food photos, calendar photos, grocery photos, profile/settings photos, and builder recipe photos use real file controls.
- Completely rebuilt the Recipe Builder Lab with:
  - searchable/category-filtered pantry
  - expanded built-in ingredient library
  - Grocery custom ingredients
  - add-a-new-ingredient directly in the lab
  - animated bowl/mix interaction
  - vertical ingredient chart
  - automatic calories, carbs, protein, fat and fiber
  - recipe name, meal type, yield, taste/expectation
  - instructions and variations
  - optional recipe photo
  - persistent Builder Recipe Vault
  - Builder recipes automatically become available on the Food page
- Rebuilt Food Battle with Randomize, Swap, Battle, five selectable metrics, animated fighters, stat meters, confetti, rematch, and a Full Stat Showdown.
- Added a broader V6 visual-motion layer across the site: animated ambient mesh, richer glass panels, motion entrances, interactive controls, and responsive mobile layouts.
- Previous V5.4 fasting behavior remains: Start Fast After Last Meal immediately logs the fast start, and breaking the fast logs the completed/break event.
- Settings continues to contain the merged account/profile controls.

## Photo uploads on GitHub Pages

When no external Node backend is connected, normal CCD image uploads are saved as browser-local image data with the associated local CCD data. The real file picker remains available on mobile and desktop. If the included Node backend is deployed and `API_BASE` is configured, uploads are sent to the backend upload route instead.

## Run locally

A simple static server can preview the site, but the included `server.js` is recommended when testing the backend features.

```bash
npm install
npm start
```

For GitHub Pages, upload the repository-root files. GitHub Pages hosts the frontend only. The included Node backend must be deployed separately if server-side sync/uploads are wanted.


## V6.1 updates
- Custom restaurant photo uploads now preview, compress for browser storage, save with the order, and can be removed before or after saving.
- Food photo and recipe-card selections have explicit remove controls.
- ALL FOODS is the first Food filter and combines every food source.
- Added Blueberry Pop, Cherry Soda, Mint Mochi, Lemon Cream, Sunset Sorbet, Midnight Berry, and Rose Gold full-site themes.
- Sign-in now triggers an animated Berry Vibes motion intro before the private site experience.
- Added kinetic text, ripple feedback, deeper hover motion, and animated header accents across the site.


## V6.3 button fit fix
The Recipe Modification calculator action button now uses a wider responsive grid cell, wraps safely, and is labeled APPLY + RECALCULATE so it never clips or spills outside its card.
