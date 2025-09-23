import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';

const BUCKET = 'attachments';

function extractStoragePath(publicUrl: string): string | null {
	// Expect: https://<proj>.supabase.co/storage/v1/object/public/attachments/<path>
	const idx = publicUrl.indexOf('/attachments/');
	if (idx === -1) return null;
	return publicUrl.substring(idx + '/attachments/'.length);
}

export async function uploadAttachment(workspaceId: ID, cardId: ID, file: File): Promise<{ id: ID; url: string }> {
	const sb = getSupabase();
	const ts = Date.now();
	const safe = file.name.replace(/[^a-zA-Z0-9_.-]/g, '-');
	const path = `${workspaceId}/${cardId}/${ts}-${safe}`;

	const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, {
		cacheControl: '3600',
		upsert: true,
	});
	if (upErr) throw upErr;

	const pub = sb.storage.from(BUCKET).getPublicUrl(path);
	const url = pub.data.publicUrl;

	const { data, error } = await sb
		.from('attachments')
		.insert({ card_id: cardId, name: file.name, url, mime: file.type || 'application/octet-stream', size: file.size })
		.select('id, url')
		.single();
	if (error) throw error;
	return { id: data.id as ID, url: data.url as string };
}

export async function removeAttachmentObject(publicUrl: string): Promise<void> {
	const sb = getSupabase();
	const path = extractStoragePath(publicUrl);
	if (!path) return;
	try {
		await sb.storage.from(BUCKET).remove([path]);
	} catch {
		// ignore failures (e.g., already deleted)
	}
}

export async function renameAttachment(id: ID, name: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('attachments').update({ name }).eq('id', id);
  if (error) throw error;
}

export default { uploadAttachment, removeAttachmentObject, renameAttachment };