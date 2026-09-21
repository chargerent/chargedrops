# ChargeDrops

ChargeDrops is a React and TypeScript single-page application built with Vite. It reads public location data from Firestore and uses Firebase Authentication and Firestore for the administration area.

## Local development

Use Node.js 22 and install the dependencies:

```bash
npm install
npm run dev
```

The app expects these values in `.env.local`:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_GOOGLE_MAPS_API_KEY
```

Do not commit `.env.local` or copy its values into source control.

## Verification

```bash
npm run lint
npm test
npm audit --omit=dev
```

`npm test` performs the TypeScript check and creates the production Vite build in `dist/`.

## Google hosting

The app is prepared for Firebase Hosting in the existing `chargedrops-dev` Firebase project. Firebase Hosting is the appropriate managed Google service because the application produces static files and talks directly to Firebase client services.

`firebase.json` publishes `dist/` and rewrites unknown paths to `index.html` so React Router routes such as `/map/:citySlug`, `/admin/login`, and `/admin` work when opened directly.

Build and deploy a temporary preview channel before updating the live channel:

```bash
npm run build
firebase hosting:channel:deploy migration-preview --expires 7d --project chargedrops-dev
```

After the preview is verified, deploy the exact build to the live Hosting channel:

```bash
firebase deploy --only hosting --project chargedrops-dev
```

The route guard requires a Firebase Authentication session before rendering the administration dashboard. Firestore Security Rules remain the authoritative control for all database reads and writes.
