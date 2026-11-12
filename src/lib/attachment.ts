export type Attachment = { name: string; mimeType: 'image/jpeg' | 'application/pdf'; data: string };

/** Limite d'un PDF : la requête passe par une fonction Netlify (quelques Mo au maximum). */
export const MAX_PDF_BYTES = 3 * 1024 * 1024;

/** Réduit la photo (1600 px max) et l'encode en JPEG : envoi plus rapide, moins de données transmises. */
async function imageToJpegBase64(file: File, maxSide = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas indisponible');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82).split(',')[1] ?? '';
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

/** Prépare un fichier choisi par l'utilisateur pour l'envoi à l'assistant. Lève une erreur lisible en français. */
export async function prepareAttachment(file: File): Promise<Attachment> {
  const name = file.name.slice(0, 120) || 'fichier';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    if (file.size > MAX_PDF_BYTES) throw new Error('Ce PDF dépasse 3 Mo. Choisis un fichier plus léger ou n’envoie qu’une partie du cours.');
    const data = await fileToBase64(file);
    if (!data) throw new Error('Impossible de lire ce PDF. Essaie un autre fichier.');
    return { name, mimeType: 'application/pdf', data };
  }
  if (file.type.startsWith('image/')) {
    let data = '';
    try { data = await imageToJpegBase64(file); } catch { data = ''; }
    if (!data) throw new Error('Impossible de lire cette image. Essaie un autre fichier.');
    return { name, mimeType: 'image/jpeg', data };
  }
  throw new Error('Format non pris en charge. Joins une image ou un PDF.');
}
