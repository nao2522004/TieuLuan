BEGIN;

CREATE TABLE branches (
  id                  BIGSERIAL PRIMARY KEY,
  name                VARCHAR(150)  NOT NULL,
  address             VARCHAR(255),
  phone               VARCHAR(20),
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  bank_bin            VARCHAR(10),
  bank_account_no     VARCHAR(30),
  bank_account_name   VARCHAR(150),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);


CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  full_name       VARCHAR(150)    NOT NULL,
  email           VARCHAR(255)    NOT NULL UNIQUE,
  password_hash   VARCHAR(255)    NOT NULL,
  role            VARCHAR(20)     NOT NULL DEFAULT 'staff',
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  branch_id       BIGINT          REFERENCES branches(id),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT chk_users_role CHECK (role IN ('admin', 'staff'))
);
CREATE INDEX idx_users_branch ON users(branch_id);

CREATE TABLE categories (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(100)    NOT NULL UNIQUE,
  description     VARCHAR(255),
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE products (
  id              BIGSERIAL PRIMARY KEY,
  category_id     BIGINT          NOT NULL REFERENCES categories(id),
  branch_id       BIGINT          NOT NULL REFERENCES branches(id),
  barcode         VARCHAR(50)     NOT NULL,
  name            VARCHAR(200)    NOT NULL,
  unit            VARCHAR(20)     NOT NULL,
  cost_price      NUMERIC(12,2)   NOT NULL,
  sale_price      NUMERIC(12,2)   NOT NULL,
  stock_quantity  INTEGER         NOT NULL DEFAULT 0,
  reorder_level   INTEGER         NOT NULL DEFAULT 10,
  expiry_date     DATE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT uq_products_branch_barcode UNIQUE (branch_id, barcode),
  CONSTRAINT chk_products_prices CHECK (cost_price >= 0 AND sale_price >= 0),
  CONSTRAINT chk_products_stock  CHECK (stock_quantity >= 0)
);
CREATE INDEX idx_products_barcode  ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_branch   ON products(branch_id);
CREATE INDEX idx_products_expiry ON products(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE TABLE inventory_transactions (
  id              BIGSERIAL PRIMARY KEY,
  product_id      BIGINT          NOT NULL REFERENCES products(id),
  type            VARCHAR(10)     NOT NULL,
  quantity        INTEGER         NOT NULL,
  unit_cost       NUMERIC(12,2),
  note            VARCHAR(255),
  created_by      BIGINT          NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

  CONSTRAINT chk_inventory_tx_type     CHECK (type IN ('IN', 'OUT')),
  CONSTRAINT chk_inventory_tx_quantity CHECK (quantity > 0)
);
CREATE INDEX idx_inventory_tx_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_tx_product_created ON inventory_transactions(product_id, created_at);

CREATE TABLE shifts (
  id            BIGSERIAL PRIMARY KEY,
  branch_id     BIGINT        NOT NULL REFERENCES branches(id),
  user_id       BIGINT        NOT NULL REFERENCES users(id),
  opening_cash  NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_cash  NUMERIC(12,2),
  expected_cash NUMERIC(12,2),
  note          VARCHAR(255),
  opened_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  closed_at     TIMESTAMPTZ,

  CONSTRAINT chk_shifts_closed_after_opened
    CHECK (closed_at IS NULL OR closed_at >= opened_at)
);
CREATE INDEX idx_shifts_user   ON shifts(user_id);
CREATE INDEX idx_shifts_branch ON shifts(branch_id);
CREATE UNIQUE INDEX uq_shifts_open_per_user ON shifts(user_id) WHERE closed_at IS NULL;

CREATE TABLE orders (
  id                    BIGSERIAL PRIMARY KEY,
  created_by            BIGINT          NOT NULL REFERENCES users(id),
  branch_id             BIGINT          NOT NULL REFERENCES branches(id),
  shift_id              BIGINT          REFERENCES shifts(id),
  status                VARCHAR(20)     NOT NULL DEFAULT 'completed',
  payment_method        VARCHAR(20)     NOT NULL DEFAULT 'cash',
  payment_status        VARCHAR(20)     NOT NULL DEFAULT 'paid',
  discount_amount       NUMERIC(12,2)   NOT NULL DEFAULT 0,
  total_amount          NUMERIC(12,2)   NOT NULL,
  zalopay_app_trans_id  VARCHAR(50),
  zalopay_zp_trans_id   VARCHAR(50),
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT chk_orders_status         CHECK (status IN ('completed', 'cancelled')),
  CONSTRAINT chk_orders_payment_method CHECK (payment_method IN ('cash', 'transfer', 'card')),
  CONSTRAINT chk_orders_payment_status CHECK (payment_status IN ('pending', 'paid')),
  CONSTRAINT chk_orders_amounts        CHECK (discount_amount >= 0 AND total_amount >= 0)
);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_branch     ON orders(branch_id);
CREATE INDEX idx_orders_shift      ON orders(shift_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status) WHERE payment_status = 'pending';
CREATE INDEX idx_orders_zalopay_app_trans
  ON orders(zalopay_app_trans_id) WHERE zalopay_app_trans_id IS NOT NULL;

CREATE TABLE order_items (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT          NOT NULL REFERENCES orders(id),
  product_id      BIGINT          NOT NULL REFERENCES products(id),
  product_name    VARCHAR(200),
  quantity        INTEGER         NOT NULL,
  unit_price      NUMERIC(12,2)   NOT NULL,

  CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
  CONSTRAINT chk_order_items_price    CHECK (unit_price >= 0)
);
CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

CREATE TABLE returns (
  id                      BIGSERIAL PRIMARY KEY,
  order_item_id           BIGINT        NOT NULL REFERENCES order_items(id),
  quantity                INTEGER       NOT NULL,
  refund_amount           NUMERIC(12,2) NOT NULL,
  reason                  VARCHAR(255),
  created_by              BIGINT        NOT NULL REFERENCES users(id),
  zalopay_m_refund_id     VARCHAR(50),
  zalopay_refund_id       VARCHAR(50),
  zalopay_refund_status   VARCHAR(20),
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT chk_returns_quantity CHECK (quantity > 0),
  CONSTRAINT chk_returns_refund   CHECK (refund_amount >= 0)
);
CREATE INDEX idx_returns_order_item ON returns(order_item_id);
CREATE INDEX idx_returns_created_by ON returns(created_by);
CREATE INDEX idx_returns_zalopay_m_refund
  ON returns(zalopay_m_refund_id) WHERE zalopay_m_refund_id IS NOT NULL;

CREATE TABLE refresh_tokens (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT          NOT NULL REFERENCES users(id),
  token_hash      VARCHAR(255)    NOT NULL,
  user_agent      VARCHAR(255),
  ip_address      VARCHAR(50),
  expires_at      TIMESTAMPTZ     NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);


ALTER TABLE order_items
  ADD COLUMN original_unit_price NUMERIC(12,2) NULL,
  ADD COLUMN discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN order_items.original_unit_price IS
  'Giá bán gốc (sale_price) tại thời điểm bán, trước khi áp giảm cận hạn/sự kiện. NULL = không có giảm giá (unit_price = giá gốc).';
COMMENT ON COLUMN order_items.discount_percent IS
  '% giảm giá cận hạn/sự kiện đã áp cho dòng hàng này tại thời điểm bán (0 nếu không giảm).';

ALTER TABLE orders
  ADD COLUMN promotion_type VARCHAR(10) NULL,
  ADD COLUMN promotion_value NUMERIC(12,2) NULL;

COMMENT ON COLUMN orders.promotion_type IS
  'Snapshot loại mã KM tại thời điểm bán: percent hoặc fixed. NULL nếu không dùng mã.';
COMMENT ON COLUMN orders.promotion_value IS
  'Snapshot giá trị mã KM tại thời điểm bán (VD: 20 nếu percent, 20000 nếu fixed). NULL nếu không dùng mã.';


DROP INDEX IF EXISTS uq_shifts_open_per_user;
CREATE UNIQUE INDEX uq_shifts_open_per_branch ON shifts(branch_id) WHERE closed_at IS NULL;

CREATE TABLE roles (
  id          BIGSERIAL PRIMARY KEY,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN role_id BIGINT REFERENCES roles(id);

UPDATE users SET role_id = (
  SELECT id FROM roles WHERE code = CASE
    WHEN users.role = 'admin'   THEN 'admin'
    WHEN users.role = 'leader'  THEN 'leader'
    WHEN users.role = 'cashier' THEN 'cashier'
    WHEN users.role = 'staff'   THEN 'cashier'
    ELSE 'cashier'
  END
);

ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

UPDATE users u SET role_id = r.id
FROM roles r WHERE r.code = u.role;

CREATE INDEX idx_users_role ON users(role_id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users DROP COLUMN role;

CREATE TABLE shift_users (
  id         BIGSERIAL PRIMARY KEY,
  shift_id   BIGINT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_shift_users_shift_user UNIQUE (shift_id, user_id)
);
CREATE INDEX idx_shift_users_shift ON shift_users(shift_id);
CREATE INDEX idx_shift_users_user ON shift_users(user_id);

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id),
  role_id BIGINT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

INSERT INTO user_roles (user_id, role_id)
SELECT id, role_id FROM users
WHERE role_id IS NOT NULL;

ALTER TABLE inventory_transactions
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'ORDER',
  ADD COLUMN reason VARCHAR(255);

UPDATE inventory_transactions
SET source = 'INBOUND'
WHERE type = 'IN';

ALTER TABLE inventory_transactions
  ADD CONSTRAINT chk_inventory_tx_source
    CHECK (source IN ('ORDER', 'INBOUND', 'ADJUSTMENT', 'STOCKTAKE'));

CREATE INDEX idx_inventory_tx_source ON inventory_transactions(source);

CREATE TABLE promotions (
  id                  BIGSERIAL PRIMARY KEY,
  code                VARCHAR(50)   NOT NULL UNIQUE,
  name                VARCHAR(150)  NOT NULL,
  type                VARCHAR(10)   NOT NULL,
  value               NUMERIC(12,2) NOT NULL,
  min_order_amount    NUMERIC(12,2),
  max_discount_amount NUMERIC(12,2),
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  starts_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  ends_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  CONSTRAINT chk_promotions_type
    CHECK (type IN ('percent', 'fixed')),
  CONSTRAINT chk_promotions_value
    CHECK (value > 0),
  CONSTRAINT chk_promotions_percent_max
    CHECK (type <> 'percent' OR value <= 100),
  CONSTRAINT chk_promotions_dates
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX idx_promotions_code ON promotions(code)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_promotions_active ON promotions(is_active, starts_at, ends_at)
  WHERE deleted_at IS NULL;

CREATE TABLE stocktakes (
  id              BIGSERIAL       PRIMARY KEY,
  branch_id       BIGINT          NOT NULL REFERENCES branches(id),
  created_by      BIGINT          NOT NULL REFERENCES users(id),
  status          VARCHAR(20)     NOT NULL DEFAULT 'open',
  note            VARCHAR(255),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,

  CONSTRAINT chk_stocktakes_status CHECK (status IN ('open', 'closed')),
  CONSTRAINT chk_stocktakes_closed_after_created
    CHECK (closed_at IS NULL OR closed_at >= created_at)
);
CREATE INDEX idx_stocktakes_branch ON stocktakes(branch_id);
CREATE INDEX idx_stocktakes_created_by ON stocktakes(created_by);
CREATE UNIQUE INDEX uq_stocktakes_open_per_branch
  ON stocktakes(branch_id) WHERE status = 'open';

CREATE TABLE stocktake_items (
  id                  BIGSERIAL   PRIMARY KEY,
  stocktake_id        BIGINT      NOT NULL REFERENCES stocktakes(id),
  product_id          BIGINT      NOT NULL REFERENCES products(id),
  system_quantity     INTEGER     NOT NULL,
  counted_quantity    INTEGER     NOT NULL,
  difference          INTEGER     NOT NULL,

  CONSTRAINT chk_stocktake_items_system_qty  CHECK (system_quantity >= 0),
  CONSTRAINT chk_stocktake_items_counted_qty CHECK (counted_quantity >= 0),
  CONSTRAINT uq_stocktake_items_product UNIQUE (stocktake_id, product_id)
);
CREATE INDEX idx_stocktake_items_stocktake ON stocktake_items(stocktake_id);
CREATE INDEX idx_stocktake_items_product ON stocktake_items(product_id);

DELETE FROM stocktake_items a
USING stocktake_items b
WHERE a.id < b.id
  AND a.stocktake_id = b.stocktake_id
  AND a.product_id = b.product_id;

ALTER TABLE stocktake_items
  ADD CONSTRAINT uq_stocktake_items_stocktake_product
  UNIQUE (stocktake_id, product_id);

CREATE TABLE expiry_discount_rules (
  id BIGSERIAL PRIMARY KEY,
  days_before_expiry INTEGER NOT NULL CHECK (days_before_expiry >= 0),
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE orders ADD COLUMN promotion_code VARCHAR(50);

ALTER TABLE expiry_discount_rules
  ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'expiry';

ALTER TABLE expiry_discount_rules
  ADD CONSTRAINT chk_expiry_discount_rules_scope
  CHECK (scope IN ('expiry', 'all_products'));

ALTER TABLE expiry_discount_rules
  ALTER COLUMN days_before_expiry DROP NOT NULL;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(12,2) NULL,
  ADD COLUMN IF NOT EXISTS expiry_discount_percent NUMERIC(5,2) NULL;

CREATE TABLE product_batches (
  id                  BIGSERIAL       PRIMARY KEY,
  product_id          BIGINT          NOT NULL REFERENCES products(id),
  batch_code          VARCHAR(100)    NOT NULL,
  quantity_received   INTEGER         NOT NULL DEFAULT 0,
  quantity_remaining  INTEGER         NOT NULL DEFAULT 0,
  unit_cost           NUMERIC(12,2)   NOT NULL,
  expiry_date         DATE,
  received_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
  created_by          BIGINT          REFERENCES users(id),
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  CONSTRAINT chk_product_batches_qty_received CHECK (quantity_received >= 0),
  CONSTRAINT chk_product_batches_qty_remaining CHECK (quantity_remaining >= 0)
);

CREATE INDEX idx_product_batches_fefo
  ON product_batches(product_id, expiry_date ASC NULLS LAST, id ASC)
  WHERE deleted_at IS NULL AND quantity_remaining > 0;

ALTER TABLE products
  ADD COLUMN nearest_expiry_date DATE NULL;

ALTER TABLE inventory_transactions
  ADD COLUMN batch_id BIGINT REFERENCES product_batches(id) NULL;

CREATE TABLE order_item_batches (
  id              BIGSERIAL       PRIMARY KEY,
  order_item_id   BIGINT          NOT NULL REFERENCES order_items(id),
  batch_id        BIGINT          NOT NULL REFERENCES product_batches(id),
  quantity_taken  INTEGER         NOT NULL,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

  CONSTRAINT chk_order_item_batches_qty CHECK (quantity_taken > 0)
);
CREATE INDEX idx_order_item_batches_order_item ON order_item_batches(order_item_id);
CREATE INDEX idx_order_item_batches_batch ON order_item_batches(batch_id);

DO $$
DECLARE
  admin_id BIGINT;
BEGIN
  SELECT id INTO admin_id FROM users LIMIT 1;

  INSERT INTO product_batches (
    product_id, batch_code, quantity_received, quantity_remaining,
    unit_cost, expiry_date, created_by, created_at, updated_at
  )
  SELECT
    id, 'LÔ-BACKFILL-' || id, stock_quantity, stock_quantity,
    cost_price, expiry_date, admin_id, now(), now()
  FROM products
  WHERE stock_quantity > 0 AND deleted_at IS NULL;

  UPDATE products
  SET nearest_expiry_date = expiry_date
  WHERE stock_quantity > 0 AND deleted_at IS NULL;
END $$;

COMMIT;
