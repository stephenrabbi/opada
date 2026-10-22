-- Development only. Review and apply to an isolated database branch first.
-- Avoid ambiguous identity-to-staff mappings across restaurants.
-- NULL identities are permitted for not-yet-linked staff accounts.
-- Duplicate existing values will cause index creation to fail closed.
CREATE UNIQUE INDEX IF NOT EXISTS staff_auth_subject_unique
ON public.staff (auth_subject) WHERE auth_subject IS NOT NULL;
