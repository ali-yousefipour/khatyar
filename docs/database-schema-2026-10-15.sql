-- Schema-only reference snapshot extracted from h301194_app.sql on 2026-10-15.
-- Contains CREATE TABLE definitions only; no application records or dump commands.
-- Reference documentation, not an installation script or migration.
-- Current installer/migrations remain php/db/mysql_schema.sql and related upgrade files.

CREATE TABLE `activity_logs` (
  `id` bigint NOT NULL,
  `user_id` int DEFAULT NULL,
  `event` varchar(60) NOT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `api_cache` (
  `cache_key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cache_value` mediumtext COLLATE utf8mb4_unicode_ci,
  `expires_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `api_client_requests_v2` (
  `id` bigint UNSIGNED NOT NULL,
  `request_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_uuid` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_code` smallint NOT NULL DEFAULT '102',
  `response_json` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_settings` (
  `key` varchar(80) NOT NULL,
  `value` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `attendances` (
  `id` int NOT NULL,
  `driver_id` int NOT NULL,
  `user_id` int NOT NULL,
  `line_id` int DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `exit_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `attendance_ot_adjustments` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `jdate` varchar(10) NOT NULL,
  `minutes` int NOT NULL DEFAULT '0',
  `reason` text,
  `approved_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `attendance_recalculate_logs` (
  `id` bigint NOT NULL,
  `user_id` int DEFAULT NULL,
  `from_jdate` varchar(10) DEFAULT NULL,
  `to_jdate` varchar(10) DEFAULT NULL,
  `rows_count` int NOT NULL DEFAULT '0',
  `actor_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `attendance_reject_logs` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `line_id` bigint DEFAULT NULL,
  `method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `accuracy_m` decimal(10,2) DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `backup_log` (
  `id` int NOT NULL,
  `kind` varchar(10) NOT NULL,
  `is_light` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `bale_bot_events` (
  `id` bigint NOT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_text` text COLLATE utf8mb4_unicode_ci,
  `payload_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bale_chat_sessions` (
  `id` bigint NOT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `form_id` bigint DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bale_custom_replies` (
  `id` bigint NOT NULL,
  `platform` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bale',
  `trigger_text` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `match_type` enum('exact','contains','starts_with') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'exact',
  `response_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bale_forms` (
  `id` bigint NOT NULL,
  `platform` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bale',
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `require_national_code` tinyint(1) NOT NULL DEFAULT '1',
  `auto_prefill_driver` tinyint(1) NOT NULL DEFAULT '1',
  `success_message` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bale_form_fields` (
  `id` bigint NOT NULL,
  `form_id` bigint NOT NULL,
  `field_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `prefill_source` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `options_json` json DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bale_form_submissions` (
  `id` bigint NOT NULL,
  `form_id` bigint NOT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subscriber_id` bigint DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  `driver_id` bigint DEFAULT NULL,
  `national_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_json` json DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bale_menu_items` (
  `id` bigint NOT NULL,
  `platform` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bale',
  `title` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'message',
  `action_payload` text COLLATE utf8mb4_unicode_ci,
  `form_id` bigint DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bale_message_log` (
  `id` bigint NOT NULL,
  `target_type` varchar(30) DEFAULT NULL,
  `target_id` int DEFAULT NULL,
  `chat_id` varchar(80) DEFAULT NULL,
  `body` text,
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `response` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `bale_subscribers` (
  `id` int NOT NULL,
  `chat_id` varchar(80) NOT NULL,
  `bale_user_id` varchar(80) DEFAULT NULL,
  `mobile` varchar(20) NOT NULL,
  `user_id` int DEFAULT NULL,
  `driver_id` int DEFAULT NULL,
  `display_name` varchar(190) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_seen_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `bills` (
  `id` int NOT NULL,
  `bill_id` varchar(40) DEFAULT NULL,
  `pay_id` varchar(40) DEFAULT NULL,
  `status` varchar(60) DEFAULT NULL,
  `reason` varchar(200) DEFAULT NULL,
  `person_title` varchar(200) DEFAULT NULL,
  `national_id` varchar(10) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `amount` bigint DEFAULT NULL,
  `pay_date` varchar(20) DEFAULT NULL,
  `plate` varchar(40) DEFAULT NULL,
  `operating_code` varchar(40) DEFAULT NULL,
  `line_text` varchar(200) DEFAULT NULL,
  `driver_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `paid_date` varchar(20) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `checklist_items` (
  `id` int NOT NULL,
  `template_id` int NOT NULL,
  `label` varchar(200) NOT NULL,
  `sort_order` int DEFAULT '0',
  `options` json DEFAULT NULL,
  `answer_type` varchar(20) DEFAULT 'single'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `checklist_submissions` (
  `id` int NOT NULL,
  `template_id` int NOT NULL,
  `driver_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `answers` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `photo_data` longtext,
  `photo_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `checklist_templates` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `commitment_reasons` (
  `id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `company_card_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `payment_id` bigint UNSIGNED NOT NULL,
  `request_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `amount` bigint NOT NULL DEFAULT '0',
  `declared_amount` bigint NOT NULL DEFAULT '0',
  `card_number` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_number` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `receipt_file_id` bigint UNSIGNED DEFAULT NULL,
  `receipt_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `device_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reject_reason` text COLLATE utf8mb4_unicode_ci,
  `operator_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `company_requests` (
  `id` bigint UNSIGNED NOT NULL,
  `tracking_code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_type_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `driver_id` bigint DEFAULT NULL,
  `status` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `amount` bigint NOT NULL DEFAULT '0',
  `payment_method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unpaid',
  `form_data` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `assigned_to` bigint DEFAULT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `due_at` datetime DEFAULT NULL,
  `last_status_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `last_sla_notified_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `company_request_files` (
  `id` bigint UNSIGNED NOT NULL,
  `request_id` bigint UNSIGNED NOT NULL,
  `document_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` bigint NOT NULL DEFAULT '0',
  `crop_meta` json DEFAULT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sha256` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quality_score` tinyint UNSIGNED DEFAULT NULL,
  `quality_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quality_meta` longtext COLLATE utf8mb4_unicode_ci,
  `ocr_text` longtext COLLATE utf8mb4_unicode_ci,
  `ocr_meta` longtext COLLATE utf8mb4_unicode_ci,
  `original_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processed_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processed_size` bigint NOT NULL DEFAULT '0',
  `source_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `company_request_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `request_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `action` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `company_request_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `request_id` bigint UNSIGNED NOT NULL,
  `method` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` bigint NOT NULL DEFAULT '0',
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IRR',
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `transaction_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_transaction_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_code` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payer_note` text COLLATE utf8mb4_unicode_ci,
  `raw_payload` json DEFAULT NULL,
  `verified_by` bigint DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `invoice_payload` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pre_checkout_query_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telegram_payment_charge_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `invoice_message_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_sent_at` datetime DEFAULT NULL,
  `inquiry_count` int NOT NULL DEFAULT '0',
  `last_inquired_at` datetime DEFAULT NULL,
  `last_error` text COLLATE utf8mb4_unicode_ci,
  `paid_at` datetime DEFAULT NULL,
  `declared_amount` bigint DEFAULT NULL,
  `bank_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_file_id` bigint UNSIGNED DEFAULT NULL,
  `device_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_note` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `company_request_settings` (
  `setting_key` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` longtext COLLATE utf8mb4_unicode_ci,
  `updated_by` bigint DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `company_request_types` (
  `id` bigint UNSIGNED NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` bigint NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `deadline_days` int NOT NULL DEFAULT '7',
  `description` text COLLATE utf8mb4_unicode_ci,
  `required_fields` json DEFAULT NULL,
  `required_documents` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `complaints` (
  `id` bigint NOT NULL,
  `tracking_code` varchar(40) NOT NULL,
  `driver_id` int NOT NULL,
  `vehicle_id` int DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  `received_by` int NOT NULL,
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `receive_lat` double DEFAULT NULL,
  `receive_lng` double DEFAULT NULL,
  `location_name` varchar(300) DEFAULT NULL,
  `complainant_first_name` varchar(100) NOT NULL,
  `complainant_last_name` varchar(100) NOT NULL,
  `complainant_mobile` varchar(20) NOT NULL,
  `receipt_channel` varchar(20) NOT NULL DEFAULT 'software',
  `complainant_type` varchar(20) NOT NULL,
  `stay_days` int DEFAULT NULL,
  `residence_city` varchar(120) DEFAULT NULL,
  `complaint_type` varchar(20) NOT NULL,
  `category_id` int DEFAULT NULL,
  `subject` varchar(300) NOT NULL,
  `body` text NOT NULL,
  `signature_data` mediumtext,
  `status` varchar(30) NOT NULL DEFAULT 'received',
  `assigned_to` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `closed_by` int DEFAULT NULL,
  `sms_status` varchar(20) DEFAULT NULL,
  `sms_message_id` varchar(80) DEFAULT NULL,
  `sms_error` varchar(500) DEFAULT NULL,
  `sms_sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `complaint_categories` (
  `id` int NOT NULL,
  `complaint_type` varchar(20) NOT NULL,
  `title` varchar(200) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `complaint_workflow` (
  `id` bigint NOT NULL,
  `complaint_id` bigint NOT NULL,
  `actor_id` int NOT NULL,
  `action` varchar(30) NOT NULL,
  `to_user_id` int DEFAULT NULL,
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `covert_selfies` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `photo_data` longtext,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `reason` varchar(20) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `photo_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `covert_selfie_commands` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `issued_by` int NOT NULL,
  `reason` varchar(50) DEFAULT 'manual',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `covert_selfie_requests` (
  `id` int NOT NULL,
  `target_user_id` int DEFAULT NULL,
  `target_role_id` int DEFAULT NULL,
  `target_zone_id` int DEFAULT NULL,
  `requested_by` int NOT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `fulfilled_count` int NOT NULL DEFAULT '0',
  `note` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cron_run_log` (
  `cron_key` varchar(40) NOT NULL,
  `last_run_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_status` varchar(10) NOT NULL DEFAULT 'ok',
  `last_message` text,
  `run_count` int NOT NULL DEFAULT '0',
  `last_source` varchar(10) NOT NULL DEFAULT 'cli'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cultural_activities` (
  `id` int NOT NULL,
  `type_id` int NOT NULL,
  `driver_national_id` varchar(10) NOT NULL,
  `driver_name` varchar(200) DEFAULT NULL,
  `driver_mobile` varchar(20) DEFAULT NULL,
  `activity_jdate` varchar(10) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `hours` decimal(5,1) DEFAULT NULL,
  `note` text,
  `recorded_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `place_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cultural_places` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `address` varchar(400) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cultural_types` (
  `id` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `custom_fields` (
  `id` int NOT NULL,
  `label` varchar(150) NOT NULL,
  `fkey` varchar(80) NOT NULL,
  `ftype` varchar(20) NOT NULL DEFAULT 'text',
  `options` text,
  `required` tinyint(1) NOT NULL DEFAULT '0',
  `user_editable` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `custom_field_values` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `field_id` int NOT NULL,
  `value` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `custom_forms` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `schema` json NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `public_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `public_slug` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `delivery_dead_letters` (
  `id` bigint NOT NULL,
  `original_queue_id` bigint DEFAULT NULL,
  `channel` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` bigint DEFAULT NULL,
  `to_value` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `payload` json DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `last_error` text COLLATE utf8mb4_unicode_ci,
  `failed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `delivery_queue` (
  `id` bigint NOT NULL,
  `channel` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` bigint DEFAULT NULL,
  `to_value` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `payload` json DEFAULT NULL,
  `status` enum('pending','processing','sent','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '5',
  `next_attempt_at` datetime DEFAULT NULL,
  `last_error` text COLLATE utf8mb4_unicode_ci,
  `sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `device_status_periods` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `status_type` enum('gps_off','vpn_on') COLLATE utf8mb4_unicode_ci NOT NULL,
  `started_at` datetime NOT NULL,
  `ended_at` datetime DEFAULT NULL,
  `duration_seconds` int UNSIGNED DEFAULT NULL,
  `source` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mobile',
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `drivers` (
  `id` int NOT NULL,
  `national_id` varchar(10) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `father_name` varchar(100) DEFAULT NULL,
  `birth_date` varchar(20) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `address` varchar(400) DEFAULT NULL,
  `smart_no` varchar(40) DEFAULT NULL,
  `taxi_lic_issue` varchar(20) DEFAULT NULL,
  `taxi_lic_expire` varchar(20) DEFAULT NULL,
  `taxi_lic_status` varchar(60) DEFAULT NULL,
  `operating_code` varchar(40) DEFAULT NULL,
  `op_lic_issue` varchar(20) DEFAULT NULL,
  `op_lic_expire` varchar(20) DEFAULT NULL,
  `op_lic_status` varchar(60) DEFAULT NULL,
  `driver_type` varchar(60) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `field_alert_preferences` (
  `user_id` bigint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `muted` tinyint(1) NOT NULL DEFAULT '0',
  `all_types` tinyint(1) NOT NULL DEFAULT '1',
  `types_json` json DEFAULT NULL,
  `all_people` tinyint(1) NOT NULL DEFAULT '1',
  `people_json` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `form_submissions` (
  `id` int NOT NULL,
  `form_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `driver_id` int DEFAULT NULL,
  `answers` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_public` tinyint(1) NOT NULL DEFAULT '0',
  `submitter_name` varchar(150) DEFAULT NULL,
  `submitter_mobile` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `geofences` (
  `id` int NOT NULL,
  `line_id` int DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `type` varchar(12) NOT NULL,
  `color` varchar(20) NOT NULL DEFAULT '#0d7a5f',
  `center_lat` double DEFAULT NULL,
  `center_lng` double DEFAULT NULL,
  `radius_m` int DEFAULT NULL,
  `polygon` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `station_location_id` bigint DEFAULT NULL,
  `station_code` varchar(80) DEFAULT NULL,
  `purpose` varchar(40) NOT NULL DEFAULT 'station_attendance',
  `base_radius_m` int NOT NULL DEFAULT '100',
  `edge_tolerance_m` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `group_subscriptions` (
  `id` int NOT NULL,
  `payer_user_id` int NOT NULL,
  `starts_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `amount` bigint NOT NULL DEFAULT '0',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `payment_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `holidays` (
  `id` int NOT NULL,
  `jdate` varchar(10) NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `source` varchar(40) DEFAULT NULL,
  `is_official` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `inspector_modes` (
  `user_id` int NOT NULL,
  `mode` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_item_types` (
  `id` int NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_transfers` (
  `id` int NOT NULL,
  `item_type_id` int NOT NULL,
  `from_user_id` int DEFAULT NULL,
  `to_user_id` int NOT NULL,
  `quantity` int NOT NULL,
  `status` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_at` datetime DEFAULT NULL,
  `confirmed_by` int DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `transferable` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `leave_blocked_dates` (
  `id` int NOT NULL,
  `jdate` varchar(10) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `lines` (
  `id` int NOT NULL,
  `code` varchar(40) DEFAULT NULL,
  `origin` varchar(200) DEFAULT NULL,
  `destination` varchar(200) DEFAULT NULL,
  `broker` varchar(200) DEFAULT NULL,
  `municipality_zone` varchar(120) DEFAULT NULL,
  `taxi_zone` varchar(120) DEFAULT NULL,
  `type` varchar(120) DEFAULT NULL,
  `is_special` varchar(40) DEFAULT NULL,
  `is_circular` varchar(40) DEFAULT NULL,
  `status` varchar(60) DEFAULT NULL,
  `checkin_methods` varchar(120) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `location_accuracy_m` decimal(10,2) DEFAULT NULL,
  `location_photo_path` varchar(500) DEFAULT NULL,
  `station_sign_photo_path` varchar(500) DEFAULT NULL,
  `station_name` varchar(190) DEFAULT NULL,
  `location_updated_by` int DEFAULT NULL,
  `location_updated_at` datetime DEFAULT NULL,
  `station_location_id` bigint DEFAULT NULL,
  `station_physical_address` text,
  `station_street` varchar(190) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `line_idents` (
  `id` int NOT NULL,
  `line_id` int NOT NULL,
  `kind` varchar(10) NOT NULL,
  `value` varchar(190) NOT NULL,
  `label` varchar(120) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `line_location_permissions` (
  `id` int NOT NULL,
  `role_id` int NOT NULL,
  `can_capture` tinyint(1) NOT NULL DEFAULT '0',
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_manage` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `line_score_coefficients` (
  `line_id` int NOT NULL,
  `coefficient` decimal(5,2) NOT NULL DEFAULT '1.00',
  `note` varchar(190) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `line_station_locations` (
  `id` bigint NOT NULL,
  `line_id` int NOT NULL,
  `station_name` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `accuracy_m` decimal(10,2) DEFAULT NULL,
  `location_photo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sign_photo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `captured_by` int NOT NULL,
  `captured_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `station_code` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `station_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registered',
  `physical_address` text COLLATE utf8mb4_unicode_ci,
  `street` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `station_location_id` bigint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `line_station_signs` (
  `id` bigint NOT NULL,
  `station_location_id` bigint NOT NULL,
  `sign_type_id` int NOT NULL,
  `photo_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `line_visit_reports` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `line_id` bigint NOT NULL,
  `visit_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'field',
  `started_at` datetime NOT NULL,
  `finished_at` datetime DEFAULT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `declared_present_count` int DEFAULT NULL,
  `actual_present_count` int DEFAULT NULL,
  `total_line_vehicles` int DEFAULT NULL,
  `expired_present_count` int DEFAULT NULL,
  `present_notice_count` int DEFAULT NULL,
  `supervisor_user_id` bigint DEFAULT NULL,
  `supervisor_score` decimal(6,2) DEFAULT NULL,
  `supervisor_note` text COLLATE utf8mb4_unicode_ci,
  `report_text` text COLLATE utf8mb4_unicode_ci,
  `photo_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'submitted',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `location_pings` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `captured_at` datetime NOT NULL,
  `synced_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mocked` tinyint(1) NOT NULL DEFAULT '0',
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `vpn_on` tinyint(1) NOT NULL DEFAULT '0',
  `via_gsm` tinyint(1) NOT NULL DEFAULT '0',
  `accuracy_m` decimal(10,2) DEFAULT NULL,
  `provider` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `login_ip_attempts` (
  `id` int NOT NULL,
  `ip` varchar(64) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `login_otp` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `code_hash` varchar(64) NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `messages` (
  `id` int NOT NULL,
  `sender_id` int NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `body` text NOT NULL,
  `target_type` varchar(12) NOT NULL,
  `zone_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_data` mediumtext,
  `attachment_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `message_recipients` (
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `messenger_bot_events` (
  `id` bigint NOT NULL,
  `platform` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_text` text COLLATE utf8mb4_unicode_ci,
  `payload_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messenger_chat_sessions` (
  `id` bigint NOT NULL,
  `platform` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `form_id` bigint DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messenger_form_submissions` (
  `id` bigint NOT NULL,
  `platform` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_id` bigint NOT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subscriber_id` bigint DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  `driver_id` bigint DEFAULT NULL,
  `national_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_json` json DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messenger_message_log` (
  `id` bigint NOT NULL,
  `platform` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` bigint DEFAULT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `response` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messenger_subscribers` (
  `id` bigint NOT NULL,
  `platform` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform_user_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  `driver_id` bigint DEFAULT NULL,
  `display_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_seen_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_badges` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `badge_key` varchar(32) NOT NULL,
  `period_type` varchar(10) NOT NULL,
  `period_key` varchar(20) NOT NULL,
  `rank` int DEFAULT NULL,
  `points` decimal(9,2) NOT NULL DEFAULT '0.00',
  `awarded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `mission_daily_progress` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `progress_date` date NOT NULL,
  `role_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mission_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mission_id` bigint DEFAULT NULL,
  `assigned_lines_count` int NOT NULL DEFAULT '0',
  `visited_lines_count` int NOT NULL DEFAULT '0',
  `validated_lines_count` int NOT NULL DEFAULT '0',
  `target_json` longtext COLLATE utf8mb4_unicode_ci,
  `actual_json` longtext COLLATE utf8mb4_unicode_ci,
  `progress_json` longtext COLLATE utf8mb4_unicode_ci,
  `weighted_achievement` decimal(7,2) NOT NULL DEFAULT '0.00',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_execution_settings` (
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_metric_catalog` (
  `metric_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percent',
  `applicable_roles` longtext COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_score_adjustments` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `score_date` date NOT NULL,
  `rule_key` varchar(64) NOT NULL,
  `original_points` decimal(9,2) NOT NULL,
  `adjusted_points` decimal(9,2) NOT NULL,
  `reason` varchar(300) NOT NULL,
  `adjusted_by` int DEFAULT NULL,
  `adjusted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `mission_score_daily` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `score_date` date NOT NULL,
  `rule_key` varchar(64) NOT NULL,
  `role_key` varchar(40) DEFAULT NULL,
  `count` decimal(8,2) NOT NULL DEFAULT '0.00',
  `base_points` decimal(6,2) NOT NULL DEFAULT '0.00',
  `role_coefficient` decimal(5,2) NOT NULL DEFAULT '1.00',
  `line_coefficient` decimal(5,2) NOT NULL DEFAULT '1.00',
  `points` decimal(9,2) NOT NULL DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_adjusted` tinyint(1) NOT NULL DEFAULT '0',
  `adjustment_reason` varchar(300) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `mission_templates` (
  `id` bigint NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `period` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily',
  `zone_id` int DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_template_targets` (
  `id` bigint NOT NULL,
  `template_id` bigint NOT NULL,
  `metric_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_percent` decimal(6,2) NOT NULL DEFAULT '0.00',
  `weight` decimal(8,2) NOT NULL DEFAULT '1.00',
  `is_required` tinyint(1) NOT NULL DEFAULT '1',
  `minimum_count` int DEFAULT NULL,
  `config` longtext COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_timeline_events` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `line_id` int DEFAULT NULL,
  `visit_session_id` bigint DEFAULT NULL,
  `event_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` bigint DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` longtext COLLATE utf8mb4_unicode_ci,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_visit_sessions` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `line_id` int NOT NULL,
  `role_mode` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  `start_lat` decimal(10,7) DEFAULT NULL,
  `start_lng` decimal(10,7) DEFAULT NULL,
  `finish_lat` decimal(10,7) DEFAULT NULL,
  `finish_lng` decimal(10,7) DEFAULT NULL,
  `start_photo_data` longtext COLLATE utf8mb4_unicode_ci,
  `finish_photo_data` longtext COLLATE utf8mb4_unicode_ci,
  `report_text` text COLLATE utf8mb4_unicode_ci,
  `actual_present_count` int DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_progress',
  `validated` tinyint(1) NOT NULL DEFAULT '0',
  `validation_percent` decimal(6,2) NOT NULL DEFAULT '0.00',
  `validation_details` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `open_visit_key` varchar(100) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'in_progress') then concat(`user_id`,_utf8mb4':',`line_id`) else NULL end)) STORED,
  `start_photo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `finish_photo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_accuracy` decimal(8,2) DEFAULT NULL,
  `finish_accuracy` decimal(8,2) DEFAULT NULL,
  `start_provider` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `finish_provider` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checked_count` int NOT NULL DEFAULT '0',
  `attendance_count` int NOT NULL DEFAULT '0',
  `notice_count` int NOT NULL DEFAULT '0',
  `coverage_percent` decimal(6,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mobile_device_health` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `device_key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `app_version` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `build_version` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `android_sdk` int DEFAULT NULL,
  `manufacturer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_state` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `battery_level` smallint DEFAULT NULL,
  `battery_state` smallint DEFAULT NULL,
  `low_power_mode` tinyint(1) NOT NULL DEFAULT '0',
  `network_connected` tinyint(1) NOT NULL DEFAULT '0',
  `internet_reachable` tinyint(1) NOT NULL DEFAULT '0',
  `network_type` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `local_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_memory_bytes` bigint DEFAULT NULL,
  `free_disk_bytes` bigint DEFAULT NULL,
  `total_disk_bytes` bigint DEFAULT NULL,
  `api_ok` tinyint(1) NOT NULL DEFAULT '0',
  `api_latency_ms` int DEFAULT NULL,
  `api_status` int DEFAULT NULL,
  `monitor_uptime_seconds` int DEFAULT NULL,
  `captured_at` datetime NOT NULL,
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `raw_payload` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mobile_device_health_latest` (
  `user_id` bigint NOT NULL,
  `device_key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `health_id` bigint DEFAULT NULL,
  `app_version` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `android_sdk` int DEFAULT NULL,
  `manufacturer` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `battery_level` smallint DEFAULT NULL,
  `free_disk_bytes` bigint DEFAULT NULL,
  `api_ok` tinyint(1) NOT NULL DEFAULT '0',
  `api_latency_ms` int DEFAULT NULL,
  `network_connected` tinyint(1) NOT NULL DEFAULT '0',
  `internet_reachable` tinyint(1) NOT NULL DEFAULT '0',
  `app_state` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `captured_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mobile_error_logs` (
  `id` bigint NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `device_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_version` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `screen` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `stack` mediumtext COLLATE utf8mb4_unicode_ci,
  `extra` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notices` (
  `id` int NOT NULL,
  `driver_id` int NOT NULL,
  `user_id` int NOT NULL,
  `reason_id` int DEFAULT NULL,
  `priority` varchar(10) NOT NULL,
  `body` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_data` mediumtext,
  `attachment_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `notice_reasons` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `notifications` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `body` text,
  `data` json DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `official_visits` (
  `id` int NOT NULL,
  `official_id` int NOT NULL,
  `recorded_by` int NOT NULL,
  `line_id` int DEFAULT NULL,
  `note` text,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `photo_data` longtext,
  `photo_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `offline_sync_audit` (
  `id` bigint NOT NULL,
  `offline_sync_id` bigint NOT NULL,
  `actor_id` bigint DEFAULT NULL,
  `action` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `before_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `after_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `offline_sync_logs` (
  `id` bigint NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `device_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_uuid` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'received',
  `payload` json DEFAULT NULL,
  `response` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `source_path` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error` text COLLATE utf8mb4_unicode_ci,
  `server_result` json DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `resolved_by` bigint DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `resolution_note` text COLLATE utf8mb4_unicode_ci,
  `conflict_reason` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payroll_base` (
  `user_id` int NOT NULL,
  `base_monthly` bigint DEFAULT NULL,
  `housing` bigint DEFAULT NULL,
  `family` bigint DEFAULT NULL,
  `food` bigint DEFAULT NULL,
  `other_allow` bigint DEFAULT NULL,
  `insurance_pct` double DEFAULT NULL,
  `tax_pct` double DEFAULT NULL,
  `other_deduct` bigint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `personnel_vehicle_assets` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `asset_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plate` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicle_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fuel_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_year` smallint DEFAULT NULL,
  `chassis_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `engine_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vin` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_issue_date` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_expiry_date` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `insurance_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `insurer` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `insurance_issue_date` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `insurance_expiry_date` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `technical_inspection_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `technical_inspection_issue_date` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `technical_inspection_expiry_date` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fixed_beacon` tinyint(1) NOT NULL DEFAULT '0',
  `movable_beacon` tinyint(1) NOT NULL DEFAULT '0',
  `heating_healthy` tinyint(1) NOT NULL DEFAULT '0',
  `cooling_healthy` tinyint(1) NOT NULL DEFAULT '0',
  `amplifier` tinyint(1) NOT NULL DEFAULT '0',
  `carburetor_injector` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `engine_system` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motorcycle_type` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cylinder_count` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `plate_part_right` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_letter` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_part_left` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_iran` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motorcycle_plate_top` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motorcycle_plate_bottom` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motorcycle_usage` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motorcycle_system` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cylinders` tinyint DEFAULT NULL,
  `insurance_company` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile_beacon` tinyint(1) DEFAULT NULL,
  `heating_ok` tinyint(1) DEFAULT NULL,
  `cooling_ok` tinyint(1) DEFAULT NULL,
  `verified_by` bigint UNSIGNED DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `checklist_note` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personnel_vehicle_asset_checks` (
  `id` bigint UNSIGNED NOT NULL,
  `asset_id` bigint UNSIGNED NOT NULL,
  `checker_id` bigint UNSIGNED NOT NULL,
  `check_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `result` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `check_value` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personnel_vehicle_asset_photos` (
  `id` bigint UNSIGNED NOT NULL,
  `asset_id` bigint UNSIGNED NOT NULL,
  `photo_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_uri` longtext COLLATE utf8mb4_unicode_ci,
  `file_path` text COLLATE utf8mb4_unicode_ci,
  `crop_json` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personnel_vehicle_assignments` (
  `user_id` bigint UNSIGNED NOT NULL,
  `asset_type` enum('car','motorcycle') COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_by` bigint UNSIGNED DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personnel_vehicle_checklist_history` (
  `id` bigint UNSIGNED NOT NULL,
  `asset_id` bigint UNSIGNED NOT NULL,
  `checker_id` bigint UNSIGNED NOT NULL,
  `result` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `checks_json` longtext COLLATE utf8mb4_unicode_ci,
  `checked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `plate_scan_samples` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `vehicle_id` int DEFAULT NULL,
  `original_image_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `crop_image_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detected_plate` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `corrected_plate` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detected_digits_2` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detected_digits_3` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `corrected_digits_2` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `corrected_digits_3` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fixed_letter` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ت',
  `region_code` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '12',
  `confidence` decimal(5,2) DEFAULT NULL,
  `ocr_source` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raw_text` text COLLATE utf8mb4_unicode_ci,
  `status` enum('verified','pending','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'verified',
  `review_note` text COLLATE utf8mb4_unicode_ci,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `exported_at` datetime DEFAULT NULL,
  `client_time` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `presence_checks` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `slot` varchar(5) NOT NULL,
  `slot_date` date NOT NULL,
  `selfie` mediumtext,
  `vehicles_photo` mediumtext,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `captured_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `selfie_path` varchar(255) DEFAULT NULL,
  `vehicles_photo_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `presence_immediate_requests` (
  `id` bigint UNSIGNED NOT NULL,
  `request_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_by` int NOT NULL,
  `scope_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int DEFAULT NULL,
  `target_count` int NOT NULL DEFAULT '0',
  `sent_count` int NOT NULL DEFAULT '0',
  `target_ids` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `presence_random_schedules` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` int NOT NULL,
  `attendance_id` bigint UNSIGNED NOT NULL,
  `checkin_at` datetime NOT NULL,
  `schedule_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `print_templates` (
  `id` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `html` mediumtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `push_tokens` (
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `platform` varchar(20) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `radio_channels` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `current_speaker_id` int DEFAULT NULL,
  `lock_until` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `channel_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'custom',
  `match_mode` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OR',
  `max_talk_ms` int UNSIGNED NOT NULL DEFAULT '25000',
  `priority` int NOT NULL DEFAULT '0',
  `min_talk_ms` int UNSIGNED NOT NULL DEFAULT '1500'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `radio_channel_regions` (
  `channel_id` int UNSIGNED NOT NULL,
  `region_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `radio_channel_roles` (
  `channel_id` int UNSIGNED NOT NULL,
  `role_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `radio_channel_users` (
  `channel_id` int UNSIGNED NOT NULL,
  `user_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `radio_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `channel_id` int UNSIGNED DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `event_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta_json` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `radio_messages` (
  `id` bigint UNSIGNED NOT NULL,
  `channel_id` int UNSIGNED NOT NULL,
  `sender_id` int NOT NULL,
  `sender_name` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `audio_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'audio/mp4',
  `duration_ms` int UNSIGNED NOT NULL DEFAULT '0',
  `bytes_size` int UNSIGNED NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `radio_presence` (
  `channel_id` int UNSIGNED NOT NULL,
  `user_id` int NOT NULL,
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `radio_user_settings` (
  `user_id` int NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `channel_id` int UNSIGNED DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `listen_all` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `refresh_tokens` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `device_id` varchar(255) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `reports` (
  `id` int NOT NULL,
  `sender_id` int NOT NULL,
  `subject` varchar(300) DEFAULT NULL,
  `body` text,
  `status` varchar(20) NOT NULL DEFAULT 'sent',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_data` mediumtext,
  `attachment_path` varchar(255) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `priority` varchar(20) NOT NULL DEFAULT 'normal',
  `read_at` datetime DEFAULT NULL,
  `read_by` int DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `rejected_by` int DEFAULT NULL,
  `reject_reason` text,
  `confidential_history` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `report_archives` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `report_attachments` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `thumbnail_path` varchar(255) DEFAULT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `report_audit` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `actor_id` int NOT NULL,
  `action` varchar(40) NOT NULL,
  `note` text,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `report_audit_logs` (
  `id` bigint NOT NULL,
  `report_id` bigint NOT NULL,
  `actor_id` bigint DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `report_cc` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `added_by` int NOT NULL,
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `report_deletions` (
  `report_id` int NOT NULL,
  `user_id` int NOT NULL,
  `reason` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `report_edits` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `editor_id` int NOT NULL,
  `old_subject` text,
  `old_body` mediumtext,
  `new_subject` text,
  `new_body` mediumtext,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `report_reads` (
  `report_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `report_routes` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `to_user_id` int DEFAULT NULL,
  `action` varchar(20) NOT NULL,
  `note` text,
  `actor_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `report_subjects` (
  `id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `requests` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` varchar(20) NOT NULL,
  `unit` varchar(8) DEFAULT NULL,
  `from_jdate` varchar(10) DEFAULT NULL,
  `to_jdate` varchar(10) DEFAULT NULL,
  `the_date` varchar(10) DEFAULT NULL,
  `from_time` varchar(5) DEFAULT NULL,
  `to_time` varchar(5) DEFAULT NULL,
  `manual_kind` varchar(6) DEFAULT NULL,
  `in_time` varchar(5) DEFAULT NULL,
  `out_time` varchar(5) DEFAULT NULL,
  `minutes` int DEFAULT NULL,
  `reason` text,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_data` longtext,
  `selfie_data` longtext,
  `status` varchar(10) NOT NULL DEFAULT 'pending',
  `approver_id` int DEFAULT NULL,
  `approver_note` text,
  `decided_at` datetime DEFAULT NULL,
  `pending_on` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `substitute_user_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `title` varchar(100) NOT NULL,
  `level` int NOT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `is_substitute` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `role_score_coefficients` (
  `role_key` varchar(40) NOT NULL,
  `coefficient` decimal(5,2) NOT NULL DEFAULT '1.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `role_work_rules` (
  `id` int NOT NULL,
  `role_key` varchar(80) NOT NULL,
  `title` varchar(120) DEFAULT NULL,
  `duty_minutes` int NOT NULL DEFAULT '453',
  `overtime_limit_minutes` int NOT NULL DEFAULT '27',
  `surplus_after_minutes` int NOT NULL DEFAULT '480',
  `night_start` time NOT NULL DEFAULT '22:00:00',
  `night_end` time NOT NULL DEFAULT '06:00:00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `include_friday_in_duty` tinyint(1) NOT NULL DEFAULT '0',
  `include_holiday_in_duty` tinyint(1) NOT NULL DEFAULT '0',
  `max_open_session_minutes` int NOT NULL DEFAULT '960',
  `auto_close_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `auto_close_after_minutes` int NOT NULL DEFAULT '0',
  `checkout_grace_minutes` int NOT NULL DEFAULT '15',
  `auto_shift_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `checkin_any_time` tinyint(1) NOT NULL DEFAULT '1',
  `allowed_checkin_from` time DEFAULT NULL,
  `allowed_checkin_to` time DEFAULT NULL,
  `warn_before_overtime_cap_minutes` int NOT NULL DEFAULT '15',
  `require_checkout_after_cap` tinyint(1) NOT NULL DEFAULT '0',
  `night_calc` tinyint(1) NOT NULL DEFAULT '1',
  `friday_calc` tinyint(1) NOT NULL DEFAULT '1',
  `holiday_calc` tinyint(1) NOT NULL DEFAULT '1',
  `description` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `salary_slips` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `jmonth` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_companies` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ceo_mobile` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `landline_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `declared_school_count` int NOT NULL DEFAULT '0',
  `registered_school_count` int NOT NULL DEFAULT '0',
  `representative_count` int NOT NULL DEFAULT '0',
  `profile_completed` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `manager_mobile` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'فعال',
  `profile_complete` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_districts` (
  `id` int NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_district_boundaries` (
  `district_id` int NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `points_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_import_logs` (
  `id` bigint NOT NULL,
  `user_id` int DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companies_count` int NOT NULL DEFAULT '0',
  `schools_count` int NOT NULL DEFAULT '0',
  `mappings_count` int NOT NULL DEFAULT '0',
  `errors_count` int NOT NULL DEFAULT '0',
  `errors_text` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_inspections` (
  `id` bigint NOT NULL,
  `inspector_user_id` int NOT NULL,
  `client_uuid` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `educational_district` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  `school_gender` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT 'نامشخص',
  `plate_three` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_letter` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_two` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_region` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iran_code` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ایران',
  `plate_region_code` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_color` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passenger_front_count` int NOT NULL DEFAULT '0',
  `passenger_rear_count` int NOT NULL DEFAULT '0',
  `passenger_count` int NOT NULL DEFAULT '0',
  `driver_gender` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT 'نامشخص',
  `certificate_status` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT 'ارائه نشد',
  `violation_date` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `violation_time` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_text` varchar(700) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_inspection_photos` (
  `id` bigint NOT NULL,
  `inspection_id` bigint NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'image/jpeg',
  `width` int NOT NULL DEFAULT '0',
  `height` int NOT NULL DEFAULT '0',
  `file_size` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_inspection_violations` (
  `inspection_id` bigint NOT NULL,
  `violation_type_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_permissions` (
  `role_id` int NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_create` tinyint(1) NOT NULL DEFAULT '0',
  `can_edit` tinyint(1) NOT NULL DEFAULT '0',
  `can_delete` tinyint(1) NOT NULL DEFAULT '0',
  `can_import` tinyint(1) NOT NULL DEFAULT '0',
  `can_report` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_schools` (
  `id` int NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `educational_district` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(700) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `shift` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `education_level` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_type` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activity_start` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activity_end` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `morning_start` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `morning_end` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afternoon_start` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afternoon_end` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driver_count` int DEFAULT NULL,
  `student_count` int DEFAULT NULL,
  `phone` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `status` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT 'ثبت‌شده',
  `location_registered_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_school_companies` (
  `school_id` int NOT NULL,
  `company_id` int NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_seed_state` (
  `seed_key` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `row_count` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_vehicles` (
  `id` bigint NOT NULL,
  `plate_two` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plate_letter` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plate_three` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plate_region_code` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicle_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_color` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passenger_front_count` int NOT NULL DEFAULT '0',
  `passenger_rear_count` int NOT NULL DEFAULT '0',
  `driver_gender` enum('خانم','آقا','نامشخص') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'نامشخص',
  `certificate_status` enum('معتبر','نامعتبر','ارائه نشد') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ارائه نشد',
  `last_inspection_id` bigint DEFAULT NULL,
  `last_inspection_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_vehicle_colors` (
  `id` int NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_vehicle_types` (
  `id` int NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `school_service_violation_types` (
  `id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `score_rules` (
  `rule_key` varchar(64) NOT NULL,
  `title` varchar(190) NOT NULL,
  `base_points` decimal(6,2) NOT NULL DEFAULT '1.00',
  `is_negative` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `shifts` (
  `id` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `type` varchar(12) NOT NULL DEFAULT 'simple',
  `weekly` json DEFAULT NULL,
  `float_minutes` int DEFAULT NULL,
  `allow_offday` tinyint(1) NOT NULL DEFAULT '0',
  `daily_ot_cap` int DEFAULT NULL,
  `monthly_ot_cap` int DEFAULT NULL,
  `night_calc` tinyint(1) NOT NULL DEFAULT '1',
  `friday_calc` tinyint(1) NOT NULL DEFAULT '1',
  `holiday_calc` tinyint(1) NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `advanced` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `shift_assignment_audit` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `shift_id` int DEFAULT NULL,
  `from_jdate` varchar(10) DEFAULT NULL,
  `to_jdate` varchar(10) DEFAULT NULL,
  `action` varchar(30) NOT NULL,
  `actor_id` int DEFAULT NULL,
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `shift_days` (
  `id` int NOT NULL,
  `shift_id` int NOT NULL,
  `jdate` varchar(10) NOT NULL,
  `segments` json DEFAULT NULL,
  `is_off` tinyint(1) NOT NULL DEFAULT '0',
  `day_config` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `shift_handovers` (
  `id` int NOT NULL,
  `token` varchar(80) NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  `attendance_id` int DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `expires_at` datetime NOT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `sms_contacts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `sms_log` (
  `id` int NOT NULL,
  `to_mobile` varchar(20) NOT NULL,
  `body` text NOT NULL,
  `kind` varchar(30) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `message_id` varchar(40) DEFAULT NULL,
  `sent_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delivery_code` int DEFAULT NULL,
  `delivery_at` datetime DEFAULT NULL,
  `driver_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `staff_attendance` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `line_id` int DEFAULT NULL,
  `check_in` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `check_out` datetime DEFAULT NULL,
  `method` varchar(12) DEFAULT NULL,
  `in_lat` double DEFAULT NULL,
  `in_lng` double DEFAULT NULL,
  `out_lat` double DEFAULT NULL,
  `out_lng` double DEFAULT NULL,
  `auto_closed` tinyint(1) NOT NULL DEFAULT '0',
  `in_station` varchar(150) DEFAULT NULL,
  `out_station` varchar(150) DEFAULT NULL,
  `handover_id` int DEFAULT NULL,
  `calc_json` json DEFAULT NULL,
  `client_check_in` datetime DEFAULT NULL,
  `client_check_out` datetime DEFAULT NULL,
  `client_uuid` varchar(120) DEFAULT NULL,
  `offline_synced` tinyint(1) NOT NULL DEFAULT '0',
  `out_line_id` int DEFAULT NULL,
  `checkout_client_uuid` varchar(120) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `station_exits` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `geofence_id` int DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  `station_name` varchar(150) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `exited_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `station_sign_types` (
  `id` int NOT NULL,
  `title` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subordinate_daily_reviews` (
  `id` bigint NOT NULL,
  `reviewer_id` int NOT NULL,
  `subject_user_id` int NOT NULL,
  `review_date` date NOT NULL,
  `line_id` int DEFAULT NULL,
  `attendance_score` decimal(6,2) NOT NULL DEFAULT '0.00',
  `checklist_score` decimal(6,2) NOT NULL DEFAULT '0.00',
  `notice_score` decimal(6,2) NOT NULL DEFAULT '0.00',
  `coverage_score` decimal(6,2) NOT NULL DEFAULT '0.00',
  `quality_score` decimal(6,2) NOT NULL DEFAULT '0.00',
  `total_score` decimal(7,2) NOT NULL DEFAULT '0.00',
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscription_payments` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `mode` varchar(20) NOT NULL,
  `amount` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `invoice_payload` varchar(255) NOT NULL,
  `provider_transaction_id` varchar(190) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `raw_payload` longtext,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `substitute_assignments` (
  `id` int NOT NULL,
  `substitute_user_id` int NOT NULL,
  `request_id` int NOT NULL,
  `absent_user_id` int NOT NULL,
  `from_date` varchar(10) NOT NULL,
  `to_date` varchar(10) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `system_health_checks` (
  `id` bigint NOT NULL,
  `check_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ok',
  `message` text COLLATE utf8mb4_unicode_ci,
  `meta` json DEFAULT NULL,
  `checked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_health_incidents` (
  `id` bigint NOT NULL,
  `check_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `meta` json DEFAULT NULL,
  `first_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` bigint DEFAULT NULL,
  `resolution_note` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_health_logs` (
  `id` bigint NOT NULL,
  `level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `source` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `context` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_outages` (
  `id` int NOT NULL,
  `line_id` int NOT NULL,
  `reported_by` int DEFAULT NULL,
  `outage_date` varchar(10) NOT NULL,
  `start_time` varchar(5) NOT NULL,
  `end_time` varchar(5) DEFAULT NULL,
  `minutes` int DEFAULT NULL,
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reason` varchar(190) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `temp_line_drivers` (
  `id` int NOT NULL,
  `driver_id` int NOT NULL,
  `line_id` int NOT NULL,
  `line_code_in_line` varchar(50) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `added_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `temp_line_driver_history` (
  `id` int NOT NULL,
  `action` varchar(30) NOT NULL,
  `temp_line_driver_id` int DEFAULT NULL,
  `driver_id` int DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `token_blacklist` (
  `id` bigint NOT NULL,
  `jti` varchar(64) NOT NULL,
  `user_id` bigint NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(20) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` int NOT NULL,
  `manager_id` int DEFAULT NULL,
  `zone_id` int DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `must_change_pw` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `email` varchar(190) DEFAULT NULL,
  `photo` mediumtext,
  `signature_data` mediumtext,
  `allow_android` tinyint(1) NOT NULL DEFAULT '1',
  `allow_web` tinyint(1) NOT NULL DEFAULT '1',
  `security_exempt` tinyint(1) NOT NULL DEFAULT '0',
  `marital_status` varchar(20) DEFAULT NULL,
  `address` text,
  `national_code` varchar(10) DEFAULT NULL,
  `children_count` int DEFAULT NULL,
  `profile_done` tinyint(1) NOT NULL DEFAULT '0',
  `pw_changed_at` datetime DEFAULT NULL,
  `photo_taken_at` datetime DEFAULT NULL,
  `presence_required` tinyint(1) NOT NULL DEFAULT '0',
  `reset_code` varchar(10) DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL,
  `seniority_start` varchar(10) DEFAULT NULL,
  `can_send_sms` tinyint(1) NOT NULL DEFAULT '0',
  `birth_date` varchar(10) DEFAULT NULL,
  `device_model` varchar(120) DEFAULT NULL,
  `android_version` varchar(40) DEFAULT NULL,
  `app_version` varchar(30) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `can_be_substitute` tinyint(1) NOT NULL DEFAULT '0',
  `can_welfare` tinyint(1) NOT NULL DEFAULT '0',
  `can_cultural` tinyint(1) NOT NULL DEFAULT '0',
  `work_policy_id` int DEFAULT NULL,
  `leave_balance_start_min` int NOT NULL DEFAULT '0',
  `can_manage_temp_drivers` tinyint(1) NOT NULL DEFAULT '0',
  `personnel_code` varchar(40) DEFAULT NULL,
  `rank_stars` tinyint DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_activity` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `kind` varchar(20) NOT NULL,
  `at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `meta` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_commitments` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `commit_jdate` varchar(10) NOT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_path` varchar(400) DEFAULT NULL,
  `attachment_data` longtext,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reason_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_devices` (
  `user_id` int NOT NULL,
  `device_id` varchar(255) NOT NULL,
  `device_model` varchar(255) DEFAULT NULL,
  `bound_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_lines` (
  `user_id` int NOT NULL,
  `line_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_line_checkin_permissions` (
  `user_id` int NOT NULL,
  `line_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_managers` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `manager_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_mission_overrides` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `period` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_mission_override_targets` (
  `id` bigint NOT NULL,
  `override_id` bigint NOT NULL,
  `metric_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_percent` decimal(6,2) NOT NULL DEFAULT '0.00',
  `weight` decimal(8,2) NOT NULL DEFAULT '1.00',
  `is_required` tinyint(1) NOT NULL DEFAULT '1',
  `minimum_count` int DEFAULT NULL,
  `config` longtext COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_net_state` (
  `user_id` int NOT NULL,
  `vpn_on` tinyint(1) NOT NULL DEFAULT '0',
  `last_ip` varchar(64) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `battery_level` int DEFAULT NULL,
  `battery_charging` tinyint(1) DEFAULT NULL,
  `ip_country` varchar(4) DEFAULT NULL,
  `vpn_started_at` datetime DEFAULT NULL,
  `vpn_duration_seconds` int NOT NULL DEFAULT '0',
  `vpn_detected_by` json DEFAULT NULL,
  `vpn_network_type` varchar(32) DEFAULT NULL,
  `vpn_dns` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_salary_slips` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `period_jy` int NOT NULL,
  `period_jm` tinyint NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_name` varchar(200) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_sessions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `device_type` varchar(10) NOT NULL,
  `device_id` varchar(255) NOT NULL,
  `device_model` varchar(255) DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_shifts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `shift_id` int NOT NULL,
  `from_jdate` varchar(10) DEFAULT NULL,
  `to_jdate` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_station_state` (
  `user_id` int NOT NULL,
  `geofence_id` int DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `outside_count` int NOT NULL DEFAULT '0',
  `last_outside_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_subscriptions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `starts_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `amount` bigint NOT NULL DEFAULT '0',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `payment_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_work_rule_overrides` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(160) DEFAULT NULL,
  `duty_minutes` int DEFAULT NULL,
  `overtime_limit_minutes` int DEFAULT NULL,
  `surplus_after_minutes` int DEFAULT NULL,
  `night_start` time DEFAULT NULL,
  `night_end` time DEFAULT NULL,
  `auto_shift_enabled` tinyint(1) DEFAULT NULL,
  `checkin_any_time` tinyint(1) DEFAULT NULL,
  `allowed_checkin_from` time DEFAULT NULL,
  `allowed_checkin_to` time DEFAULT NULL,
  `warn_before_overtime_cap_minutes` int DEFAULT NULL,
  `require_checkout_after_cap` tinyint(1) DEFAULT NULL,
  `night_calc` tinyint(1) DEFAULT NULL,
  `friday_calc` tinyint(1) DEFAULT NULL,
  `holiday_calc` tinyint(1) DEFAULT NULL,
  `include_friday_in_duty` tinyint(1) DEFAULT NULL,
  `include_holiday_in_duty` tinyint(1) DEFAULT NULL,
  `max_open_session_minutes` int DEFAULT NULL,
  `auto_close_enabled` tinyint(1) DEFAULT NULL,
  `auto_close_after_minutes` int DEFAULT NULL,
  `checkout_grace_minutes` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `vehicles` (
  `id` int NOT NULL,
  `plate` varchar(40) NOT NULL,
  `vin` varchar(60) DEFAULT NULL,
  `chassis` varchar(60) DEFAULT NULL,
  `engine` varchar(60) DEFAULT NULL,
  `model_name` varchar(120) DEFAULT NULL,
  `model_year` varchar(20) DEFAULT NULL,
  `color` varchar(40) DEFAULT NULL,
  `fuel` varchar(40) DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  `owner_national_id` varchar(10) DEFAULT NULL,
  `ownership_type` varchar(60) DEFAULT NULL,
  `tech_inspection_expire` varchar(20) DEFAULT NULL,
  `insurance_expire` varchar(20) DEFAULT NULL,
  `line_text` varchar(200) DEFAULT NULL,
  `beneficiary_national_id` varchar(10) DEFAULT NULL,
  `operating_code` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `vehicle_drivers` (
  `id` int NOT NULL,
  `vehicle_id` int NOT NULL,
  `driver_id` int NOT NULL,
  `role` varchar(20) NOT NULL,
  `shift` varchar(20) DEFAULT NULL,
  `line_code_in_line` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `vpn_events` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `state` tinyint(1) NOT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `country` varchar(4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `vpn_status_reports` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `vpn_on` tinyint(1) NOT NULL DEFAULT '0',
  `event` varchar(24) NOT NULL DEFAULT 'vpn_heartbeat',
  `detected_by` json DEFAULT NULL,
  `tunnel_interfaces` json DEFAULT NULL,
  `dns_servers` json DEFAULT NULL,
  `network_type` varchar(32) DEFAULT NULL,
  `client_public_ip` varchar(64) DEFAULT NULL,
  `server_ip` varchar(64) DEFAULT NULL,
  `ip_country` varchar(4) DEFAULT NULL,
  `sdk_int` int DEFAULT NULL,
  `checked_at` datetime NOT NULL,
  `duration_seconds` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `welfare_grants` (
  `id` int NOT NULL,
  `item_id` int NOT NULL,
  `driver_national_id` varchar(10) NOT NULL,
  `driver_name` varchar(200) DEFAULT NULL,
  `driver_mobile` varchar(20) DEFAULT NULL,
  `count` int NOT NULL DEFAULT '1',
  `note` text,
  `granted_by` int DEFAULT NULL,
  `granted_jdate` varchar(10) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `place_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `welfare_items` (
  `id` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `welfare_places` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `address` varchar(400) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `work_policies` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `apply_time_limit_on_approve` tinyint(1) NOT NULL DEFAULT '0',
  `config` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `zones` (
  `id` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `parent_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
