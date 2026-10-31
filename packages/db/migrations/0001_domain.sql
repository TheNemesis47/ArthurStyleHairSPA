-- 0001_domain.sql — schema di dominio (fonte: docs/05-modello-dati.md §3, §4, §4-bis).
-- Richiede PostgreSQL 18 (uuidv7()). Le tabelle di Better Auth arrivano in F1.5; qui users è un bootstrap (0000).
-- Le migrazioni sono immutabili DOPO il primo deploy: da allora, per cambiare qualcosa si aggiunge un nuovo file.

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- ricerca clienti per nome (indice trigram)

-- NB: le tabelle di Better Auth (users, sessions, …) devono usare id uuid: configurare la generazione degli ID
--     di Better Auth (opzione advanced/database generateId) PRIMA della prima migrazione. Di default usa id testuali.

-- ──────────────────────── Organizzazioni (tenant) ────────────────────────
-- Un'organizzazione = un brand/cliente (oggi solo "Arthur Style"). Vedi ADR-0009.
CREATE TABLE organizations (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  slug            text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,40}$'),   -- 'arthur-style'
  name            text NOT NULL,
  brand           jsonb NOT NULL DEFAULT '{}',          -- riferimenti a logo/palette (per un futuro multi-brand)
  max_locations   integer NOT NULL DEFAULT 10 CHECK (max_locations BETWEEN 1 AND 100),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────── Sedi ───────────────────────────────
CREATE TABLE locations (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  slug            text NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,40}$'),          -- 'firenze', 'malta'
  name            text NOT NULL,
  country_code    char(2) NOT NULL CHECK (country_code IN ('IT','MT')),
  timezone        text NOT NULL,                       -- 'Europe/Rome' | 'Europe/Malta'
  currency        char(3) NOT NULL DEFAULT 'EUR',
  vat_rate_bp     integer NOT NULL CHECK (vat_rate_bp BETWEEN 0 AND 10000),   -- IT 2200, MT 1800 ⚠️ verificare
  default_locale  text NOT NULL DEFAULT 'it' CHECK (default_locale IN ('it','en')),
  address         jsonb NOT NULL,                      -- {street:"Via Sant'Egidio …" (Q44), postcode, city:"Firenze", ...}
  geo             point,
  phone_e164      text CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  whatsapp_e164   text CHECK (whatsapp_e164 IS NULL OR whatsapp_e164 ~ '^\+[1-9][0-9]{6,14}$'),   -- pulsante "Scrivici su WhatsApp"
  email           citext,
  legal_info      jsonb NOT NULL DEFAULT '{}',         -- ragione sociale, P.IVA, REA / VAT MT
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','closing','closed')),
  opens_on        date,                                -- per la futura sede di Malta
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),
  UNIQUE (id, organization_id)                         -- per le FK composte (una prenotazione non cambia organizzazione)
);
-- Il limite max_locations si verifica con un trigger BEFORE INSERT (conteggio delle sedi non 'closed').

