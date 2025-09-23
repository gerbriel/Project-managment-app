/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env (prefer .env.local)
const localEnv = path.join(process.cwd(), '.env.local');
if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv });
else dotenv.config();

(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const crypto = await import('node:crypto');
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  const DEMO_EMAIL = process.env.VITE_DEMO_EMAIL || process.env.DEMO_EMAIL || 'gabrielriosemail@gmail.com';
  const DEMO_PASSWORD = process.env.VITE_DEMO_PASSWORD || process.env.DEMO_PASSWORD || 'y3WDQjPBMgVlscwBSWKD8t5GQau9ia15';
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    const missing = [];
    if (!SUPABASE_URL) missing.push('SUPABASE_URL or VITE_SUPABASE_URL');
    if (!SERVICE_ROLE) missing.push('SUPABASE_SERVICE_ROLE');
    console.error('Seed aborted. Missing env var(s):', missing.join(', '));
    console.error('Create a .env.local with values. See .env.example and README Seed demo data section.');
    process.exit(1);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const uuid = () => crypto.randomUUID();
  const now = new Date();

  console.log('Seeding QMC Kanban demo data...');

  // Helper: ensure record exists or create
  async function ensureWorkspace(name) {
    const { data: ws, error } = await sb.from('workspaces').select('id, name').eq('name', name).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error; // ignore No rows error
    if (ws) return ws;
    const { data, error: insErr } = await sb.from('workspaces').insert({ name }).select('id, name').single();
    if (insErr) throw insErr;
    return data;
  }

  async function ensureWorkspaceMember(workspace_id, user_id, role) {
    const { data: mem, error } = await sb
      .from('workspace_members')
      .select('workspace_id, user_id, role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user_id)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (mem) return mem;
    const { data, error: insErr } = await sb
      .from('workspace_members')
      .insert({ workspace_id, user_id, role })
      .select('workspace_id, user_id, role')
      .single();
    if (insErr) throw insErr;
    return data;
  }

  async function ensureBoard(workspace_id, name) {
    const { data: b, error } = await sb
      .from('boards')
      .select('id, name')
      .eq('workspace_id', workspace_id)
      .eq('name', name)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (b) return b;
    const { data, error: insErr } = await sb
      .from('boards')
      .insert({ workspace_id, name })
      .select('id, name')
      .single();
    if (insErr) throw insErr;
    return data;
  }

  async function ensureList(board_id, name, position) {
    const { data: l, error } = await sb
      .from('lists')
      .select('id, name, position, board_id')
      .eq('board_id', board_id)
      .eq('name', name)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (l) return l;
    const { data, error: insErr } = await sb
      .from('lists')
      .insert({ board_id, name, position })
      .select('id, name, position, board_id')
      .single();
    if (insErr) throw insErr;
    return data;
  }

  async function ensureLabel(workspace_id, name, color) {
    const { data: lbl, error } = await sb
      .from('labels')
      .select('id, name')
      .eq('workspace_id', workspace_id)
      .eq('name', name)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (lbl) return lbl;
    const { data, error: insErr } = await sb
      .from('labels')
      .insert({ workspace_id, name, color })
      .select('id, name')
      .single();
    if (insErr) throw insErr;
    return data;
  }

  async function ensureFieldDef(workspace_id, name, type) {
    const { data: fd, error } = await sb
      .from('custom_field_defs')
      .select('id, name, type')
      .eq('workspace_id', workspace_id)
      .eq('name', name)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (fd) return fd;
    const { data, error: insErr } = await sb
      .from('custom_field_defs')
      .insert({ workspace_id, name, type })
      .select('id, name, type')
      .single();
    if (insErr) throw insErr;
    return data;
  }

  // Demo user (ensure exists) then use their id for membership/comments
  let gladisId;
  try {
    const { data: signUp, error: signUpErr } = await sb.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (signUpErr && signUpErr.message && !signUpErr.message.includes('already registered')) {
      throw signUpErr;
    }
    if (signUp?.user) gladisId = signUp.user.id;
  } catch (e) {
    // If already exists, fetch by email
    const { data: users, error: listErr } = await sb.auth.admin.listUsers();
    if (listErr) throw listErr;
    const u = users.users.find((u) => u.email === DEMO_EMAIL);
    if (!u) throw new Error('Failed to ensure demo user');
    gladisId = u.id;
  }

  // Ensure the demo user has the expected password (helps when account already exists via OAuth)
  try {
    await sb.auth.admin.updateUserById(gladisId, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
  } catch (e) {
    console.warn('Warning: could not update demo user password via admin API. If sign-in fails, reset it in Supabase Auth UI.');
  }

  // 1) Workspace
  const ws = await ensureWorkspace('Quality Metal Carports');
  const workspaceId = ws.id;

  // 2) Workspace member (Gladis)
  await ensureWorkspaceMember(workspaceId, gladisId, 'admin');

  // 3) Boards (requested set)
  const boards = [
    { name: 'New Leads' },
    { name: 'Quoted' },
    { name: 'Dealer Orders' },
    { name: 'Order Confirmation' },
    { name: 'Engineering' },
    { name: 'Permitting' },
    { name: 'Manufacturing and Scheduling' },
  ];
  // Ensure all boards exist
  for (const b of boards) await ensureBoard(workspaceId, b.name);
  // Specific references
  const engineeringBoard = await ensureBoard(workspaceId, 'Engineering');
  const manufacturingBoard = await ensureBoard(workspaceId, 'Manufacturing and Scheduling');

  // 4) Lists for each board
  const engineeringLists = [
    { name: 'Sent to Manufacturing', position: 1 },
    { name: 'This Week – Juan’s Crew', position: 2 },
    { name: 'Next Week – Esdras’ Crew', position: 3 },
  ];
  const manufacturingLists = [
    { name: 'Backlog', position: 1 },
    { name: 'Scheduling', position: 2 },
    { name: 'In Progress', position: 3 },
  ];

  for (const l of engineeringLists) await ensureList(engineeringBoard.id, l.name, l.position);
  for (const l of manufacturingLists) await ensureList(manufacturingBoard.id, l.name, l.position);
  // retrieve lists again for references
  const { data: listRowsEng } = await sb
    .from('lists')
    .select('id, name, board_id, position')
    .eq('board_id', engineeringBoard.id)
    .order('position');
  const sentToMfg = (listRowsEng || []).find((l) => l.name === 'Sent to Manufacturing');

  // 5) Labels (workspace-scoped)
  const labels = [
    { name: 'Dealer Order', color: '#60a5fa' },
    { name: 'Carport Connections (Gary)', color: '#22c55e' },
    { name: 'August 2025', color: '#f59e0b' },
  ];
  const labelRows = [];
  for (const l of labels) labelRows.push(await ensureLabel(workspaceId, l.name, l.color));

  // 6) Custom fields defs
  const fields = [
    { name: 'Phone 1', type: 'phone' },
    { name: 'Phone 2', type: 'phone' },
    { name: 'Email 1', type: 'email' },
    { name: 'Email 2', type: 'email' },
    { name: 'Functionality', type: 'checkbox' },
  ];
  const fieldDefs = [];
  for (const f of fields) fieldDefs.push(await ensureFieldDef(workspaceId, f.name, f.type));

  // 7) Create example card
  const dateStart = new Date('2025-09-16T00:00:00Z').toISOString();
  const dateEnd = new Date('2025-09-17T00:00:00Z').toISOString();
  // Ensure example card only once by title within list
  let { data: existingCard, error: selCardErr } = await sb
    .from('cards')
    .select('id')
    .eq('list_id', sentToMfg.id)
    .eq('title', 'Lorna Scholten')
    .maybeSingle();
  if (selCardErr && selCardErr.code !== 'PGRST116') throw selCardErr;
  let cardId;
  if (existingCard) {
    cardId = existingCard.id;
  } else {
    const { data: cardRow, error: cErr } = await sb
      .from('cards')
      .insert({
        workspace_id: workspaceId,
        board_id: engineeringBoard.id,
        list_id: sentToMfg.id,
        title: 'Lorna Scholten',
        description: null,
        date_start: dateStart,
        date_end: dateEnd,
        position: 1,
        created_by: gladisId,
      })
      .select('id')
      .single();
    if (cErr) throw cErr;
    cardId = cardRow.id;
  }

  // 7a) Card labels
  const dealer = labelRows.find((l) => l.name === 'Dealer Order');
  const carport = labelRows.find((l) => l.name.startsWith('Carport'));
  const august = labelRows.find((l) => l.name.startsWith('August'));
  const desiredCL = [dealer, carport, august].filter(Boolean).map((l) => ({ card_id: cardId, label_id: l.id }));
  for (const row of desiredCL) {
    const { data: exists, error } = await sb
      .from('card_labels')
      .select('card_id, label_id')
      .eq('card_id', row.card_id)
      .eq('label_id', row.label_id)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!exists) {
      const { error: ins } = await sb.from('card_labels').insert(row);
      if (ins) throw ins;
    }
  }

  // 7b) Location meta is part of app model; not stored directly in schema here. Use description meta later if needed.

  // 7c) Custom field values
  function fieldId(name) {
    const f = fieldDefs.find((x) => x.name === name);
    return f && f.id;
  }
  const fieldValues = [
    { field_id: fieldId('Phone 1'), value: JSON.stringify({ value: '+1 (775) 555-0101' }) },
    { field_id: fieldId('Phone 2'), value: JSON.stringify({ value: '+1 (775) 555-0102' }) },
    { field_id: fieldId('Email 1'), value: JSON.stringify({ value: 'lorna@example.com' }) },
    { field_id: fieldId('Email 2'), value: JSON.stringify({ value: 'orders@carport-connections.com' }) },
    { field_id: fieldId('Functionality'), value: JSON.stringify({ value: true }) },
  ].filter((x) => x.field_id);
  for (const v of fieldValues) {
    const { data: exists, error } = await sb
      .from('card_field_values')
      .select('card_id, field_id')
      .eq('card_id', cardId)
      .eq('field_id', v.field_id)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!exists) {
      const { error: ins } = await sb.from('card_field_values').insert({ ...v, card_id: cardId });
      if (ins) throw ins;
    }
  }

  // 7d) Attachments (placeholder URLs)
  const attachments = [
    { name: 'Plans.pdf', url: 'https://example.com/plans.pdf' },
    { name: 'Specs.pdf', url: 'https://example.com/specs.pdf' },
    { name: 'Permit.pdf', url: 'https://example.com/permit.pdf' },
    { name: 'Invoice.pdf', url: 'https://example.com/invoice.pdf' },
  ];
  for (const a of attachments) {
    const { data: exists, error } = await sb
      .from('attachments')
      .select('id')
      .eq('card_id', cardId)
      .eq('name', a.name)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!exists) {
      const { error: ins } = await sb
        .from('attachments')
        .insert({
          card_id: cardId,
          name: a.name,
          url: a.url,
          mime: 'application/pdf',
          size: 1024 * 100,
          added_by: gladisId,
        });
      if (ins) throw ins;
    }
  }

  // 7e) Checklist
  let { data: chk, error: chSelErr } = await sb
    .from('checklists')
    .select('id')
    .eq('card_id', cardId)
    .eq('title', 'Plans')
    .maybeSingle();
  if (chSelErr && chSelErr.code !== 'PGRST116') throw chSelErr;
  if (!chk) {
    const { data: chkIns, error: chErr } = await sb
      .from('checklists')
      .insert({ card_id: cardId, title: 'Plans', position: 1 })
      .select('id')
      .single();
    if (chErr) throw chErr;
    chk = chkIns;
  }
  const chkItems = [
    'Site drawing',
    'Bill of materials',
    'Load calculation',
    'Anchoring details',
  ];
  for (const [idx, text] of chkItems.entries()) {
    const { data: exists, error } = await sb
      .from('checklist_items')
      .select('id')
      .eq('checklist_id', chk.id)
      .eq('text', text)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!exists) {
      const { error: ins } = await sb
        .from('checklist_items')
        .insert({ checklist_id: chk.id, text, position: idx + 1 });
      if (ins) throw ins;
    }
  }

  // 7f) Comments by Gladis
  const comments = [
    { body: 'Initial review complete.' , created_at: '2025-09-15T10:30:00Z' },
    { body: 'Sent to manufacturing for scheduling.' , created_at: '2025-09-16T15:45:00Z' },
    { body: 'Awaiting permit confirmation.' , created_at: '2025-09-17T09:20:00Z' },
  ];
  for (const c of comments) {
    const { data: exists, error } = await sb
      .from('comments')
      .select('id')
      .eq('card_id', cardId)
      .eq('body', c.body)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!exists) {
      const { error: ins } = await sb
        .from('comments')
        .insert({ card_id: cardId, author_id: gladisId, body: c.body, created_at: c.created_at });
      if (ins) throw ins;
    }
  }

  // Fetch all boards for summary output
  const { data: boardRows, error: boardErr } = await sb
    .from('boards')
    .select('id, name');
  if (boardErr) throw boardErr;
  console.log('Seed complete:', {
    workspaceId,
    boards: (boardRows ?? []).map((b) => b.name),
    engineeringLists: (listRowsEng ?? []).map((l) => l.name),
    cardId,
  });
})().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
