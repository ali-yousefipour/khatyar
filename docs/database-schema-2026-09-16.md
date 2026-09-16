# KhatYar Database Schema Snapshot — 2026-09-16

Source: `h301194_app.sql` exported from database `h301194_app` by phpMyAdmin on 2026-09-16 15:45.

## Database environment
- MySQL-compatible server: 8.0.46-cll-lve
- PHP: 8.4.24
- Character set used by dump: utf8mb4
- SQL timezone in dump: `+00:00`
- This document is a repository reference for future backend/API/schema investigations. The original dump contains 168 tables.

## Critical attendance schema

### `staff_attendance`
The staff attendance table does **not** contain a `status` column.

Columns:
- `id` int AUTO_INCREMENT
- `user_id` int NOT NULL
- `line_id` int NULL
- `check_in` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
- `check_out` datetime NULL
- `method` varchar(12) NULL
- `in_lat` double NULL
- `in_lng` double NULL
- `out_lat` double NULL
- `out_lng` double NULL
- `auto_closed` tinyint(1) NOT NULL DEFAULT 0
- `in_station` varchar(150) NULL
- `out_station` varchar(150) NULL
- `handover_id` int NULL
- `calc_json` json NULL
- `client_check_in` datetime NULL
- `client_check_out` datetime NULL
- `client_uuid` varchar(120) NULL
- `offline_synced` tinyint(1) NOT NULL DEFAULT 0

**Important:** any query such as `WHERE status = ...` against `staff_attendance` is invalid for this schema and produces MySQL error 1054 (`Unknown column 'status'`).

### Date-format rule
`staff_attendance.check_in`, `check_out`, `client_check_in`, and `client_check_out` are MySQL `DATETIME` fields. They are not Jalali strings.

Jalali dates are stored as `varchar(10)` in designated fields such as `attendance_ot_adjustments.jdate`, `attendance_recalculate_logs.from_jdate/to_jdate`, `shift_days.jdate`, and `user_shifts.from_jdate/to_jdate`.

Therefore an admin attendance report receiving `from=1405/06/01&to=1405/06/25` must convert the Jalali input to the corresponding Gregorian date/time range before filtering `staff_attendance.check_in` / `check_out`.

The current reported error has two distinct possible causes that must not be conflated:
1. The immediate SQL error is caused by referencing a nonexistent `status` column if the query targets `staff_attendance`.
2. The report date parameters are Jalali strings while attendance timestamps are Gregorian `DATETIME`; the report must perform an explicit Jalali-to-Gregorian conversion.

Do not add a `status` column merely to silence the error unless the application design explicitly requires such a field. The report query should instead be aligned with the actual schema.

### `offline_sync_logs`
Relevant offline synchronization fields:
- `user_id`
- `device_id`
- `item_type`
- `client_uuid`
- `status`
- `payload` JSON
- `response` JSON
- `created_at` DATETIME
- `source_path`
- `error`
- `server_result` JSON
- `processed_at`
- `resolved_by`
- `resolved_at`
- `resolution_note`
- `conflict_reason`

There is a unique key on `(user_id, client_uuid)` for idempotent offline synchronization.

### `presence_checks`
- `id` int AUTO_INCREMENT
- `user_id` int NOT NULL
- `slot` varchar(5) NOT NULL
- `slot_date` date NOT NULL
- `selfie` mediumtext NULL
- `vehicles_photo` mediumtext NULL
- `lat` double NULL
- `lng` double NULL
- `captured_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
- `selfie_path` varchar(255) NULL
- `vehicles_photo_path` varchar(255) NULL

`slot_date` is a MySQL `DATE`, not a Jalali varchar.

### `attendances`
This is a separate taxi/driver attendance table and must not be confused with `staff_attendance`:
- `id`
- `driver_id`
- `user_id`
- `line_id`
- `lat`
- `lng`
- `created_at` DATETIME
- `exit_at` DATETIME

It also has no `status` column.

## Full table inventory
The source dump contains these 168 tables:

activity_logs, api_cache, app_settings, attendances, attendance_ot_adjustments, attendance_recalculate_logs, attendance_reject_logs, backup_log, bale_bot_events, bale_chat_sessions, bale_custom_replies, bale_forms, bale_form_fields, bale_form_submissions, bale_menu_items, bale_message_log, bale_subscribers, bills, checklist_items, checklist_submissions, checklist_templates, commitment_reasons, company_card_payments, company_requests, company_request_files, company_request_logs, company_request_payments, company_request_settings, company_request_types, covert_selfies, covert_selfie_commands, covert_selfie_requests, cron_run_log, cultural_activities, cultural_places, cultural_types, custom_fields, custom_field_values, custom_forms, delivery_dead_letters, delivery_queue, device_status_periods, drivers, field_alert_preferences, form_submissions, geofences, group_subscriptions, holidays, inspector_modes, inventory_item_types, inventory_transfers, leave_blocked_dates, lines, line_idents, line_location_permissions, line_score_coefficients, line_station_locations, line_station_signs, line_visit_reports, location_pings, login_ip_attempts, login_otp, messages, message_recipients, messenger_bot_events, messenger_chat_sessions, messenger_form_submissions, messenger_message_log, messenger_subscribers, mission_badges, mission_daily_progress, mission_execution_settings, mission_metric_catalog, mission_score_adjustments, mission_score_daily, mission_templates, mission_template_targets, mission_timeline_events, mission_visit_sessions, mobile_device_health, mobile_device_health_latest, mobile_error_logs, notices, notice_reasons, notifications, official_visits, offline_sync_audit, offline_sync_logs, payroll_base, personnel_vehicle_assets, personnel_vehicle_asset_checks, personnel_vehicle_asset_photos, personnel_vehicle_assignments, personnel_vehicle_checklist_history, plate_scan_samples, presence_checks, presence_immediate_requests, print_templates, push_tokens, radio_channels, radio_channel_regions, radio_channel_roles, radio_channel_users, radio_logs, radio_messages, radio_presence, radio_user_settings, refresh_tokens, reports, report_archives, report_attachments, report_audit, report_audit_logs, report_cc, report_deletions, report_edits, report_reads, report_routes, report_subjects, requests, roles, role_score_coefficients, role_work_rules, salary_slips, score_rules, shifts, shift_assignment_audit, shift_days, shift_handovers, sms_contacts, sms_log, staff_attendance, station_exits, station_sign_types, subordinate_daily_reviews, subscription_payments, substitute_assignments, system_health_checks, system_health_incidents, system_health_logs, system_outages, temp_line_drivers, temp_line_driver_history, token_blacklist, users, user_activity, user_commitments, user_devices, user_lines, user_managers, user_mission_overrides, user_mission_override_targets, user_net_state, user_salary_slips, user_sessions, user_shifts, user_station_state, user_subscriptions, user_work_rule_overrides, vehicles, vehicle_drivers, vpn_events, vpn_status_reports, welfare_grants, welfare_items, welfare_places, work_policies, zones.

## Investigation rule for future schema changes
Before changing SQL, migrations, or PHP endpoints:
1. Check this snapshot and the current production schema.
2. Verify the real table and column names.
3. Preserve MySQL/MariaDB-compatible syntax used by this project.
4. Do not infer a `status` field where the actual table has none.
5. Treat Jalali `varchar(10)`/UI date input and Gregorian MySQL `DATE`/`DATETIME` storage as different representations and convert explicitly at the API boundary.