-- Regole di prenotazione: una riga per sede, versionata
CREATE TABLE booking_policies (
  location_id               uuid PRIMARY KEY REFERENCES locations(id),
  slot_granularity_min      integer NOT NULL DEFAULT 15 CHECK (slot_granularity_min IN (5,10,15,20,30,60)),
  min_notice_min            integer NOT NULL DEFAULT 180,    -- 3 h (Q14)
  max_advance_days          integer NOT NULL DEFAULT 35 CHECK (max_advance_days BETWEEN 1 AND 365),   -- Q15/Q46
  hold_ttl_sec              integer NOT NULL DEFAULT 600 CHECK (hold_ttl_sec BETWEEN 60 AND 1800),
  cancel_window_min         integer NOT NULL DEFAULT 5760,   -- disdetta libera fino a 4 giorni prima (Q16)
  reschedule_window_min     integer NOT NULL DEFAULT 5760,
  max_future_bookings       integer NOT NULL DEFAULT 3,      -- per cliente (anti-abuso)
  require_contact_otp       text NOT NULL DEFAULT 'always' CHECK (require_contact_otp IN ('never','new_customers','always')),  -- OTP email (Q17)
  reminder_offsets_min      integer[] NOT NULL DEFAULT '{1440,120}',
  version                   integer NOT NULL DEFAULT 1,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────────── Risorse ─────────────────────────────
-- Operatori, postazioni e attrezzature sono tutte "risorse": un solo vincolo di esclusione vale per tutte.
CREATE TYPE resource_kind AS ENUM ('staff','station','equipment');

CREATE TABLE resources (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  location_id  uuid NOT NULL REFERENCES locations(id),
  kind         resource_kind NOT NULL,
  name         text NOT NULL,                          -- 'Arturo', 'Poltrona 1', 'Lavatesta 2'
  user_id      uuid UNIQUE REFERENCES users(id),       -- solo per kind='staff' (tabella users gestita da Better Auth)
  bookable_online boolean NOT NULL DEFAULT true,
  color        text CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order   integer NOT NULL DEFAULT 0,
  archived_at  timestamptz,
  CHECK (kind = 'staff' OR user_id IS NULL),
  UNIQUE (id, location_id)                             -- per le FK composte: una risorsa non "migra" di sede
);

-- Pool di risorse equivalenti ("una qualsiasi delle 2 lavatesta", "una poltrona colore")
CREATE TABLE resource_pools (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  location_id  uuid NOT NULL REFERENCES locations(id),
  name         text NOT NULL,
  UNIQUE (location_id, name)
);
CREATE TABLE resource_pool_members (
  pool_id      uuid NOT NULL REFERENCES resource_pools(id) ON DELETE CASCADE,
  resource_id  uuid NOT NULL REFERENCES resources(id),
  PRIMARY KEY (pool_id, resource_id)
);

-- ─────────────────────────── Catalogo servizi ───────────────────────────
CREATE TABLE service_categories (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  location_id  uuid NOT NULL REFERENCES locations(id),
  name         jsonb NOT NULL CHECK (name ? 'it'),
  sort_order   integer NOT NULL DEFAULT 0
);

CREATE TABLE services (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  location_id        uuid NOT NULL REFERENCES locations(id),
  category_id        uuid REFERENCES service_categories(id),
  slug               text NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,60}$'),
  name               jsonb NOT NULL CHECK (name ? 'it'),
  description        jsonb NOT NULL DEFAULT '{}',
  price_cents        integer NOT NULL CHECK (price_cents >= 0),      -- IVA inclusa
  price_is_from      boolean NOT NULL DEFAULT false,                 -- "a partire da"
  buffer_before_min  integer NOT NULL DEFAULT 0 CHECK (buffer_before_min BETWEEN 0 AND 120),
  buffer_after_min   integer NOT NULL DEFAULT 0 CHECK (buffer_after_min BETWEEN 0 AND 120),
  online_bookable    boolean NOT NULL DEFAULT true,
  deposit_cents      integer CHECK (deposit_cents IS NULL OR deposit_cents > 0),   -- fase futura
  sort_order         integer NOT NULL DEFAULT 0,
  version            integer NOT NULL DEFAULT 1,                     -- optimistic locking dal pannello
  archived_at        timestamptz,
  UNIQUE (location_id, slug)
);

-- Un servizio è una sequenza di fasi. staff_busy=false = TEMPO DI POSA (l'operatore è libero).
CREATE TABLE service_steps (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),
  service_id    uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  position      smallint NOT NULL CHECK (position >= 0),
  duration_min  integer NOT NULL CHECK (duration_min > 0 AND duration_min <= 480 AND duration_min % 5 = 0),
  staff_busy    boolean NOT NULL DEFAULT true,
  label         jsonb NOT NULL DEFAULT '{}',          -- {"it":"Applicazione colore"} / {"it":"Posa"}
  UNIQUE (service_id, position)
);

-- Risorse non-staff richieste da una fase (es. la fase "lavaggio" richiede 1 risorsa dal pool "Lavatesta")
CREATE TABLE service_step_requirements (
  step_id   uuid NOT NULL REFERENCES service_steps(id) ON DELETE CASCADE,
  pool_id   uuid NOT NULL REFERENCES resource_pools(id),
  quantity  smallint NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 5),
  PRIMARY KEY (step_id, pool_id)
);

-- Quali operatori possono eseguire quali servizi (con eventuale durata o prezzo personalizzati)
CREATE TABLE staff_services (
  resource_id          uuid NOT NULL REFERENCES resources(id),
  service_id           uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  duration_factor_pct  integer NOT NULL DEFAULT 100 CHECK (duration_factor_pct BETWEEN 50 AND 200),
  price_override_cents integer CHECK (price_override_cents >= 0),
  PRIMARY KEY (resource_id, service_id)
);

-- ─────────────────────────── Orari e disponibilità ───────────────────────────
-- Fasce settimanali in ORA LOCALE della sede (più righe per giorno = pausa pranzo)
CREATE TABLE working_hours (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  resource_id  uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  weekday      smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),   -- ISO: 1 = lunedì
  start_local  time NOT NULL,
  end_local    time NOT NULL CHECK (end_local > start_local),
  valid_from   date NOT NULL DEFAULT CURRENT_DATE,
  valid_to     date,                                                -- per orari estivi, cambi di turno
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- Orari di apertura del salone (limite superiore per tutti gli operatori)
CREATE TABLE location_hours (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  location_id  uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  weekday      smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_local  time NOT NULL,
  end_local    time NOT NULL CHECK (end_local > start_local),
  last_start_local time,                                           -- ultimo orario di inizio accettato
  valid_from   date NOT NULL DEFAULT CURRENT_DATE,                 -- orari estivi/invernali
  valid_to     date
);

