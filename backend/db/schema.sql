-- Hostel Management System schema (MySQL 8 / MariaDB 10.5+)
-- Traceability: users/students (M1), inventory/allocations (M2), complaints (M3),
-- fees/visitors/leave (M4), audit_logs (HMS-SR-005).

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role ENUM('student','warden','maintenance','admin') NOT NULL DEFAULT 'student',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  user_id INT UNSIGNED PRIMARY KEY,
  srn VARCHAR(30) NOT NULL UNIQUE,
  contact VARCHAR(20) NOT NULL,
  department VARCHAR(80) NULL,
  year_of_study TINYINT UNSIGNED NULL,
  guardian_name VARCHAR(120) NULL,
  guardian_contact VARCHAR(20) NULL,
  address VARCHAR(300) NULL,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS blocks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  block_id INT UNSIGNED NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  floor INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_room (block_id, room_number),
  CONSTRAINT fk_rooms_block FOREIGN KEY (block_id) REFERENCES blocks(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS beds (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id INT UNSIGNED NOT NULL,
  label VARCHAR(20) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_bed (room_id, label),
  CONSTRAINT fk_beds_room FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB;

-- A bed can have at most one CURRENT allocation and a student at most one CURRENT
-- allocation. The generated columns are NULL once released, so history is unlimited.
-- This is the DB-level guard against double allocation (SAD risk 3.7).
CREATE TABLE IF NOT EXISTS allocations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  bed_id INT UNSIGNED NOT NULL,
  status ENUM('allocated','checked_in','checked_out','transferred') NOT NULL DEFAULT 'allocated',
  allocated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_in_date DATE NULL,
  check_out_date DATE NULL,
  released_at TIMESTAMP NULL,
  allocated_by INT UNSIGNED NULL,
  current_bed_key INT UNSIGNED AS (IF(released_at IS NULL, bed_id, NULL)) STORED,
  current_student_key INT UNSIGNED AS (IF(released_at IS NULL, student_id, NULL)) STORED,
  UNIQUE KEY uq_current_bed (current_bed_key),
  UNIQUE KEY uq_current_student (current_student_key),
  KEY idx_alloc_student (student_id),
  CONSTRAINT fk_alloc_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_alloc_bed FOREIGN KEY (bed_id) REFERENCES beds(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaint_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaints (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  location VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  attachment_ref VARCHAR(300) NULL,
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status ENUM('submitted','assigned','in_progress','resolved') NOT NULL DEFAULT 'submitted',
  assigned_to INT UNSIGNED NULL,
  resolution_details TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  KEY idx_comp_student (student_id),
  KEY idx_comp_assignee (assigned_to),
  KEY idx_comp_status (status),
  CONSTRAINT fk_comp_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_comp_cat FOREIGN KEY (category_id) REFERENCES complaint_categories(id),
  CONSTRAINT fk_comp_assignee FOREIGN KEY (assigned_to) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(40) NOT NULL,
  message VARCHAR(300) NOT NULL,
  ref_type VARCHAR(40) NULL,
  ref_id INT UNSIGNED NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  delivery_status ENUM('in_app','sent','failed') NOT NULL DEFAULT 'in_app',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_assessments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  description VARCHAR(200) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fa_student (student_id),
  CONSTRAINT fk_fa_student FOREIGN KEY (student_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  assessment_id INT UNSIGNED NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_on DATE NOT NULL,
  reference VARCHAR(100) NULL,
  recorded_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fp_student (student_id),
  CONSTRAINT fk_fp_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_fp_assessment FOREIGN KEY (assessment_id) REFERENCES fee_assessments(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS visitors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  visitor_name VARCHAR(120) NOT NULL,
  id_type VARCHAR(40) NOT NULL,
  id_number VARCHAR(60) NOT NULL,
  relation VARCHAR(60) NULL,
  visit_at DATETIME NOT NULL,
  purpose VARCHAR(200) NOT NULL,
  status ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  remarks VARCHAR(300) NULL,
  recorded_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vis_student (student_id),
  CONSTRAINT fk_vis_student FOREIGN KEY (student_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leave_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  type ENUM('leave','outpass') NOT NULL,
  from_at DATETIME NOT NULL,
  to_at DATETIME NOT NULL,
  reason VARCHAR(300) NOT NULL,
  destination VARCHAR(150) NULL,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  remarks VARCHAR(300) NULL,
  decided_by INT UNSIGNED NULL,
  decided_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_leave_student (student_id),
  CONSTRAINT fk_leave_student FOREIGN KEY (student_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Tamper-evident audit trail (HMS-SR-005): each row's hash covers the previous row's hash.
-- details is stored as the exact serialized text so the hash can be recomputed.
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  role VARCHAR(20) NULL,
  action VARCHAR(60) NOT NULL,
  entity VARCHAR(40) NULL,
  entity_id VARCHAR(40) NULL,
  details TEXT NULL,
  ip VARCHAR(64) NULL,
  created_at VARCHAR(30) NOT NULL,
  prev_hash CHAR(64) NOT NULL,
  hash CHAR(64) NOT NULL,
  KEY idx_audit_action (action),
  KEY idx_audit_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_head (
  id TINYINT UNSIGNED PRIMARY KEY,
  last_hash CHAR(64) NOT NULL
) ENGINE=InnoDB;
INSERT IGNORE INTO audit_head (id, last_hash) VALUES (1, REPEAT('0', 64));

-- Server-side sessions (HMS-F-002); schema matches express-mysql-session defaults.
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT COLLATE utf8mb4_bin,
  KEY idx_sessions_expires (expires)
) ENGINE=InnoDB;
