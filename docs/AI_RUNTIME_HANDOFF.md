# GCC Design AI Interface Configuration

This document is the single source of truth for the Cloudflare Pages Functions
configuration used by GCC Design. It intentionally contains **variable names and
non-secret defaults only**. Real keys must never enter Git, browser code, screenshots,
or chat messages.

## Current status

The formal Cloudflare Pages project is `visual-factory`. Its production environment
currently has all required AI and Supabase secrets configured. Verify the runtime at:

```text
https://gccdesign.app/api/health
```

The response must have all of the following as `true`:

```json
{
  "ready": true,
  "aiReady": true,
  "openaiReady": true,
  "lk888Ready": true,
  "volcImageReady": true,
  "volcOutpaintReady": true
}
```

## Why local/GitHub Pages calls fail

`/api/generate-image` is a Cloudflare Pages Function. GitHub Pages, `github.io`,
and a plain static server such as `localhost:8791` can serve HTML/CSS/JS but cannot
run `functions/`. When a static server receives `/api/generate-image`, it returns an
HTML page; trying to parse that response as JSON creates the familiar
`Unexpected token '<'` error.

For AI testing, Zane must use either:

1. a Cloudflare Pages branch deployment; or
2. `wrangler pages dev` with a private local `.dev.vars` file.

Do not test AI from GitHub Pages.

## Required encrypted secrets

Set these under Cloudflare Dashboard -> Workers & Pages -> `visual-factory` ->
Settings -> Variables and Secrets. The same names are used by the Functions code.

| Capability | Required variable names | Notes |
| --- | --- | --- |
| Cloud assets, login, temporary reference-image URLs | `SUPABASE_SERVICE_ROLE_KEY` | Required for the application to be healthy and for LK888 reference-image uploads. |
| GPT Image 2 through MochEN AI | `LK888_API_KEY` | Recommended current GPT image route. |
| Official OpenAI fallback | `OPENAI_API_KEY` | Used when LK888 is unavailable; region restrictions can apply. |
| Volc text-to-image | `VOLC_API_KEY`, `ENDPOINT_ID` | Required together. |
| Volc image-to-image | `VOLC_API_KEY`, `ENDPOINT_ID` | Set `VOLC_I2I_ENDPOINT_ID` only if Volc gives a dedicated image-to-image endpoint. |
| Volc outpainting | `VOLC_ACCESS_KEY_ID`, `VOLC_SECRET_ACCESS_KEY` | Separate from the Volc image API key. |

Cloudflare only displays encrypted values. It is intentionally impossible to export
an existing secret value through Wrangler or the dashboard. If a value must be shared
for local development, the account owner must retrieve it from the original provider
or transfer it through an approved password manager or encrypted secret-sharing tool.

## Non-secret defaults

These values are already the application defaults; putting them in Cloudflare is
optional but can make the configuration explicit.

| Variable | Value |
| --- | --- |
| `LK888_BASE_URL` | `https://api.lk888.ai` |
| `LK888_IMAGE_MODEL` | `gpt-image-2` |
| `LK888_TEXT_MODEL` | `gpt-5.5` |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1.5` |
| `OPENAI_TEXT_MODEL` | `gpt-5.4-mini` |
| `SUPABASE_URL` | `https://juuqvjmhzdgfggzrivbb.supabase.co` |
| `SUPABASE_ANON_KEY` | Public publishable key supplied in `wrangler.toml`; it is not a service-role secret. |

## Zane's safe workflow

### Preferred: Cloudflare branch deployment

This route needs no private key on Zane's computer. Give Zane Cloudflare access that
can deploy to the `visual-factory` Pages project, but not necessarily permission to
view or rotate secrets.

```bash
git switch <zane-branch>
npm run build:pages
npx wrangler pages deploy dist --project-name visual-factory --branch zane-ai-test
```

Then Zane opens the deployment URL printed by Wrangler and confirms:

```bash
curl -sS https://zane-ai-test.visual-factory.pages.dev/api/health
```

All successful branch deployments in this project use the same Cloudflare Functions
runtime and encrypted configuration as the formal site. Frontend-only hosts such as
GitHub Pages must not be used for the AI test link.

### Local-only option

```bash
cp .dev.vars.example .dev.vars
# Fill the required secrets locally. Do not commit this file.
npm run build:pages
npx wrangler pages dev dist
```

Open the URL printed by Wrangler, not `file://`, GitHub Pages, or a generic static
server. `.dev.vars` is ignored by Git.

## Deployment safety check

Before sharing any test or formal link, run:

```bash
curl -sS https://<deployment-host>/api/health
```

If any readiness value is `false`, stop and fix the Cloudflare variables before
testing image generation. This protects the API runtime from frontend changes by
either developer: UI work can change controls, but it must continue calling the
stable `/api/generate-image`, `/api/generate-image-status`, `/api/enhance-prompt`,
and `/api/health` paths.
