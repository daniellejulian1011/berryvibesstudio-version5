window.CCD_CONFIG = {
  // GitHub Pages cannot run Node routes, so the site automatically uses its browser-local
  // account fallback there. To use the included real Node backend from GitHub Pages, put
  // your deployed HTTPS API URL below instead of an empty string.
  API_BASE: location.hostname.endsWith("github.io") ? "" : ((location.protocol === "http:" || location.protocol === "https:") ? location.origin : ""),
  STORAGE_PREFIX: "berryVibesCCDNeo",
  AUTH_MODE: "auto"
};
