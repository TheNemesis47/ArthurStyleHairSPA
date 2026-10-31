CREATE EXTENSION IF NOT EXISTS citext;
-- 0000_users_bootstrap.sql — tabella utenti minima, referenziata dallo schema di dominio.
-- In F1.5 la allineiamo allo schema generato da Better Auth (configurato con id uuid, vedi docs/05 §3).
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  name            text NOT NULL,
  email           citext,
  email_verified  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
