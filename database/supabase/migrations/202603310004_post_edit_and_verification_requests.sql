-- Student Society: commit enum expansion before verification-proof constraints use it

DO $$
BEGIN
  ALTER TYPE public.media_usage ADD VALUE IF NOT EXISTS 'verification_proof';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
