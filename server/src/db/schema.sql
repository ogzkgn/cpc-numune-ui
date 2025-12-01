-- Canonical products (templates/catalog)
CREATE TABLE IF NOT EXISTS products (
  id                       BIGSERIAL PRIMARY KEY,
  name                     TEXT NOT NULL,                              -- Ürün Adı
  product_type             TEXT NOT NULL,                              -- Ürün Tipi
  requires_sampling        BOOLEAN NOT NULL DEFAULT FALSE,             -- Numune Alınacak mı
  sampling_interval_months INTEGER,                                    -- Numune Döngüsü (Ay)
  lab_return_days          INTEGER,                                    -- Laboratuvar Dönüş Tahmini (Gün)
  standard_no              TEXT,                                       -- Standart
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Company-specific products (instances)
CREATE TABLE IF NOT EXISTS company_products (
  id                       BIGSERIAL PRIMARY KEY,
  company_name             TEXT NOT NULL,                              -- Firma Adı (until a companies table is added)
  product_name             TEXT NOT NULL,                              -- Ürün Adı (denormalized for superkey)
  product_type             TEXT NOT NULL,                              -- Ürün Tipi
  product_id               BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  bt_code                  TEXT,                                       -- BT Kod
  code                     TEXT,                                       -- Kod
  product_code             TEXT,                                       -- Ürün Kodu
  location                 TEXT,                                       -- İl / İlçe
  certificate_date         DATE,                                       -- Belge Tarihi
  last_sample_date         DATE,                                       -- Son Numune Tarihi
  last_inspection_date     DATE,                                       -- Son Denetim Tarihi
  payment_status           TEXT,                                       -- Ödeme Durumu (e.g., yapti/yapmadi/muaf)
  requires_sampling        BOOLEAN NOT NULL DEFAULT FALSE,             -- Numune Alınacak mı
  sampling_interval_months INTEGER,                                    -- Numune Döngüsü (Ay)
  lab_return_days          INTEGER,                                    -- Laboratuvar Dönüş Tahmini (Gün)
  standard_no              TEXT,                                       -- Standart
  status                   TEXT NOT NULL DEFAULT 'devam',              -- Durum
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_products_unique_product_company UNIQUE (product_name, company_name)
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,
  status      TEXT NOT NULL DEFAULT 'available',
  skills      TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trips (planning)
CREATE TABLE IF NOT EXISTS trips (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT,
  planned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status           TEXT NOT NULL CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')),
  assignee_ids     BIGINT[] NOT NULL DEFAULT '{}',
  notes            TEXT,
  planned_by       TEXT,
  transport_mode   TEXT CHECK (transport_mode IN ('COMPANY_VEHICLE','BUS','PLANE','TRAIN')),
  vehicle_plate    TEXT,
  lodging_provider TEXT CHECK (lodging_provider IN ('COMPANY','CPC')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Duty assignments per trip / company-product
CREATE TABLE IF NOT EXISTS trip_duty_assignments (
  id                  BIGSERIAL PRIMARY KEY,
  trip_id             BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  company_product_id  BIGINT NOT NULL REFERENCES company_products(id),
  duty_type           TEXT NOT NULL CHECK (duty_type IN ('NUMUNE','GÖZETİM','BOTH')),
  duty_assignee_ids   BIGINT[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, company_product_id)
);

-- Persisted trip items (tracking_id as PK)
CREATE TABLE IF NOT EXISTS trip_items (
  id                  BIGSERIAL PRIMARY KEY,
  trip_id             BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  company_product_id  BIGINT NOT NULL REFERENCES company_products(id),
  duty_type           TEXT NOT NULL CHECK (duty_type IN ('NUMUNE','GÖZETİM','BOTH')),
  duty_assignee_ids   BIGINT[] NOT NULL DEFAULT '{}',
  sampled             BOOLEAN NOT NULL DEFAULT FALSE,
  sampled_at          TIMESTAMPTZ,
  lab_status          TEXT,
  lab_sent_at         TIMESTAMPTZ,
  lab_assigned_lab_id BIGINT,
  lab_shipment_details JSONB,
  lab_entry_code      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, company_product_id)
);

-- Lab shipments (send-to-lab metadata per trip item)
CREATE TABLE IF NOT EXISTS lab_shipments (
  id                  BIGSERIAL PRIMARY KEY,
  trip_item_id        BIGINT NOT NULL UNIQUE REFERENCES trip_items(id) ON DELETE CASCADE,
  lab_id              BIGINT NOT NULL,
  lab_entry_code      TEXT NOT NULL,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seal_no             TEXT NOT NULL,
  weight              NUMERIC,
  cpc_note            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Labs
CREATE TABLE IF NOT EXISTS labs (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  city       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lab forms (results)
CREATE TABLE IF NOT EXISTS lab_forms (
  id            BIGSERIAL PRIMARY KEY,
  trip_item_id  BIGINT NOT NULL UNIQUE REFERENCES trip_items(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','WAITING_CONFIRM','APPROVED')),
  standard_no   TEXT,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  lab_notes     TEXT,
  cpc_notes     TEXT,
  documents     JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trip completion header
CREATE TABLE IF NOT EXISTS trip_completions (
  id                        BIGSERIAL PRIMARY KEY,
  trip_id                   BIGINT NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  completed_by_employee_ids BIGINT[] NOT NULL DEFAULT '{}',
  transport_mode            TEXT NOT NULL CHECK (transport_mode IN ('COMPANY_VEHICLE','BUS','PLANE','TRAIN')),
  vehicle_plate             TEXT,
  total_km                  NUMERIC,
  total_days                NUMERIC,
  lodging_provider          TEXT CHECK (lodging_provider IN ('COMPANY','CPC')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per company-product completion details
CREATE TABLE IF NOT EXISTS trip_completion_entries (
  id                       BIGSERIAL PRIMARY KEY,
  trip_completion_id       BIGINT NOT NULL REFERENCES trip_completions(id) ON DELETE CASCADE,
  company_product_id       BIGINT NOT NULL REFERENCES company_products(id),
  duty_type                TEXT NOT NULL CHECK (duty_type IN ('NUMUNE','GÖZETİM','BOTH')),
  duty_assignee_ids        BIGINT[] NOT NULL DEFAULT '{}',
  performed_at             TIMESTAMPTZ,
  inspected_at             TIMESTAMPTZ,
  sample_not_completed     BOOLEAN,
  inspection_not_completed BOOLEAN,
  tracking_code            TEXT,
  lodging_payment_amount   NUMERIC,
  transport_expense        NUMERIC,
  meal_lunch_expense       NUMERIC,
  meal_dinner_expense      NUMERIC,
  company_expense          NUMERIC,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_completion_id, company_product_id)
);
