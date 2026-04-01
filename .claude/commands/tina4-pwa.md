# Set Up tina4-js PWA

Make the app a Progressive Web App.

## Instructions

1. Configure PWA with app name and icons
2. The service worker and manifest are auto-generated

## Template

```javascript
import { pwa } from "tina4-js";

pwa({
    name: "My App",
    shortName: "App",
    themeColor: "#7b1fa2",
    backgroundColor: "#1e1e2e",
    display: "standalone",
    icons: ["/icon-192.png", "/icon-512.png"],
});
```

## Key Rules

- Call `pwa()` once at app startup
- Icons must be 192x192 and 512x512 PNG files in `src/public/`
- Service worker is auto-generated and registered
- Manifest is auto-generated from the config
- Offline support is built in
