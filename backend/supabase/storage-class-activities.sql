-- =============================================================================
-- Supabase Storage — bucket « class-activities » (photos d’activités)
-- =============================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query → Run
--
-- Ce script :
--   1) Crée le bucket en LECTURE PUBLIQUE (URLs utilisées par l’app parent)
--   2) Autorise tout le monde à LIRE les objets (images affichées dans le navigateur)
--
-- L’API Nest utilise SUPABASE_SERVICE_ROLE_KEY : elle ignore RLS et peut
-- uploader / supprimer sans politique INSERT/DELETE supplémentaire.
--
-- Après exécution : copier SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY depuis
-- Project Settings → API, et les mettre dans le .env de l’API (voir env.example).
-- =============================================================================

-- Bucket public, 5 Mo max, types image courants
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'class-activities',
  'class-activities',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique des fichiers (affichage côté parents / navigateur)
DROP POLICY IF EXISTS "Public read class-activities" ON storage.objects;
CREATE POLICY "Public read class-activities"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'class-activities');

-- (Optionnel) Si un jour tu uploads depuis le client avec JWT utilisateur,
-- tu ajouteras des politiques INSERT/DELETE pour le rôle authenticated.
-- Ici, seul le backend (service role) écrit — pas nécessaire.
