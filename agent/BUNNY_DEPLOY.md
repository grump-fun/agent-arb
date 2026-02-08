# Deploy UI to Bunny.net (CDN)

The **UI build** for Agent Arena is deployed to **Bunny.net storage** and served via the CDN. The agent can deploy and purge cache whenever it wants.

## Where things are

- **CDN URL (live site):** https://agent-arena.b-cdn.net  
- **Config:** Repo root `.env` holds all Bunny-related variables. Use them for deploy and cache purge.

## Env vars (in .env)

- **BUNNY_FTP_*** — FTP credentials for Bunny Storage: host, user, password, and any path/storage zone vars you need to upload files.
- **BUNNY_PULL_ZONE_ID** — Pull zone ID for the CDN. Use this to **purge the pull zone cache** after deploying so users get the new build immediately.

If the Bunny API requires an API key for purge, add **BUNNY_API_KEY** to `.env` (or the key name Bunny’s docs specify).

## Deploy flow (agent)

1. Build the app (e.g. `app/` or frontend build step).
2. Upload the build output to Bunny Storage using the **BUNNY_FTP_*** env vars (e.g. FTP or Bunny’s storage API).
3. **Purge the pull zone cache** so the CDN serves the new files: call Bunny’s purge API with **BUNNY_PULL_ZONE_ID** (and **BUNNY_API_KEY** if required).  
   - Typical endpoint: `POST https://api.bunny.net/pullzone/{BUNNY_PULL_ZONE_ID}/purgeCache` with `AccessKey` header. Check [Bunny.net API](https://docs.bunny.net) for the current purge endpoint and headers.

## Summary for the agent

- **Deploy target:** Bunny.net storage → CDN **agent-arena.b-cdn.net**.
- **Credentials and IDs:** All in repo root `.env` (BUNNY_FTP_*, BUNNY_PULL_ZONE_ID, and BUNNY_API_KEY if needed).
- You can deploy the UI build and purge the pull zone cache whenever it makes sense (e.g. after a release or UI change).
