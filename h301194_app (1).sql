-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 26, 2026 at 05:11 PM
-- Server version: 8.0.46-cll-lve
-- PHP Version: 8.4.24

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `h301194_app`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` bigint NOT NULL,
  `user_id` int DEFAULT NULL,
  `event` varchar(60) NOT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_cache`
--

CREATE TABLE `api_cache` (
  `cache_key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cache_value` mediumtext COLLATE utf8mb4_unicode_ci,
  `expires_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `app_settings`
--

CREATE TABLE `app_settings` (
  `key` varchar(80) NOT NULL,
  `value` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendances`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `attendance_ot_adjustments`
--

CREATE TABLE `attendance_ot_adjustments` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `jdate` varchar(10) NOT NULL,
  `minutes` int NOT NULL DEFAULT '0',
  `reason` text,
  `approved_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_recalculate_logs`
--

CREATE TABLE `attendance_recalculate_logs` (
  `id` bigint NOT NULL,
  `user_id` int DEFAULT NULL,
  `from_jdate` varchar(10) DEFAULT NULL,
  `to_jdate` varchar(10) DEFAULT NULL,
  `rows_count` int NOT NULL DEFAULT '0',
  `actor_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_reject_logs`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `backup_log`
--

CREATE TABLE `backup_log` (
  `id` int NOT NULL,
  `kind` varchar(10) NOT NULL,
  `is_light` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bale_bot_events`
--

CREATE TABLE `bale_bot_events` (
  `id` bigint NOT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_text` text COLLATE utf8mb4_unicode_ci,
  `payload_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bale_chat_sessions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `bale_custom_replies`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `bale_forms`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `bale_form_fields`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `bale_form_submissions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `bale_menu_items`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `bale_message_log`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `bale_subscribers`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `bills`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `checklist_items`
--

CREATE TABLE `checklist_items` (
  `id` int NOT NULL,
  `template_id` int NOT NULL,
  `label` varchar(200) NOT NULL,
  `sort_order` int DEFAULT '0',
  `options` json DEFAULT NULL,
  `answer_type` varchar(20) DEFAULT 'single'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `checklist_submissions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `checklist_templates`
--

CREATE TABLE `checklist_templates` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `commitment_reasons`
--

CREATE TABLE `commitment_reasons` (
  `id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company_card_payments`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `company_requests`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `company_request_files`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `company_request_logs`
--

CREATE TABLE `company_request_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `request_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `action` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company_request_payments`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `company_request_settings`
--

CREATE TABLE `company_request_settings` (
  `setting_key` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` longtext COLLATE utf8mb4_unicode_ci,
  `updated_by` bigint DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company_request_types`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `covert_selfies`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `covert_selfie_commands`
--

CREATE TABLE `covert_selfie_commands` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `issued_by` int NOT NULL,
  `reason` varchar(50) DEFAULT 'manual',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `covert_selfie_requests`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `cron_run_log`
--

CREATE TABLE `cron_run_log` (
  `cron_key` varchar(40) NOT NULL,
  `last_run_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_status` varchar(10) NOT NULL DEFAULT 'ok',
  `last_message` text,
  `run_count` int NOT NULL DEFAULT '0',
  `last_source` varchar(10) NOT NULL DEFAULT 'cli'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cultural_activities`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `cultural_places`
--

CREATE TABLE `cultural_places` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `address` varchar(400) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cultural_types`
--

CREATE TABLE `cultural_types` (
  `id` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `custom_fields`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `custom_field_values`
--

CREATE TABLE `custom_field_values` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `field_id` int NOT NULL,
  `value` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `custom_forms`
--

CREATE TABLE `custom_forms` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `schema` json NOT NULL,
  `is_active` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `delivery_dead_letters`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `delivery_queue`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `device_status_periods`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `drivers`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `field_alert_preferences`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `form_submissions`
--

CREATE TABLE `form_submissions` (
  `id` int NOT NULL,
  `form_id` int NOT NULL,
  `user_id` int NOT NULL,
  `driver_id` int DEFAULT NULL,
  `answers` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `geofences`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `group_subscriptions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `holidays`
--

CREATE TABLE `holidays` (
  `id` int NOT NULL,
  `jdate` varchar(10) NOT NULL,
  `title` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inspector_modes`
--

CREATE TABLE `inspector_modes` (
  `user_id` int NOT NULL,
  `mode` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_item_types`
--

CREATE TABLE `inventory_item_types` (
  `id` int NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_transfers`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `leave_blocked_dates`
--

CREATE TABLE `leave_blocked_dates` (
  `id` int NOT NULL,
  `jdate` varchar(10) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lines`
--

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
  `location_updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `line_idents`
--

CREATE TABLE `line_idents` (
  `id` int NOT NULL,
  `line_id` int NOT NULL,
  `kind` varchar(10) NOT NULL,
  `value` varchar(190) NOT NULL,
  `label` varchar(120) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `line_location_permissions`
--

CREATE TABLE `line_location_permissions` (
  `id` int NOT NULL,
  `role_id` int NOT NULL,
  `can_capture` tinyint(1) NOT NULL DEFAULT '0',
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_manage` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `line_score_coefficients`
--

CREATE TABLE `line_score_coefficients` (
  `line_id` int NOT NULL,
  `coefficient` decimal(5,2) NOT NULL DEFAULT '1.00',
  `note` varchar(190) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `line_station_locations`
--

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
  `station_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registered'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `line_station_signs`
--

CREATE TABLE `line_station_signs` (
  `id` bigint NOT NULL,
  `station_location_id` bigint NOT NULL,
  `sign_type_id` int NOT NULL,
  `photo_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `line_visit_reports`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `location_pings`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `login_ip_attempts`
--

CREATE TABLE `login_ip_attempts` (
  `id` int NOT NULL,
  `ip` varchar(64) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `login_otp`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `message_recipients`
--

CREATE TABLE `message_recipients` (
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messenger_bot_events`
--

CREATE TABLE `messenger_bot_events` (
  `id` bigint NOT NULL,
  `platform` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chat_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_text` text COLLATE utf8mb4_unicode_ci,
  `payload_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messenger_chat_sessions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `messenger_form_submissions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `messenger_message_log`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `messenger_subscribers`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mission_badges`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mission_daily_progress`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mission_execution_settings`
--

CREATE TABLE `mission_execution_settings` (
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mission_metric_catalog`
--

CREATE TABLE `mission_metric_catalog` (
  `metric_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percent',
  `applicable_roles` longtext COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mission_score_adjustments`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mission_score_daily`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mission_templates`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mission_template_targets`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mission_timeline_events`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mission_visit_sessions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mobile_device_health`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mobile_device_health_latest`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `mobile_error_logs`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `notices`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `notice_reasons`
--

CREATE TABLE `notice_reasons` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `body` text,
  `data` json DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `official_visits`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `offline_sync_audit`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `offline_sync_logs`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `payroll_base`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `plate_scan_samples`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `presence_checks`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `print_templates`
--

CREATE TABLE `print_templates` (
  `id` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `html` mediumtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `push_tokens`
--

CREATE TABLE `push_tokens` (
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `platform` varchar(20) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `device_id` varchar(255) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `report_archives`
--

CREATE TABLE `report_archives` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_attachments`
--

CREATE TABLE `report_attachments` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `thumbnail_path` varchar(255) DEFAULT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_audit`
--

CREATE TABLE `report_audit` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `actor_id` int NOT NULL,
  `action` varchar(40) NOT NULL,
  `note` text,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_audit_logs`
--

CREATE TABLE `report_audit_logs` (
  `id` bigint NOT NULL,
  `report_id` bigint NOT NULL,
  `actor_id` bigint DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_cc`
--

CREATE TABLE `report_cc` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `added_by` int NOT NULL,
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_deletions`
--

CREATE TABLE `report_deletions` (
  `report_id` int NOT NULL,
  `user_id` int NOT NULL,
  `reason` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_edits`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `report_reads`
--

CREATE TABLE `report_reads` (
  `report_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_routes`
--

CREATE TABLE `report_routes` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `to_user_id` int DEFAULT NULL,
  `action` varchar(20) NOT NULL,
  `note` text,
  `actor_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_subjects`
--

CREATE TABLE `report_subjects` (
  `id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `requests`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `title` varchar(100) NOT NULL,
  `level` int NOT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `is_substitute` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role_score_coefficients`
--

CREATE TABLE `role_score_coefficients` (
  `role_key` varchar(40) NOT NULL,
  `coefficient` decimal(5,2) NOT NULL DEFAULT '1.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role_work_rules`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `salary_slips`
--

CREATE TABLE `salary_slips` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `jmonth` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `score_rules`
--

CREATE TABLE `score_rules` (
  `rule_key` varchar(64) NOT NULL,
  `title` varchar(190) NOT NULL,
  `base_points` decimal(6,2) NOT NULL DEFAULT '1.00',
  `is_negative` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shifts`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `shift_assignment_audit`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `shift_days`
--

CREATE TABLE `shift_days` (
  `id` int NOT NULL,
  `shift_id` int NOT NULL,
  `jdate` varchar(10) NOT NULL,
  `segments` json DEFAULT NULL,
  `is_off` tinyint(1) NOT NULL DEFAULT '0',
  `day_config` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shift_handovers`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `sms_contacts`
--

CREATE TABLE `sms_contacts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sms_log`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `staff_attendance`
--

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
  `offline_synced` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `station_exits`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `station_sign_types`
--

CREATE TABLE `station_sign_types` (
  `id` int NOT NULL,
  `title` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subordinate_daily_reviews`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `subscription_payments`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `substitute_assignments`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `system_health_checks`
--

CREATE TABLE `system_health_checks` (
  `id` bigint NOT NULL,
  `check_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ok',
  `message` text COLLATE utf8mb4_unicode_ci,
  `meta` json DEFAULT NULL,
  `checked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_health_incidents`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `system_health_logs`
--

CREATE TABLE `system_health_logs` (
  `id` bigint NOT NULL,
  `level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `source` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `context` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_outages`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `temp_line_drivers`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `temp_line_driver_history`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `token_blacklist`
--

CREATE TABLE `token_blacklist` (
  `id` bigint NOT NULL,
  `jti` varchar(64) NOT NULL,
  `user_id` bigint NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

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
  `rank_stars` tinyint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_activity`
--

CREATE TABLE `user_activity` (
  `id` bigint NOT NULL,
  `user_id` int NOT NULL,
  `kind` varchar(20) NOT NULL,
  `at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `meta` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_commitments`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `user_devices`
--

CREATE TABLE `user_devices` (
  `user_id` int NOT NULL,
  `device_id` varchar(255) NOT NULL,
  `device_model` varchar(255) DEFAULT NULL,
  `bound_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_lines`
--

CREATE TABLE `user_lines` (
  `user_id` int NOT NULL,
  `line_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_managers`
--

CREATE TABLE `user_managers` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `manager_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_mission_overrides`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `user_mission_override_targets`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `user_net_state`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `user_salary_slips`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `device_type` varchar(10) NOT NULL,
  `device_id` varchar(255) NOT NULL,
  `device_model` varchar(255) DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_shifts`
--

CREATE TABLE `user_shifts` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `shift_id` int NOT NULL,
  `from_jdate` varchar(10) DEFAULT NULL,
  `to_jdate` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_station_state`
--

CREATE TABLE `user_station_state` (
  `user_id` int NOT NULL,
  `geofence_id` int DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `outside_count` int NOT NULL DEFAULT '0',
  `last_outside_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_subscriptions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `user_work_rule_overrides`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `vehicles`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_drivers`
--

CREATE TABLE `vehicle_drivers` (
  `id` int NOT NULL,
  `vehicle_id` int NOT NULL,
  `driver_id` int NOT NULL,
  `role` varchar(20) NOT NULL,
  `shift` varchar(20) DEFAULT NULL,
  `line_code_in_line` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vpn_events`
--

CREATE TABLE `vpn_events` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `state` tinyint(1) NOT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `country` varchar(4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vpn_status_reports`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `welfare_grants`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `welfare_items`
--

CREATE TABLE `welfare_items` (
  `id` int NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `welfare_places`
--

CREATE TABLE `welfare_places` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `address` varchar(400) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_policies`
--

CREATE TABLE `work_policies` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `apply_time_limit_on_approve` tinyint(1) NOT NULL DEFAULT '0',
  `config` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `zones`
--

CREATE TABLE `zones` (
  `id` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `parent_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_logs_user_event_created` (`user_id`,`event`,`created_at`);

--
-- Indexes for table `api_cache`
--
ALTER TABLE `api_cache`
  ADD PRIMARY KEY (`cache_key`),
  ADD KEY `idx_api_cache_exp` (`expires_at`);

--
-- Indexes for table `app_settings`
--
ALTER TABLE `app_settings`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `attendances`
--
ALTER TABLE `attendances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_att` (`driver_id`,`created_at`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_driver` (`driver_id`),
  ADD KEY `idx_att_user_created_exit` (`user_id`,`created_at`,`exit_at`),
  ADD KEY `idx_att_user_date` (`user_id`,`created_at`),
  ADD KEY `idx_att_driver_date` (`driver_id`,`created_at`);

--
-- Indexes for table `attendance_ot_adjustments`
--
ALTER TABLE `attendance_ot_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_att_adj` (`user_id`,`jdate`),
  ADD KEY `idx_att_adj_user` (`user_id`,`jdate`);

--
-- Indexes for table `attendance_recalculate_logs`
--
ALTER TABLE `attendance_recalculate_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_recalc_user_time` (`user_id`,`created_at`);

--
-- Indexes for table `attendance_reject_logs`
--
ALTER TABLE `attendance_reject_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_arl_user_time` (`user_id`,`created_at`),
  ADD KEY `idx_arl_line_time` (`line_id`,`created_at`),
  ADD KEY `idx_arl_created` (`created_at`);

--
-- Indexes for table `backup_log`
--
ALTER TABLE `backup_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bale_bot_events`
--
ALTER TABLE `bale_bot_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bale_event_type` (`event_type`,`created_at`),
  ADD KEY `idx_bale_event_chat` (`chat_id`,`created_at`);

--
-- Indexes for table `bale_chat_sessions`
--
ALTER TABLE `bale_chat_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chat_id` (`chat_id`),
  ADD KEY `idx_bale_session_action` (`action`,`updated_at`);

--
-- Indexes for table `bale_custom_replies`
--
ALTER TABLE `bale_custom_replies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bale_reply_active` (`is_active`,`sort_order`),
  ADD KEY `idx_bale_custom_replies_platform` (`platform`,`is_active`,`sort_order`);

--
-- Indexes for table `bale_forms`
--
ALTER TABLE `bale_forms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bale_form_active` (`is_active`,`sort_order`),
  ADD KEY `idx_bale_forms_platform` (`platform`,`is_active`,`sort_order`);

--
-- Indexes for table `bale_form_fields`
--
ALTER TABLE `bale_form_fields`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_bale_field` (`form_id`,`field_key`),
  ADD KEY `idx_bale_field_form` (`form_id`,`sort_order`);

--
-- Indexes for table `bale_form_submissions`
--
ALTER TABLE `bale_form_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bale_sub_form` (`form_id`,`created_at`),
  ADD KEY `idx_bale_sub_status` (`status`,`created_at`),
  ADD KEY `idx_bale_sub_driver` (`driver_id`),
  ADD KEY `idx_bale_sub_user` (`user_id`);

--
-- Indexes for table `bale_menu_items`
--
ALTER TABLE `bale_menu_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bale_menu_active` (`is_active`,`sort_order`),
  ADD KEY `idx_bale_menu_items_platform` (`platform`,`is_active`,`sort_order`);

--
-- Indexes for table `bale_message_log`
--
ALTER TABLE `bale_message_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bale_log_created` (`created_at`),
  ADD KEY `idx_bale_log_target` (`target_type`,`target_id`);

--
-- Indexes for table `bale_subscribers`
--
ALTER TABLE `bale_subscribers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chat_id` (`chat_id`),
  ADD KEY `idx_bale_mobile` (`mobile`),
  ADD KEY `idx_bale_user` (`user_id`),
  ADD KEY `idx_bale_driver` (`driver_id`);

--
-- Indexes for table `bills`
--
ALTER TABLE `bills`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_bill` (`bill_id`),
  ADD KEY `national_id` (`national_id`),
  ADD KEY `plate` (`plate`),
  ADD KEY `status` (`status`),
  ADD KEY `driver_id` (`driver_id`);

--
-- Indexes for table `checklist_items`
--
ALTER TABLE `checklist_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `checklist_submissions`
--
ALTER TABLE `checklist_submissions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `checklist_templates`
--
ALTER TABLE `checklist_templates`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `commitment_reasons`
--
ALTER TABLE `commitment_reasons`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `company_card_payments`
--
ALTER TABLE `company_card_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_company_card_tracking` (`tracking_number`),
  ADD UNIQUE KEY `uq_company_card_payment` (`payment_id`),
  ADD KEY `idx_company_card_request` (`request_id`,`status`,`created_at`),
  ADD KEY `idx_company_card_status` (`status`,`created_at`);

--
-- Indexes for table `company_requests`
--
ALTER TABLE `company_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tracking_code` (`tracking_code`),
  ADD KEY `idx_company_req_user` (`user_id`,`created_at`),
  ADD KEY `idx_company_req_status` (`status`,`created_at`),
  ADD KEY `idx_company_req_type` (`request_type_id`,`created_at`),
  ADD KEY `idx_company_req_due` (`due_at`,`status`);

--
-- Indexes for table `company_request_files`
--
ALTER TABLE `company_request_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_company_req_files` (`request_id`,`document_type`),
  ADD KEY `idx_company_file_hash` (`request_id`,`sha256`),
  ADD KEY `idx_company_request_files_sha256` (`sha256`);

--
-- Indexes for table `company_request_logs`
--
ALTER TABLE `company_request_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_company_logs_request` (`request_id`,`created_at`);

--
-- Indexes for table `company_request_payments`
--
ALTER TABLE `company_request_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_company_payment_payload` (`invoice_payload`),
  ADD KEY `idx_company_payment_request` (`request_id`,`created_at`),
  ADD KEY `idx_company_payment_status` (`status`,`created_at`);

--
-- Indexes for table `company_request_settings`
--
ALTER TABLE `company_request_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indexes for table `company_request_types`
--
ALTER TABLE `company_request_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `covert_selfies`
--
ALTER TABLE `covert_selfies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cs_user` (`user_id`,`created_at`);

--
-- Indexes for table `covert_selfie_commands`
--
ALTER TABLE `covert_selfie_commands`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cmd_user` (`user_id`,`delivered_at`);

--
-- Indexes for table `covert_selfie_requests`
--
ALTER TABLE `covert_selfie_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cron_run_log`
--
ALTER TABLE `cron_run_log`
  ADD PRIMARY KEY (`cron_key`);

--
-- Indexes for table `cultural_activities`
--
ALTER TABLE `cultural_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ca_nid` (`driver_national_id`),
  ADD KEY `idx_ca_type` (`type_id`),
  ADD KEY `idx_ca_date` (`activity_jdate`),
  ADD KEY `idx_ca_recorded_time` (`recorded_by`,`created_at`);

--
-- Indexes for table `cultural_places`
--
ALTER TABLE `cultural_places`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cultural_types`
--
ALTER TABLE `cultural_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `custom_fields`
--
ALTER TABLE `custom_fields`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cf_key` (`fkey`);

--
-- Indexes for table `custom_field_values`
--
ALTER TABLE `custom_field_values`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cfv` (`user_id`,`field_id`);

--
-- Indexes for table `custom_forms`
--
ALTER TABLE `custom_forms`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `delivery_dead_letters`
--
ALTER TABLE `delivery_dead_letters`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dead_channel_time` (`channel`,`failed_at`),
  ADD KEY `idx_dead_target` (`target_type`,`target_id`);

--
-- Indexes for table `delivery_queue`
--
ALTER TABLE `delivery_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_delivery_status_next` (`status`,`next_attempt_at`),
  ADD KEY `idx_delivery_target` (`target_type`,`target_id`),
  ADD KEY `idx_delivery_channel` (`channel`);

--
-- Indexes for table `device_status_periods`
--
ALTER TABLE `device_status_periods`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dsp_user_type_start` (`user_id`,`status_type`,`started_at`),
  ADD KEY `idx_dsp_open` (`user_id`,`status_type`,`ended_at`),
  ADD KEY `idx_dsp_started` (`started_at`);

--
-- Indexes for table `drivers`
--
ALTER TABLE `drivers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `national_id` (`national_id`),
  ADD KEY `last_name` (`last_name`),
  ADD KEY `idx_drivers_national_id` (`national_id`);

--
-- Indexes for table `field_alert_preferences`
--
ALTER TABLE `field_alert_preferences`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `idx_fap_enabled_muted` (`enabled`,`muted`);

--
-- Indexes for table `form_submissions`
--
ALTER TABLE `form_submissions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `geofences`
--
ALTER TABLE `geofences`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `group_subscriptions`
--
ALTER TABLE `group_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expires_at` (`expires_at`);

--
-- Indexes for table `holidays`
--
ALTER TABLE `holidays`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `jdate` (`jdate`);

--
-- Indexes for table `inspector_modes`
--
ALTER TABLE `inspector_modes`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `inventory_item_types`
--
ALTER TABLE `inventory_item_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory_transfers`
--
ALTER TABLE `inventory_transfers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_it_item` (`item_type_id`),
  ADD KEY `idx_it_from` (`from_user_id`),
  ADD KEY `idx_it_to` (`to_user_id`),
  ADD KEY `idx_it_status` (`status`);

--
-- Indexes for table `leave_blocked_dates`
--
ALTER TABLE `leave_blocked_dates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `jdate` (`jdate`);

--
-- Indexes for table `lines`
--
ALTER TABLE `lines`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `line_idents`
--
ALTER TABLE `line_idents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_li_line` (`line_id`),
  ADD KEY `idx_li_val` (`kind`,`value`);

--
-- Indexes for table `line_location_permissions`
--
ALTER TABLE `line_location_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_llp_role` (`role_id`);

--
-- Indexes for table `line_score_coefficients`
--
ALTER TABLE `line_score_coefficients`
  ADD PRIMARY KEY (`line_id`);

--
-- Indexes for table `line_station_locations`
--
ALTER TABLE `line_station_locations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lsl_line` (`line_id`),
  ADD KEY `idx_lsl_captured` (`captured_by`,`captured_at`);

--
-- Indexes for table `line_station_signs`
--
ALTER TABLE `line_station_signs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_station` (`station_location_id`),
  ADD KEY `idx_type` (`sign_type_id`);

--
-- Indexes for table `line_visit_reports`
--
ALTER TABLE `line_visit_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lvr_user_date` (`user_id`,`started_at`),
  ADD KEY `idx_lvr_line_date` (`line_id`,`started_at`),
  ADD KEY `idx_lvr_type_date` (`visit_type`,`started_at`);

--
-- Indexes for table `location_pings`
--
ALTER TABLE `location_pings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ping` (`user_id`,`captured_at`),
  ADD KEY `idx_user_captured` (`user_id`,`captured_at`),
  ADD KEY `idx_lp_received` (`received_at`),
  ADD KEY `idx_location_pings_user_captured` (`user_id`,`captured_at`);

--
-- Indexes for table `login_ip_attempts`
--
ALTER TABLE `login_ip_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lia_ip_time` (`ip`,`created_at`);

--
-- Indexes for table `login_otp`
--
ALTER TABLE `login_otp`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_login_otp_mobile` (`mobile`,`created_at`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `message_recipients`
--
ALTER TABLE `message_recipients`
  ADD PRIMARY KEY (`message_id`,`user_id`),
  ADD KEY `idx_mr_user` (`user_id`,`read_at`);

--
-- Indexes for table `messenger_bot_events`
--
ALTER TABLE `messenger_bot_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_messenger_event_platform` (`platform`,`created_at`),
  ADD KEY `idx_messenger_event_type` (`platform`,`event_type`,`created_at`),
  ADD KEY `idx_messenger_event_chat` (`platform`,`chat_id`,`created_at`);

--
-- Indexes for table `messenger_chat_sessions`
--
ALTER TABLE `messenger_chat_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_messenger_session` (`platform`,`chat_id`),
  ADD KEY `idx_messenger_session_action` (`platform`,`action`,`updated_at`);

--
-- Indexes for table `messenger_form_submissions`
--
ALTER TABLE `messenger_form_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_messenger_sub_platform` (`platform`,`created_at`),
  ADD KEY `idx_messenger_sub_form` (`platform`,`form_id`,`created_at`),
  ADD KEY `idx_messenger_sub_status` (`platform`,`status`,`created_at`),
  ADD KEY `idx_messenger_sub_driver` (`platform`,`driver_id`),
  ADD KEY `idx_messenger_sub_user` (`platform`,`user_id`);

--
-- Indexes for table `messenger_message_log`
--
ALTER TABLE `messenger_message_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_messenger_msg_platform` (`platform`,`created_at`),
  ADD KEY `idx_messenger_msg_target` (`platform`,`target_type`,`target_id`),
  ADD KEY `idx_messenger_msg_status` (`platform`,`status`,`created_at`);

--
-- Indexes for table `messenger_subscribers`
--
ALTER TABLE `messenger_subscribers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_messenger_chat` (`platform`,`chat_id`),
  ADD KEY `idx_messenger_mobile` (`platform`,`mobile`),
  ADD KEY `idx_messenger_user` (`platform`,`user_id`),
  ADD KEY `idx_messenger_driver` (`platform`,`driver_id`);

--
-- Indexes for table `mission_badges`
--
ALTER TABLE `mission_badges`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_badge` (`user_id`,`badge_key`,`period_type`,`period_key`);

--
-- Indexes for table `mission_daily_progress`
--
ALTER TABLE `mission_daily_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_mdp_user_date` (`user_id`,`progress_date`),
  ADD KEY `idx_mdp_date_role` (`progress_date`,`role_key`);

--
-- Indexes for table `mission_execution_settings`
--
ALTER TABLE `mission_execution_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indexes for table `mission_metric_catalog`
--
ALTER TABLE `mission_metric_catalog`
  ADD PRIMARY KEY (`metric_key`);

--
-- Indexes for table `mission_score_adjustments`
--
ALTER TABLE `mission_score_adjustments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `mission_score_daily`
--
ALTER TABLE `mission_score_daily`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_date_rule` (`user_id`,`score_date`,`rule_key`);

--
-- Indexes for table `mission_templates`
--
ALTER TABLE `mission_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mission_templates_role_period` (`role_key`,`period`,`is_active`);

--
-- Indexes for table `mission_template_targets`
--
ALTER TABLE `mission_template_targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_mission_template_metric` (`template_id`,`metric_key`),
  ADD KEY `idx_mtt_template` (`template_id`),
  ADD KEY `idx_mtt_metric` (`metric_key`);

--
-- Indexes for table `mission_timeline_events`
--
ALTER TABLE `mission_timeline_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mte_user_occurred` (`user_id`,`occurred_at`),
  ADD KEY `idx_mte_line_occurred` (`line_id`,`occurred_at`),
  ADD KEY `idx_mte_visit` (`visit_session_id`),
  ADD KEY `idx_mte_event_type` (`event_type`);

--
-- Indexes for table `mission_visit_sessions`
--
ALTER TABLE `mission_visit_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_mvs_open_user_line` (`open_visit_key`),
  ADD KEY `idx_mvs_user_started` (`user_id`,`started_at`),
  ADD KEY `idx_mvs_line_started` (`line_id`,`started_at`),
  ADD KEY `idx_mvs_status` (`status`),
  ADD KEY `idx_mvs_day_status` (`user_id`,`line_id`,`started_at`,`status`);

--
-- Indexes for table `mobile_device_health`
--
ALTER TABLE `mobile_device_health`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_mdh_user_device_time` (`user_id`,`device_key`,`captured_at`),
  ADD KEY `idx_mdh_user_time` (`user_id`,`captured_at`),
  ADD KEY `idx_mdh_health` (`api_ok`,`network_connected`,`captured_at`),
  ADD KEY `idx_mdh_version` (`app_version`,`android_sdk`,`captured_at`);

--
-- Indexes for table `mobile_device_health_latest`
--
ALTER TABLE `mobile_device_health_latest`
  ADD PRIMARY KEY (`user_id`,`device_key`),
  ADD KEY `idx_mdhl_time` (`captured_at`),
  ADD KEY `idx_mdhl_alert` (`api_ok`,`network_connected`,`battery_level`,`captured_at`);

--
-- Indexes for table `mobile_error_logs`
--
ALTER TABLE `mobile_error_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mobile_error_user_time` (`user_id`,`created_at`),
  ADD KEY `idx_mobile_error_app` (`app_version`,`created_at`);

--
-- Indexes for table `notices`
--
ALTER TABLE `notices`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notice_reasons`
--
ALTER TABLE `notice_reasons`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notif` (`user_id`,`is_read`,`created_at`),
  ADD KEY `idx_notifications_user_read_created` (`user_id`,`is_read`,`created_at`);

--
-- Indexes for table `official_visits`
--
ALTER TABLE `official_visits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ov` (`official_id`,`created_at`),
  ADD KEY `idx_ov_recorded_time` (`recorded_by`,`created_at`);

--
-- Indexes for table `offline_sync_audit`
--
ALTER TABLE `offline_sync_audit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_osa_sync` (`offline_sync_id`,`created_at`),
  ADD KEY `idx_osa_actor` (`actor_id`,`created_at`);

--
-- Indexes for table `offline_sync_logs`
--
ALTER TABLE `offline_sync_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_offline_item` (`user_id`,`client_uuid`),
  ADD KEY `idx_offline_user_time` (`user_id`,`created_at`),
  ADD KEY `idx_offline_status_time` (`status`,`created_at`),
  ADD KEY `idx_offline_path_time` (`source_path`,`created_at`),
  ADD KEY `idx_offline_resolved` (`resolved_at`,`resolved_by`);

--
-- Indexes for table `payroll_base`
--
ALTER TABLE `payroll_base`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `plate_scan_samples`
--
ALTER TABLE `plate_scan_samples`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pss_plate` (`corrected_plate`),
  ADD KEY `idx_pss_user_time` (`user_id`,`created_at`),
  ADD KEY `idx_pss_vehicle` (`vehicle_id`),
  ADD KEY `idx_pss_status_time` (`status`,`created_at`),
  ADD KEY `idx_pss_reviewed` (`reviewed_by`,`reviewed_at`);

--
-- Indexes for table `presence_checks`
--
ALTER TABLE `presence_checks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pc_user` (`user_id`),
  ADD KEY `idx_pc_date` (`slot_date`),
  ADD KEY `idx_pc_slot` (`user_id`,`slot_date`,`slot`),
  ADD KEY `idx_presence_checks_user_date_slot` (`user_id`,`slot_date`,`slot`);

--
-- Indexes for table `print_templates`
--
ALTER TABLE `print_templates`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `push_tokens`
--
ALTER TABLE `push_tokens`
  ADD PRIMARY KEY (`user_id`,`token`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sender` (`sender_id`),
  ADD KEY `idx_reports_sender_created` (`sender_id`,`created_at`),
  ADD KEY `idx_reports_status_created` (`status`,`created_at`);

--
-- Indexes for table `report_archives`
--
ALTER TABLE `report_archives`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ra` (`report_id`,`user_id`),
  ADD KEY `idx_ra_user` (`user_id`);

--
-- Indexes for table `report_attachments`
--
ALTER TABLE `report_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_report_attachments` (`report_id`);

--
-- Indexes for table `report_audit`
--
ALTER TABLE `report_audit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_report_audit` (`report_id`,`created_at`),
  ADD KEY `idx_report_audit_actor` (`actor_id`,`created_at`);

--
-- Indexes for table `report_audit_logs`
--
ALTER TABLE `report_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_report_audit_report` (`report_id`,`created_at`);

--
-- Indexes for table `report_cc`
--
ALTER TABLE `report_cc`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_report_cc_report` (`report_id`),
  ADD KEY `idx_report_cc_to` (`to_user_id`,`created_at`);

--
-- Indexes for table `report_deletions`
--
ALTER TABLE `report_deletions`
  ADD PRIMARY KEY (`report_id`,`user_id`),
  ADD KEY `idx_rd_user` (`user_id`,`created_at`);

--
-- Indexes for table `report_edits`
--
ALTER TABLE `report_edits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_report_edits` (`report_id`);

--
-- Indexes for table `report_reads`
--
ALTER TABLE `report_reads`
  ADD PRIMARY KEY (`report_id`,`user_id`),
  ADD KEY `idx_report_reads_user` (`user_id`,`created_at`);

--
-- Indexes for table `report_routes`
--
ALTER TABLE `report_routes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `report_subjects`
--
ALTER TABLE `report_subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_report_subject_title` (`title`);

--
-- Indexes for table `requests`
--
ALTER TABLE `requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_req_user` (`user_id`,`created_at`),
  ADD KEY `idx_req_status` (`status`),
  ADD KEY `idx_req_pending` (`pending_on`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `title` (`title`),
  ADD UNIQUE KEY `uq_role_title` (`title`);

--
-- Indexes for table `role_score_coefficients`
--
ALTER TABLE `role_score_coefficients`
  ADD PRIMARY KEY (`role_key`);

--
-- Indexes for table `role_work_rules`
--
ALTER TABLE `role_work_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_key` (`role_key`);

--
-- Indexes for table `salary_slips`
--
ALTER TABLE `salary_slips`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_salary_user_month` (`user_id`,`jmonth`);

--
-- Indexes for table `score_rules`
--
ALTER TABLE `score_rules`
  ADD PRIMARY KEY (`rule_key`);

--
-- Indexes for table `shifts`
--
ALTER TABLE `shifts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `shift_assignment_audit`
--
ALTER TABLE `shift_assignment_audit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_saa_user_time` (`user_id`,`created_at`);

--
-- Indexes for table `shift_days`
--
ALTER TABLE `shift_days`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sd` (`shift_id`,`jdate`),
  ADD KEY `idx_sd` (`shift_id`),
  ADD KEY `idx_shift_days_shift_jdate` (`shift_id`,`jdate`);

--
-- Indexes for table `shift_handovers`
--
ALTER TABLE `shift_handovers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_handover_token` (`token`),
  ADD KEY `idx_handover_from` (`from_user_id`,`status`);

--
-- Indexes for table `sms_contacts`
--
ALTER TABLE `sms_contacts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_uc` (`user_id`,`phone`);

--
-- Indexes for table `sms_log`
--
ALTER TABLE `sms_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sms_by` (`sent_by`),
  ADD KEY `idx_sms_date` (`created_at`);

--
-- Indexes for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sa_user` (`user_id`,`check_in`),
  ADD KEY `idx_sa_open` (`user_id`,`check_out`),
  ADD KEY `idx_staff_att_user_in_out` (`user_id`,`check_in`,`check_out`),
  ADD KEY `idx_staff_att_client_uuid` (`client_uuid`),
  ADD KEY `idx_staff_att_offline` (`offline_synced`,`check_in`),
  ADD KEY `idx_staff_att_user_checkin` (`user_id`,`check_in`);

--
-- Indexes for table `station_exits`
--
ALTER TABLE `station_exits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_se_user` (`user_id`),
  ADD KEY `idx_se_time` (`exited_at`);

--
-- Indexes for table `station_sign_types`
--
ALTER TABLE `station_sign_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sst_code` (`code`);

--
-- Indexes for table `subordinate_daily_reviews`
--
ALTER TABLE `subordinate_daily_reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sdr_daily` (`reviewer_id`,`subject_user_id`,`review_date`),
  ADD KEY `idx_sdr_subject_date` (`subject_user_id`,`review_date`),
  ADD KEY `idx_sdr_line_date` (`line_id`,`review_date`);

--
-- Indexes for table `subscription_payments`
--
ALTER TABLE `subscription_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_payload` (`invoice_payload`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `status` (`status`);

--
-- Indexes for table `substitute_assignments`
--
ALTER TABLE `substitute_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sub_user` (`substitute_user_id`),
  ADD KEY `idx_sub_dates` (`from_date`,`to_date`);

--
-- Indexes for table `system_health_checks`
--
ALTER TABLE `system_health_checks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_health_check_key_time` (`check_key`,`checked_at`),
  ADD KEY `idx_health_check_status` (`status`,`checked_at`);

--
-- Indexes for table `system_health_incidents`
--
ALTER TABLE `system_health_incidents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_shi_key_status` (`check_key`,`status`,`last_seen_at`),
  ADD KEY `idx_shi_resolved` (`resolved_at`,`last_seen_at`);

--
-- Indexes for table `system_health_logs`
--
ALTER TABLE `system_health_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_health_level_time` (`level`,`created_at`),
  ADD KEY `idx_health_source_time` (`source`,`created_at`);

--
-- Indexes for table `system_outages`
--
ALTER TABLE `system_outages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_so_line` (`line_id`),
  ADD KEY `idx_so_date` (`outage_date`);

--
-- Indexes for table `temp_line_drivers`
--
ALTER TABLE `temp_line_drivers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tld_line` (`line_id`,`is_active`),
  ADD KEY `idx_tld_driver` (`driver_id`,`is_active`);

--
-- Indexes for table `temp_line_driver_history`
--
ALTER TABLE `temp_line_driver_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tldh_driver` (`driver_id`,`created_at`),
  ADD KEY `idx_tldh_line` (`line_id`,`created_at`),
  ADD KEY `idx_tldh_temp` (`temp_line_driver_id`);

--
-- Indexes for table `token_blacklist`
--
ALTER TABLE `token_blacklist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `jti` (`jti`),
  ADD KEY `idx_jti` (`jti`),
  ADD KEY `idx_exp` (`expires_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `user_activity`
--
ALTER TABLE `user_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `kind` (`kind`),
  ADD KEY `at` (`at`),
  ADD KEY `idx_user_at` (`user_id`,`at`);

--
-- Indexes for table `user_commitments`
--
ALTER TABLE `user_commitments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_uc_user` (`user_id`);

--
-- Indexes for table `user_devices`
--
ALTER TABLE `user_devices`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `user_lines`
--
ALTER TABLE `user_lines`
  ADD PRIMARY KEY (`user_id`,`line_id`);

--
-- Indexes for table `user_managers`
--
ALTER TABLE `user_managers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_um` (`user_id`,`manager_id`),
  ADD KEY `idx_um_mgr` (`manager_id`);

--
-- Indexes for table `user_mission_overrides`
--
ALTER TABLE `user_mission_overrides`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_mission_period` (`user_id`,`period`);

--
-- Indexes for table `user_mission_override_targets`
--
ALTER TABLE `user_mission_override_targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_override_metric` (`override_id`,`metric_key`),
  ADD KEY `idx_umot_override` (`override_id`),
  ADD KEY `idx_umot_metric` (`metric_key`);

--
-- Indexes for table `user_net_state`
--
ALTER TABLE `user_net_state`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `user_salary_slips`
--
ALTER TABLE `user_salary_slips`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_period` (`user_id`,`period_jy`,`period_jm`),
  ADD KEY `idx_period` (`period_jy`,`period_jm`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_type` (`user_id`,`device_type`);

--
-- Indexes for table `user_shifts`
--
ALTER TABLE `user_shifts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_us` (`user_id`),
  ADD KEY `idx_us_shift` (`shift_id`),
  ADD KEY `idx_user_shifts_user_dates` (`user_id`,`from_jdate`,`to_jdate`);

--
-- Indexes for table `user_station_state`
--
ALTER TABLE `user_station_state`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `user_subscriptions`
--
ALTER TABLE `user_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `expires_at` (`expires_at`);

--
-- Indexes for table `user_work_rule_overrides`
--
ALTER TABLE `user_work_rule_overrides`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_uwro_user` (`user_id`,`is_active`);

--
-- Indexes for table `vehicles`
--
ALTER TABLE `vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `plate` (`plate`),
  ADD KEY `idx_line_id` (`line_id`),
  ADD KEY `idx_vehicles_plate` (`plate`);

--
-- Indexes for table `vehicle_drivers`
--
ALTER TABLE `vehicle_drivers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_vd` (`vehicle_id`,`driver_id`),
  ADD KEY `idx_vd_driver_vehicle` (`driver_id`,`vehicle_id`),
  ADD KEY `idx_vd_vehicle_driver` (`vehicle_id`,`driver_id`);

--
-- Indexes for table `vpn_events`
--
ALTER TABLE `vpn_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vpn_user` (`user_id`),
  ADD KEY `idx_vpn_time` (`created_at`);

--
-- Indexes for table `vpn_status_reports`
--
ALTER TABLE `vpn_status_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vpn_reports_user_checked` (`user_id`,`checked_at`),
  ADD KEY `idx_vpn_reports_state_checked` (`vpn_on`,`checked_at`);

--
-- Indexes for table `welfare_grants`
--
ALTER TABLE `welfare_grants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_wg_nid` (`driver_national_id`),
  ADD KEY `idx_wg_item` (`item_id`),
  ADD KEY `idx_wg_date` (`granted_jdate`),
  ADD KEY `idx_wg_granted_time` (`granted_by`,`created_at`);

--
-- Indexes for table `welfare_items`
--
ALTER TABLE `welfare_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `welfare_places`
--
ALTER TABLE `welfare_places`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `work_policies`
--
ALTER TABLE `work_policies`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `zones`
--
ALTER TABLE `zones`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendances`
--
ALTER TABLE `attendances`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_ot_adjustments`
--
ALTER TABLE `attendance_ot_adjustments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_recalculate_logs`
--
ALTER TABLE `attendance_recalculate_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_reject_logs`
--
ALTER TABLE `attendance_reject_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `backup_log`
--
ALTER TABLE `backup_log`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bale_bot_events`
--
ALTER TABLE `bale_bot_events`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bale_chat_sessions`
--
ALTER TABLE `bale_chat_sessions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bale_custom_replies`
--
ALTER TABLE `bale_custom_replies`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bale_forms`
--
ALTER TABLE `bale_forms`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bale_form_fields`
--
ALTER TABLE `bale_form_fields`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bale_form_submissions`
--
ALTER TABLE `bale_form_submissions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bale_menu_items`
--
ALTER TABLE `bale_menu_items`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bale_message_log`
--
ALTER TABLE `bale_message_log`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bale_subscribers`
--
ALTER TABLE `bale_subscribers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bills`
--
ALTER TABLE `bills`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `checklist_items`
--
ALTER TABLE `checklist_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `checklist_submissions`
--
ALTER TABLE `checklist_submissions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `checklist_templates`
--
ALTER TABLE `checklist_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `commitment_reasons`
--
ALTER TABLE `commitment_reasons`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_card_payments`
--
ALTER TABLE `company_card_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_requests`
--
ALTER TABLE `company_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_request_files`
--
ALTER TABLE `company_request_files`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_request_logs`
--
ALTER TABLE `company_request_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_request_payments`
--
ALTER TABLE `company_request_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_request_types`
--
ALTER TABLE `company_request_types`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `covert_selfies`
--
ALTER TABLE `covert_selfies`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `covert_selfie_commands`
--
ALTER TABLE `covert_selfie_commands`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `covert_selfie_requests`
--
ALTER TABLE `covert_selfie_requests`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cultural_activities`
--
ALTER TABLE `cultural_activities`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cultural_places`
--
ALTER TABLE `cultural_places`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cultural_types`
--
ALTER TABLE `cultural_types`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `custom_fields`
--
ALTER TABLE `custom_fields`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `custom_field_values`
--
ALTER TABLE `custom_field_values`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `custom_forms`
--
ALTER TABLE `custom_forms`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `delivery_dead_letters`
--
ALTER TABLE `delivery_dead_letters`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `delivery_queue`
--
ALTER TABLE `delivery_queue`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `device_status_periods`
--
ALTER TABLE `device_status_periods`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `drivers`
--
ALTER TABLE `drivers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `form_submissions`
--
ALTER TABLE `form_submissions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `geofences`
--
ALTER TABLE `geofences`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `group_subscriptions`
--
ALTER TABLE `group_subscriptions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `holidays`
--
ALTER TABLE `holidays`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_item_types`
--
ALTER TABLE `inventory_item_types`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_transfers`
--
ALTER TABLE `inventory_transfers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leave_blocked_dates`
--
ALTER TABLE `leave_blocked_dates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lines`
--
ALTER TABLE `lines`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `line_idents`
--
ALTER TABLE `line_idents`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `line_location_permissions`
--
ALTER TABLE `line_location_permissions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `line_station_locations`
--
ALTER TABLE `line_station_locations`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `line_station_signs`
--
ALTER TABLE `line_station_signs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `line_visit_reports`
--
ALTER TABLE `line_visit_reports`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `location_pings`
--
ALTER TABLE `location_pings`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `login_ip_attempts`
--
ALTER TABLE `login_ip_attempts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `login_otp`
--
ALTER TABLE `login_otp`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messenger_bot_events`
--
ALTER TABLE `messenger_bot_events`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messenger_chat_sessions`
--
ALTER TABLE `messenger_chat_sessions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messenger_form_submissions`
--
ALTER TABLE `messenger_form_submissions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messenger_message_log`
--
ALTER TABLE `messenger_message_log`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messenger_subscribers`
--
ALTER TABLE `messenger_subscribers`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mission_badges`
--
ALTER TABLE `mission_badges`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mission_daily_progress`
--
ALTER TABLE `mission_daily_progress`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mission_score_adjustments`
--
ALTER TABLE `mission_score_adjustments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mission_score_daily`
--
ALTER TABLE `mission_score_daily`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mission_templates`
--
ALTER TABLE `mission_templates`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mission_template_targets`
--
ALTER TABLE `mission_template_targets`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mission_timeline_events`
--
ALTER TABLE `mission_timeline_events`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mission_visit_sessions`
--
ALTER TABLE `mission_visit_sessions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mobile_device_health`
--
ALTER TABLE `mobile_device_health`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mobile_error_logs`
--
ALTER TABLE `mobile_error_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notices`
--
ALTER TABLE `notices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notice_reasons`
--
ALTER TABLE `notice_reasons`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `official_visits`
--
ALTER TABLE `official_visits`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `offline_sync_audit`
--
ALTER TABLE `offline_sync_audit`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `offline_sync_logs`
--
ALTER TABLE `offline_sync_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `plate_scan_samples`
--
ALTER TABLE `plate_scan_samples`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `presence_checks`
--
ALTER TABLE `presence_checks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `print_templates`
--
ALTER TABLE `print_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_archives`
--
ALTER TABLE `report_archives`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_attachments`
--
ALTER TABLE `report_attachments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_audit`
--
ALTER TABLE `report_audit`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_audit_logs`
--
ALTER TABLE `report_audit_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_cc`
--
ALTER TABLE `report_cc`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_edits`
--
ALTER TABLE `report_edits`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_routes`
--
ALTER TABLE `report_routes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_subjects`
--
ALTER TABLE `report_subjects`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `requests`
--
ALTER TABLE `requests`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `role_work_rules`
--
ALTER TABLE `role_work_rules`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `salary_slips`
--
ALTER TABLE `salary_slips`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shifts`
--
ALTER TABLE `shifts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shift_assignment_audit`
--
ALTER TABLE `shift_assignment_audit`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shift_days`
--
ALTER TABLE `shift_days`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shift_handovers`
--
ALTER TABLE `shift_handovers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sms_contacts`
--
ALTER TABLE `sms_contacts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sms_log`
--
ALTER TABLE `sms_log`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `station_exits`
--
ALTER TABLE `station_exits`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `station_sign_types`
--
ALTER TABLE `station_sign_types`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subordinate_daily_reviews`
--
ALTER TABLE `subordinate_daily_reviews`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subscription_payments`
--
ALTER TABLE `subscription_payments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `substitute_assignments`
--
ALTER TABLE `substitute_assignments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_health_checks`
--
ALTER TABLE `system_health_checks`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_health_incidents`
--
ALTER TABLE `system_health_incidents`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_health_logs`
--
ALTER TABLE `system_health_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_outages`
--
ALTER TABLE `system_outages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `temp_line_drivers`
--
ALTER TABLE `temp_line_drivers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `temp_line_driver_history`
--
ALTER TABLE `temp_line_driver_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `token_blacklist`
--
ALTER TABLE `token_blacklist`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_activity`
--
ALTER TABLE `user_activity`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_commitments`
--
ALTER TABLE `user_commitments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_managers`
--
ALTER TABLE `user_managers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_mission_overrides`
--
ALTER TABLE `user_mission_overrides`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_mission_override_targets`
--
ALTER TABLE `user_mission_override_targets`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_salary_slips`
--
ALTER TABLE `user_salary_slips`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_shifts`
--
ALTER TABLE `user_shifts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_subscriptions`
--
ALTER TABLE `user_subscriptions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_work_rule_overrides`
--
ALTER TABLE `user_work_rule_overrides`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicles`
--
ALTER TABLE `vehicles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vehicle_drivers`
--
ALTER TABLE `vehicle_drivers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vpn_events`
--
ALTER TABLE `vpn_events`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vpn_status_reports`
--
ALTER TABLE `vpn_status_reports`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `welfare_grants`
--
ALTER TABLE `welfare_grants`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `welfare_items`
--
ALTER TABLE `welfare_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `welfare_places`
--
ALTER TABLE `welfare_places`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `work_policies`
--
ALTER TABLE `work_policies`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `zones`
--
ALTER TABLE `zones`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
