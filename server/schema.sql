CREATE TABLE IF NOT EXISTS t_user (
  id BIGSERIAL PRIMARY KEY,
  openid VARCHAR(128) NOT NULL UNIQUE,
  nickname VARCHAR(128),
  avatar_url TEXT,
  gender VARCHAR(16),
  birthday DATE,
  height_cm NUMERIC(5,2),
  target_weight_kg NUMERIC(5,2),
  create_at TIMESTAMP DEFAULT now(),
  update_at TIMESTAMP DEFAULT now(),
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS t_family_member (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  gender VARCHAR(16),
  birthday DATE,
  height_cm NUMERIC(5,2),
  target_weight_kg NUMERIC(5,2),
  is_default BOOLEAN DEFAULT false,
  create_at TIMESTAMP DEFAULT now(),
  update_at TIMESTAMP DEFAULT now(),
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS t_body_scale_device (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  device_name VARCHAR(128),
  device_model VARCHAR(64),
  brand VARCHAR(64),
  bluetooth_device_id VARCHAR(256),
  service_uuid VARCHAR(128),
  notify_characteristic_uuid VARCHAR(128),
  write_characteristic_uuid VARCHAR(128),
  bind_time TIMESTAMP DEFAULT now(),
  last_connected_time TIMESTAMP,
  create_at TIMESTAMP DEFAULT now(),
  update_at TIMESTAMP DEFAULT now(),
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS t_body_measurement (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  member_id BIGINT NOT NULL,
  device_id BIGINT,
  measured_at TIMESTAMP NOT NULL,
  weight_kg NUMERIC(6,2),
  bmi NUMERIC(5,2),
  body_fat_rate NUMERIC(5,2),
  muscle_mass_kg NUMERIC(6,2),
  water_rate NUMERIC(5,2),
  bone_mass_kg NUMERIC(5,2),
  visceral_fat_level NUMERIC(5,2),
  bmr NUMERIC(8,2),
  heart_rate INT,
  raw_data JSONB,
  create_at TIMESTAMP DEFAULT now(),
  update_at TIMESTAMP DEFAULT now(),
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS t_ble_raw_data (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  device_id BIGINT,
  raw_hex TEXT NOT NULL,
  service_uuid VARCHAR(128),
  characteristic_uuid VARCHAR(128),
  parse_status VARCHAR(32),
  parse_error TEXT,
  received_at TIMESTAMP NOT NULL,
  create_at TIMESTAMP DEFAULT now()
);
