ALTER TABLE products
  ADD COLUMN reserved_stock integer NOT NULL DEFAULT 0
  CHECK (reserved_stock >= 0 AND reserved_stock <= stock);

CREATE TABLE payment_attempts (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  provider text NOT NULL,
  phone_number text NOT NULL,
  amount_cdf bigint NOT NULL CHECK (amount_cdf >= 0),
  status text NOT NULL CHECK (status IN ('INITIATING', 'PENDING', 'UNKNOWN', 'FAILED', 'COMPLETED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payment_attempts_active_order_idx ON payment_attempts(order_id)
  WHERE status IN ('INITIATING', 'PENDING', 'UNKNOWN', 'COMPLETED');
