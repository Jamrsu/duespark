
# DueSpark – Frontend (Starter)

Minimal React + TypeScript + Vite-style structure. **Not production** – just a starter.

## Quickstart
```bash
npm install
npm run dev
```

## API Types & Envelope
- Backend responses are wrapped as `{ data, meta }`.
- Minimal TypeScript types live in `src/types/api.ts` and helpers in `src/utils/api.ts`.

### Generating types from OpenAPI (optional)
When ready to automate, you can generate types from `openapi_updated.yaml`:
```bash
# Option A: openapi-typescript (recommended)
npx openapi-typescript ../openapi_updated.yaml -o src/types/__generated__/api.d.ts

# Option B: OpenAPI Generator (typescript-axios)
npx @openapitools/openapi-generator-cli generate \
  -i ../openapi_updated.yaml -g typescript-axios -o src/types/__generated__
```
Then import the generated types in place of the minimal ones. Adjust API calls to expect the envelope if you keep it server-side, or use a client generator configured to unwrap.

## Getting a JWT Token (UI helper)
- Use the "Register" and "Login" buttons at the top of the app to create a user and fetch a token; it will be saved to `localStorage` and used by all requests.
- Alternatively, paste an existing token into the "Save Token" box.
