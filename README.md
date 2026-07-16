# Shadow Collections — website

Next.js site for Shadow Collections, Chakkaraparambu · Vennala · Kochi.

- `/` — the shop website
- `/admin` — photo management portal (Supabase login required)

## Local development

```bash
npm install
npm run dev
```

## Supabase connection

Set two environment variables (Vercel → Project → Settings → Environment
Variables, or a local `.env.local` file):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Until these are set, the site shows sample gallery photos and `/admin`
shows a setup notice.

## Deploy

Push to the GitHub repo connected to Vercel — it auto-detects Next.js and
deploys. No build settings needed.
