# tryed (React + Supabase)

Project management application with multi-board support. React + TypeScript + Vite, Tailwind (dark), Supabase (Auth, Postgres, Storage, Realtime).

## Tech
- React + TypeScript + Vite
- Tailwind CSS (dark, orange accent)
- Supabase (Postgres, Auth, Storage, Realtime)
- dnd-kit, React Router, React Query
- date-fns, TipTap, react-leaflet, react-pdf

## Prerequisites
- Node.js 18+
- npm 9+

## Install dependencies (macOS zsh)
```zsh
# create project deps
npm install

# runtime deps
npm install react react-dom react-router-dom @tanstack/react-query @supabase/supabase-js date-fns \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers \
  @tiptap/react @tiptap/starter-kit react-leaflet leaflet react-pdf classnames

# dev deps
npm install -D typescript vite @vitejs/plugin-react \
  tailwindcss postcss autoprefixer \
  eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier prettier \
  @types/react @types/react-dom

# tailwind init (already configured)
npx tailwindcss init -p
```

## Scripts
```zsh
npm run dev       # start Vite dev server
npm run build     # build for production
npm run preview   # preview production build
npm run lint      # lint with ESLint
npm run format    # format with Prettier
npm run typecheck # TypeScript check
```

## Env
Create `.env.local` with your Supabase project values:
```
VITE_SUPABASE_URL=... 
VITE_SUPABASE_ANON_KEY=...
```

## Supabase schema
SQL at `schema/schema.sql`. Apply via Supabase SQL editor or CLI. Includes RLS and RPC `move_card`.

### Fix RLS recursion (if you see 500s on boards)
If fetching boards returns a 500 (RLS recursion between `is_workspace_member` and policies), apply the patch at `scripts/patch-rls.sql` in the Supabase SQL editor:

1) Open Supabase → SQL editor → New query → paste the contents of `scripts/patch-rls.sql` → Run
2) Verify it worked:
  - Function `public.is_workspace_member(uid uuid, ws_id uuid)` exists and is SECURITY DEFINER
  - Only self-scoped policies exist on `workspace_members` (select/insert/update/delete)
3) Locally, re-run:
  - `node scripts/test-boards.cjs` → should print a list of boards
  - Load `/dev/status` → "Boards readable" should be >= 1

## Leaflet & PDF setup
- Leaflet CSS imported in `src/index.css`.
- For react-pdf worker, add near app bootstrap if you render PDFs:
```ts
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
```

## Run
```zsh
npm run dev
```

## Notes
- Components are placeholders with TODOs; they compile.
- API modules are stubs; wire queries/mutations as you integrate.
- Move card uses Supabase RPC `move_card` (see `src/api/cards.ts`).

## Seed demo data
Set your service role key (never expose in client) in `.env.local`:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE=...
```
Then run:
```zsh
npm run seed
```
This creates:
- Workspace “Quality Metal Carports”
- Boards: New Leads, Quoted, Dealer Orders, Order Confirmation, Engineering, Permitting, Manufacturing and Scheduling
- Lists (incl. “Sent to Manufacturing”, “This Week – Juan’s Crew”, “Next Week – Esdras’ Crew”)
- Example card “Lorna Scholten” with labels, dates (Sep 16–17, 2025), custom fields, 4 PDF attachments (placeholder URLs), checklist, and 3 comments by “Gladis”.

## Security & secrets
- Never commit secrets. `.env.local` is ignored by git.
- Only expose client-safe keys (prefixed with `VITE_`) to the browser. Do NOT expose `SUPABASE_SERVICE_ROLE` in client code.
- RLS is enforced in the database; see `scripts/patch-rls.sql` for hardened policies and SECURITY DEFINER helpers.

## Push to GitHub safely
```zsh
git init
git add .
git commit -m "init: tryed project management app"
git branch -M main
git remote add origin <your-new-repo-url>
git push -u origin main
```
Before pushing, double-check no secrets in tracked files (grep for `SUPABASE`/`KEY`/`PASSWORD`).
