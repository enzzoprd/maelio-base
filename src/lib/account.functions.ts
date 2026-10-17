import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const USER_BUCKETS = ['documents', 'avatars'] as const;

export const deleteMyAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const userId = context.userId;

    // Liste récursivement tous les objets d'un dossier de stockage.
    const collect = async (bucket: string, folder: string): Promise<string[]> => {
      const found: string[] = [];
      let offset = 0;
      for (;;) {
        const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder, { limit: 100, offset });
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const item of data) {
          const fullPath = `${folder}/${item.name}`;
          if (item.id === null) found.push(...(await collect(bucket, fullPath)));
          else found.push(fullPath);
        }
        if (data.length < 100) break;
        offset += 100;
      }
      return found;
    };

    // 1. Supprimer d'abord les fichiers et les devoirs : si cela échoue, le compte est conservé.
    try {
      for (const bucket of USER_BUCKETS) {
        const paths = await collect(bucket, userId);
        for (let i = 0; i < paths.length; i += 100) {
          const { error } = await supabaseAdmin.storage.from(bucket).remove(paths.slice(i, i + 100));
          if (error) throw error;
        }
      }
      const { error: homeworkError } = await supabaseAdmin.from('homework').delete().eq('user_id', userId);
      if (homeworkError) throw homeworkError;
    } catch (error) {
      console.error('[deleteMyAccount] nettoyage des données impossible', error instanceof Error ? error.message : 'erreur inconnue');
      throw new Error('Suppression impossible pour le moment : tes données n’ont pas pu être effacées. Réessaie.');
    }

    // 2. Supprimer ensuite le compte (les matières, notes, profil et fichiers liés suivent en cascade).
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error('Suppression impossible pour le moment.');
    return { ok: true };
  });