-- Eccezioni sul calendario: chiusure, ferie, festività, aperture straordinarie
CREATE TABLE schedule_exceptions (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  location_id  uuid NOT NULL REFERENCES locations(id),
  resource_id  uuid REFERENCES resources(id),                       -- NULL = tutto il salone
  kind         text NOT NULL CHECK (kind IN ('closed','time_off','extra_open')),
  during       tstzrange NOT NULL CHECK (NOT isempty(during)),
  reason       text,
  created_by   uuid REFERENCES users(id)
);
CREATE INDEX ON schedule_exceptions USING gist (location_id, during);

-- ───────────────────────────── Clienti ─────────────────────────────
-- I clienti appartengono all'ORGANIZZAZIONE (chi prenota a Firenze ritrova il suo profilo a Malta).
-- Online si prenota solo per sé (Q39): un solo profilo per email VERIFICATA. I clienti inseriti dallo staff
-- (walk-in, telefono) possono non avere contatti verificati: per loro niente unicità, si deduplica con "unisci".
CREATE TABLE customers (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id       uuid NOT NULL REFERENCES organizations(id),
  user_id               uuid REFERENCES users(id),          -- se ha un account (app)
  first_name            text NOT NULL CHECK (length(first_name) BETWEEN 1 AND 80),
  last_name             text NOT NULL CHECK (length(last_name) BETWEEN 1 AND 80),
  email                 citext CHECK (email IS NULL OR length(email) <= 254),
  phone_e164            text CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  email_verified_at     timestamptz,
  phone_verified_at     timestamptz,
  preferred_locale      text NOT NULL DEFAULT 'it',
  staff_notes           text CHECK (length(staff_notes) <= 2000),   -- ⚠️ NIENTE dati sanitari (vedi 14)
  marketing_consent_at  timestamptz,                                -- NULL = nessun consenso
  marketing_consent_src text,
  no_show_count         integer NOT NULL DEFAULT 0,
  blocked_at            timestamptz,                                -- non può prenotare online
  last_seen_at          timestamptz,
  anonymized_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id)
  -- Regola di DOMINIO (non CHECK): le prenotazioni online richiedono un'email verificata;
  -- i clienti inseriti dallo staff (walk-in, telefono) possono avere solo il nome.
);
CREATE UNIQUE INDEX customers_verified_email_uq ON customers (organization_id, email)
  WHERE email_verified_at IS NOT NULL AND anonymized_at IS NULL;
CREATE INDEX customers_email_idx ON customers (email) WHERE anonymized_at IS NULL;
CREATE INDEX customers_phone_idx ON customers (phone_e164) WHERE anonymized_at IS NULL;
CREATE INDEX customers_name_trgm ON customers USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- ───────────────────────────── Prenotazioni ─────────────────────────────
CREATE TYPE booking_status AS ENUM ('held','confirmed','completed','cancelled','no_show','expired');
CREATE TYPE booking_source AS ENUM ('web','app','admin','phone','walk_in','mcp','import');

CREATE TABLE bookings (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id    uuid NOT NULL,
  location_id        uuid NOT NULL,
  customer_id        uuid,                                    -- NULL per gli hold (e per hold scaduti/abbandonati)
  status             booking_status NOT NULL,
  source             booking_source NOT NULL,
  period             tstzrange NOT NULL CHECK (NOT isempty(period) AND lower_inc(period) AND NOT upper_inc(period)),
  hold_expires_at    timestamptz,
  hold_session_hash  bytea,                                   -- lega l'hold al browser/dispositivo che l'ha creato
  total_price_cents  integer NOT NULL CHECK (total_price_cents >= 0),
  currency           char(3) NOT NULL,
  customer_note      text CHECK (length(customer_note) <= 500),
  manage_token_hash  bytea UNIQUE,                            -- SHA-256 del token del link di gestione
  idempotency_key    text,
  cancelled_at       timestamptz,
  cancelled_by       text CHECK (cancelled_by IN ('customer','staff','system','agent')),
  cancel_reason      text,
  overbooking_ack    boolean NOT NULL DEFAULT false,          -- sovrapposizione forzata dall'owner (ADMIN-15)
  version            integer NOT NULL DEFAULT 1,
  created_by_actor   jsonb NOT NULL,                          -- {type:'user'|'customer'|'agent'|'system', id, client_id?}
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'held' OR hold_expires_at IS NOT NULL),
  -- un hold non ha ancora cliente; se scade o viene abbandonato resta senza (stati 'expired' / 'cancelled')
  CHECK (status IN ('held','expired','cancelled') OR customer_id IS NOT NULL),
  UNIQUE (location_id, idempotency_key),
  FOREIGN KEY (location_id, organization_id) REFERENCES locations (id, organization_id),
  FOREIGN KEY (customer_id, organization_id) REFERENCES customers (id, organization_id)   -- cliente della stessa organizzazione
);
CREATE INDEX bookings_period_idx ON bookings USING gist (location_id, period);

