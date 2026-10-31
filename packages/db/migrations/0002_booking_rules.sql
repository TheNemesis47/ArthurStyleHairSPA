-- 0002_booking_rules.sql — macchina a stati delle prenotazioni e scadenza degli hold (docs/05 §4, docs/06 §4).

-- Transizioni ammesse (doppia barriera: dominio + database)
CREATE FUNCTION check_booking_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF (OLD.status::text, NEW.status::text) IN (
    ('held', 'confirmed'), ('held', 'expired'), ('held', 'cancelled'),
    ('confirmed', 'cancelled'), ('confirmed', 'completed'), ('confirmed', 'no_show'),
    ('no_show', 'completed')
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Transizione di stato non ammessa: % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER bookings_status_transition BEFORE UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_transition();

-- Scadenza degli hold: la chiama il worker ogni minuto, per organizzazione (RLS). Il trigger libera le risorse.
CREATE FUNCTION expire_holds(p_now timestamptz) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  UPDATE bookings SET status = 'expired' WHERE status = 'held' AND hold_expires_at < p_now;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
