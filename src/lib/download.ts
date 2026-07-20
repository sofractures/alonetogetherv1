/**
 * Supabase signed URLs serve files inline by default, and the HTML `download`
 * attribute is ignored on cross-origin links. Appending Supabase's `download`
 * query param makes storage respond with Content-Disposition: attachment,
 * forcing the browser to save the file instead of opening it.
 */
export function toAttachmentUrl(signedUrl: string, filename: string): string {
  try {
    const url = new URL(signedUrl);
    url.searchParams.set('download', filename);
    return url.toString();
  } catch {
    return signedUrl;
  }
}
