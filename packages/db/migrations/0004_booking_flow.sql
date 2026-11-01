-- 0004_booking_flow.sql — verifica del contatto (OTP email) e indici del flusso di prenotazione pubblico
-- (docs/07 §3, docs/12 §5). Nessun codice in chiaro: solo HMAC del codice e SHA-256 del token di verifica.

CREATE TABLE contact_verifications (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id   uuid NOT NULL REFERENCES organizations(id),
  channel           text NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  destination       citext NOT NULL CHECK (length(destination) BETWEEN 3 AND 254),
  code_hash         bytea NOT NULL,                       -- HMAC-SHA-256(segreto, id || codice)
  attempts          smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at        timestamptz NOT NULL,
  superseded_at     timestamptz,                          -- un nuovo codice per lo stesso indirizzo annulla i precedenti
  verified_at       timestamptz,
  token_hash        bytea UNIQUE,                         -- SHA-256 del token monouso restituito dopo il codice giusto
  token_expires_at  timestamptz,
  consumed_at       timestamptz,                          -- token usato da una conferma
  ip_hash           bytea,                                -- HMAC dell'IP (docs/12 §4: mai l'IP in chiaro)
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK ((token_hash IS NULL) = (token_expires_at IS NULL)),
  CHECK (verified_at IS NOT NULL OR token_hash IS NULL)
);
CREATE INDEX contact_verifications_dest_idx
  ON contact_verifications (organization_id, destination, created_at DESC);

ALTER TABLE contact_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON contact_verifications
  USING (organization_id = app_org()) WITH CHECK (organization_id = app_org());

-- Max 1 hold attivo per sessione (docs/06 E10): il nuovo hold sostituisce il precedente cercandolo per sessione.
CREATE INDEX bookings_hold_session_idx ON bookings (hold_session_hash) WHERE status = 'held';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON contact_verifications TO app_api;
  END IF;
END $$;