-- Lo stesso cliente non può avere due appuntamenti attivi sovrapposti (anche in sedi diverse)
ALTER TABLE bookings ADD CONSTRAINT bookings_customer_no_overlap
  EXCLUDE USING gist (customer_id WITH =, period WITH &&)
  WHERE (status IN ('held','confirmed') AND customer_id IS NOT NULL);

-- Righe della prenotazione, con FOTOGRAFIA del servizio al momento della prenotazione
CREATE TABLE booking_items (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  booking_id         uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  position           smallint NOT NULL,
  service_id         uuid NOT NULL REFERENCES services(id),
  staff_resource_id  uuid NOT NULL REFERENCES resources(id),
  service_snapshot   jsonb NOT NULL,     -- nome, prezzo, fasi e durate congelati: se Arturo cambia il prezzo, lo storico non cambia
  price_cents        integer NOT NULL CHECK (price_cents >= 0),
  UNIQUE (booking_id, position)
);

-- ★ IL CUORE DELLA MUTUA ESCLUSIONE ★
CREATE TYPE allocation_kind AS ENUM ('service','processing','buffer','block');

CREATE TABLE allocations (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  location_id      uuid NOT NULL REFERENCES locations(id),
  resource_id      uuid NOT NULL,
  booking_id       uuid REFERENCES bookings(id) ON DELETE CASCADE,     -- NULL per i blocchi manuali
  booking_item_id  uuid REFERENCES booking_items(id) ON DELETE CASCADE,
  kind             allocation_kind NOT NULL,
  during           tstzrange NOT NULL CHECK (NOT isempty(during) AND lower_inc(during) AND NOT upper_inc(during)),
  active           boolean NOT NULL DEFAULT true,
  forced           boolean NOT NULL DEFAULT false,   -- sovrapposizione consapevole: esclusa dal vincolo
  note             text,
  created_by       uuid REFERENCES users(id),
  CHECK ((kind = 'block') = (booking_id IS NULL)),
  FOREIGN KEY (resource_id, location_id) REFERENCES resources (id, location_id),   -- risorsa della stessa sede
  CONSTRAINT allocations_no_overlap
    EXCLUDE USING gist (resource_id WITH =, during WITH &&)
    WHERE (active AND NOT forced)
);
CREATE INDEX allocations_booking_idx ON allocations (booking_id);
CREATE INDEX allocations_lookup_idx  ON allocations USING gist (location_id, during) WHERE active;

CREATE FUNCTION sync_allocations_active() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE allocations
       SET active = NEW.status IN ('held','confirmed','completed','no_show')
     WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_status_sync AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_allocations_active();

-- Con un pool di connessioni, dopo il primo SET LOCAL la variabile resta definita ma VUOTA nelle transazioni successive:
-- per questo il controllo è esplicito (verificato nei test di integrazione, docs/research).
CREATE FUNCTION app_org() RETURNS uuid LANGUAGE plpgsql STABLE AS $$
DECLARE v text := current_setting('app.org_id', true);
BEGIN
  IF v IS NULL OR v = '' THEN
    RAISE EXCEPTION 'app.org_id non impostato: ogni transazione deve dichiarare l''organizzazione'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN v::uuid;
END $$;

ALTER TABLE locations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON locations  USING (organization_id = app_org()) WITH CHECK (organization_id = app_org());
CREATE POLICY org_isolation ON customers  USING (organization_id = app_org()) WITH CHECK (organization_id = app_org());
CREATE POLICY org_isolation ON bookings   USING (organization_id = app_org()) WITH CHECK (organization_id = app_org());
-- tabelle legate alla sede: visibili solo se la sede è dell'organizzazione corrente
CREATE POLICY org_isolation ON allocations
  USING (location_id IN (SELECT id FROM locations))           -- locations è a sua volta filtrata dalla RLS
  WITH CHECK (location_id IN (SELECT id FROM locations));
