import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StudentProfile } from '@/lib/maelio';

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<StudentProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, avatar_url, onboarded_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return { firstName: data?.first_name ?? null, avatarUrl: data?.avatar_url ?? null, onboardedAt: data?.onboarded_at ?? null };
    },
  });

/** Accepts only same-origin relative paths to avoid open redirects. */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/accueil';
  return value;
}

export function frenchAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Confirme d’abord ton adresse e-mail grâce au lien reçu.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Un compte existe déjà avec cette adresse.';
  if (m.includes('pwned') || m.includes('compromised') || m.includes('weak')) return 'Ce mot de passe est trop faible ou a déjà fuité ailleurs. Choisis-en un autre.';
  if (m.includes('at least')) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patiente quelques minutes puis réessaie.';
  if (m.includes('current password') || m.includes('reauthentication')) return 'Le mot de passe actuel est incorrect.';
  if (m.includes('same') && m.includes('password')) return 'Le nouveau mot de passe doit être différent de l’ancien.';
  return 'Une erreur est survenue. Vérifie ta connexion puis réessaie.';
}
