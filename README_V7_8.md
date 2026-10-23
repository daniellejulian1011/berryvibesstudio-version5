# Berry Vibes CCD V7.8 — Auth + What I Actually Made Repair

## Fixed
- Restored the missing `initAuth()` implementation. Login, signup, forgot password, reset password, and forgot username now have working handlers again.
- Existing browser accounts are supported by username or email, case-insensitively.
- If a configured backend is unavailable, sign-in can fall back to a matching browser account instead of leaving the form dead.
- The Food page's "THE ONLY THING I CHANGED FROM THE RECIPE I CREATED WAS...." calculator now parses flexible natural-language changes and recalculates calories, carbs, protein, fat, and fiber live.
- Supports tsp, tbsp, cups, fl oz, oz, lb, g, kg, ml, slices, eggs, bottles, packets, scoops, sticks, cloves, pinches, dashes, items/servings, fractions, decimals, mixed fractions, and number words.
- Handles add/remove/use/swap/replace/without/extra/more/less/double/triple/half phrasing.
- Adds common pantry nutrition fallbacks plus the existing Pantry, Grocery, Food Vault, Builder, and Restaurant nutrition libraries.
- Saved modified recipes display calories and all four macros.

## Important limitation
A static browser app cannot truthfully know the nutrition of a completely unknown ingredient that does not exist anywhere in its nutrition data. V7.8 now flags that situation clearly instead of silently pretending the unknown change is zero calories. Add the ingredient once to Grocery/Recipe Lab and future free-form changes can calculate it automatically.

## Upload
Replace `script.js`, `style.css`, and `foods.html`. The auth HTML files are included in the patch for completeness, but their markup was not the source of the login failure.
Keep your current `data.js` and `config.js` in the repository.
