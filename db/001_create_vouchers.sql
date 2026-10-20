CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY,
  voucher_number text NOT NULL UNIQUE,
  guest_name text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vouchers_updated_at_idx ON vouchers (updated_at DESC);
