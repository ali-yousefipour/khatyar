-- v152: group/individual subscriptions (idempotent)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mode VARCHAR(20) NOT NULL,
  amount BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  invoice_payload VARCHAR(255) NOT NULL UNIQUE,
  provider_transaction_id VARCHAR(190) NULL,
  paid_at DATETIME NULL,
  raw_payload LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_subscription_payment_user (user_id),
  KEY idx_subscription_payment_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  starts_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  payment_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_subscription_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS group_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payer_user_id INT NOT NULL,
  starts_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  payment_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_group_subscription_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
