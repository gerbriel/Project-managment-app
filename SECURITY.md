# Security

- Do not commit secrets. `.env.local` is ignored by git. Use `.env.example` as a template.
- Only expose browser-safe keys (`VITE_*`). Never expose `SUPABASE_SERVICE_ROLE` to client code.
- Database Row Level Security (RLS) is enabled. Apply `scripts/patch-rls.sql` to:
  - Use SECURITY DEFINER helper `public.is_workspace_member` for safe checks
  - Replace recursive policies with self-scoped policies on `workspace_members`
  - Add activity triggers for auditable changes
- Supabase Storage: use signed URLs for private buckets; keep bucket policies strict.
- Dependencies: keep `npm audit` clean; update promptly.
- Frontend:
  - Validate and sanitize user input before sending to backend (attachments URLs, comments, etc.).
  - Escape/serialize rich text properly (TipTap content). Avoid dangerouslySetInnerHTML.
- Operational:
  - Rotate keys if exposure suspected.
  - Restrict service role key usage to server-side scripts and CI secrets only.
