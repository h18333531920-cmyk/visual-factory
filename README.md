# Visual Factory V1

V1 is a stability-first integration shell:

- Public login page
- Supabase Auth for email/password accounts
- White SaaS sidebar shell
- Embedded legacy Library, Static DIY, and Dynamic DIY tools
- Cloud project-save foundation
- Admin UI for creating accounts and categories
- Supabase SQL schema for profiles, categories, assets, projects, and storage buckets

## Local Preview

```bash
npm run dev
```

Open `http://127.0.0.1:8791/`.

Local preview can use the local role buttons. Those buttons are only for checking the shell UI and do not write to Supabase.

## Supabase Setup

Done for the current project:

- Supabase project: `https://juuqvjmhzdgfggzrivbb.supabase.co`
- Core SQL has been run successfully.
- First admin account has been created and confirmed.
- Cloud project save has been smoke-tested successfully.

Admin account backup is stored locally outside this deployable folder.

## Vercel Environment Variables

Set these on Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

AI routes are currently authenticated stubs. The previous Volcengine implementation is preserved at:

`docs/server0603.reference.js`

## Migration Notes

The files under `tools/` are copies of the current tools. The original files on Desktop are not modified.

The next stable step is to migrate the material library data model from `assets_library` into `vf_assets` and connect image selection from the library into both DIY tools.

## Verified On 2026-06-03

- Admin email/password login works.
- `vf-projects` private storage upload works.
- `vf_projects` insert and read works under authenticated RLS.
