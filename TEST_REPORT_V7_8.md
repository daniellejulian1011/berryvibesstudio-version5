# V7.8 Test Report

- `node --check script.js`: PASS
- Missing boot initializer check: PASS (0 missing; `initAuth` restored)
- Local auth integration test: PASS
  - login handler attached
  - email login matched
  - username login matched case-insensitively
  - wrong password rejected
  - successful login wrote a `local:` token
  - successful login redirected to `index.html`
- Flexible recipe parser test: PASS
  - removed 1/4 cup flour + added two tsp cocoa
  - whole egg + cinnamon + 2 tbsp sour cream
  - swapped 2 egg whites for 1 whole egg
  - removed butter + added 1 tbsp olive oil
  - 3 oz chicken instead of 2 oz steak
- Food modification live macro preview wiring: PASS
- Duplicate IDs in login/foods/signup/recovery pages: 0
- CSS brace balance: PASS
