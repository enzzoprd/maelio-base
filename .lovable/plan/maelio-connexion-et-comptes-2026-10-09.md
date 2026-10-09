# Maelio — Connexion et comptes

## Objectif
Donner à chaque étudiant un vrai compte personnel, sécurisé, en français, conforme à la section 6 du prompt maître.

## Ce qui sera construit
1. **Backend** : activation de Lovable Cloud (gratuit pour démarrer, aucun abonnement souscrit). Si tu préfères ton propre projet Supabase dédié, connecte-le avant l'approbation via Cloud → « Connect it here ».
2. **Page `/connexion`** : onglets Connexion / Inscription (prénom, e-mail, mot de passe) + bouton « Continuer avec Google ». Messages d'erreur clairs en français.
3. **Vérification e-mail** : après inscription, écran « Vérifie ta boîte mail » (pas de connexion tant que l'adresse n'est pas confirmée).
4. **Mot de passe oublié** + page publique `/reinitialiser-mot-de-passe`.
5. **Espace protégé** : toutes les rubriques actuelles (Accueil, Matières, Notes, etc.) deviennent accessibles uniquement connecté ; une page d'accueil publique courte présente Maelio avec « Se connecter » / « Créer un compte ».
6. **Profil réel** : le prénom de l'accueil et l'avatar (initiale) viennent du profil ; jamais de prénom en dur. Menu avatar : Profil, Paramètres, Se déconnecter.
7. **Paramètres → Compte** : modifier prénom, changer mot de passe (avec mot de passe actuel), supprimer le compte (confirmation explicite, suppression définitive des données).
8. **Session persistante** et déconnexion propre (rien de privé ne reste affiché).
9. Protection contre les mots de passe compromis activée.

Hors périmètre : onboarding, photo d'avatar téléversée, matières/notes réelles (étapes suivantes).

## Détails techniques
- Table `profiles` (id, user_id → auth.users ON DELETE CASCADE, first_name, avatar_url, created_at, updated_at), RLS : chaque utilisateur lit/modifie uniquement son profil ; trigger de création à l'inscription (prénom depuis les métadonnées), trigger `updated_at`.
- Routes protégées sous `_authenticated/` (layout géré, `ssr: false`) ; redirection vers `/connexion` avec retour à la page demandée.
- Google via le broker Lovable ; email/mot de passe activé ; HIBP activé.
- Suppression de compte : server function authentifiée qui vérifie l'appelant puis supprime l'utilisateur côté admin.
- Un seul écouteur `onAuthStateChange` dans la racine ; déconnexion : annulation + vidage du cache, `replace`.
- Tests : règles d'accès au profil (prénom issu du profil, aucun prénom par défaut).
- Mise à jour d'AGENTS.md, mémoire et roadmap.
