# Visual Factory Cloudflare Stable Access

Goal: provide a steadier public entry for China + Middle East trial users.

## Recommended path

Use Cloudflare Pages for the Visual Factory shell and Cloudflare Pages Functions for admin APIs.
Supabase remains the source of truth for login, database, storage, and permissions.

## Why this path

- Cloudflare Pages supports Direct Upload to Cloudflare's global network.
- Pages Functions let `/api/health` and `/api/admin/create-user` keep working after moving away from Vercel.
- Drag-and-drop upload does not support a `functions` folder, so use Wrangler for this project.

## What is already prepared

- Static build command: `npm run build:pages`
- Cloudflare config: `wrangler.toml`
- Cloudflare Pages Functions:
  - `/api/health`
  - `/api/admin/create-user`

## One-time setup

1. Create or log in to a Cloudflare account.
2. Buy a domain or add an existing domain to Cloudflare.
3. Create a Pages project named `visual-factory`.
4. Add encrypted secret:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: the service role key stored locally at:
     `/Users/harvey/Documents/visual-factory-secrets/SUPABASE_SERVICE_ROLE_KEY.txt`

## Deploy commands

Run from `/Users/harvey/Documents/visual-factory`:

```sh
npm run build:pages
npx wrangler pages deploy dist --project-name visual-factory --branch main
```

If the Pages project does not exist yet, Wrangler can create it during deploy.

## Secret command option

After Cloudflare login:

```sh
npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name visual-factory
```

Paste the service role key when prompted. Do not commit it to Git.

## Custom domain

In Cloudflare dashboard:

1. Workers & Pages
2. Open `visual-factory`
3. Custom domains
4. Set up a domain
5. Choose the domain, for example `app.your-domain.com`

## Trial checklist

- `/api/health` returns `ready: true`
- Admin can create a user
- Designer can upload source + previews
- Operator can download previews
- Operator cannot download source files
- Static DIY receives a library preview
- Dynamic DIY receives a library preview
