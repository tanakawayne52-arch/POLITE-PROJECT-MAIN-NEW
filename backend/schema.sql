-- Database Schema for Application
CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

-- Admin user creation with full privileges
CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'admin123';
GRANT ALL PRIVILEGES ON attendance_db.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    usersname VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    job_description VARCHAR(100),
    role ENUM('admin', 'employee') DEFAULT 'employee',
    staff_type ENUM('attachee', 'permanent', 'contract') DEFAULT 'permanent',
    phone VARCHAR(20),
    address VARCHAR(255),
    employee_id VARCHAR(9) UNIQUE,
    employment_date DATE,
    profile_photo VARCHAR(255),
    security_question VARCHAR(255) DEFAULT NULL,
    security_answer VARCHAR(255) DEFAULT NULL,
    CONSTRAINT chk_employee_id_format CHECK (employee_id REGEXP '^[0-9]{6}[A-Z][0-9]{2}$')
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('check-in', 'check-out') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(50) DEFAULT 'manual',
    verification_status VARCHAR(50) DEFAULT 'verified',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_address VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Directorates Table
CREATE TABLE IF NOT EXISTS directorates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'building',
    color VARCHAR(50) DEFAULT 'emerald'
);

-- Units Table
CREATE TABLE IF NOT EXISTS units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    directorate_id INT,
    staff_count INT DEFAULT 0,
    FOREIGN KEY (directorate_id) REFERENCES directorates(id) ON DELETE CASCADE
);

-- Positions Table
CREATE TABLE IF NOT EXISTS positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    category ENUM('leadership', 'support', 'technical') DEFAULT 'technical'
);

-- Seed Positions
INSERT IGNORE INTO positions (title, category) VALUES
('Director', 'leadership'),
('Deputy Director', 'leadership'),
('PA', 'support'),
('ICT Officer', 'technical'),
('Accountant', 'technical'),
('Procurement Officer', 'technical'),
('Human Resources Officer', 'technical'),
('Nursing Officer', 'technical'),
('Medical Officer', 'technical'),
('Pharmacist', 'technical'),
('Laboratory Technician', 'technical'),
('Administrative Officer', 'support'),
('Finance Officer', 'technical'),
('Monitoring and Evaluation Officer', 'technical'),
('Public Health Officer', 'technical'),
('Health Promotion Officer', 'technical'),
('Environmental Health Officer', 'technical'),
('Epidemiologist', 'technical'),
('Statistician', 'technical'),
('Records Officer', 'support'),
('Driver', 'support'),
('Cleaner', 'support'),
('Security Guard', 'support'),
('Receptionist', 'support'),
('Secretary', 'support');

-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    department VARCHAR(100) DEFAULT 'all',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Admin User (password: admin123)
INSERT IGNORE INTO users (usersname, email, password, department, job_description, role, staff_type) VALUES
('System Administrator', 'admin@mohcc.gov.zw', '$2a$10$LN3E0AWwKL4Mr.AfgaRXvuOGpWriafiHkoTgf2THiA4ilCale8D1.', 'IT Department', 'System Administrator', 'admin', 'permanent');

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Manual Clock Requests Table
CREATE TABLE IF NOT EXISTS manual_clock_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    requested_time VARCHAR(50) NOT NULL,
    reason TEXT,
    comments TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('annual', 'sick', 'personal', 'other') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Shift Swap Requests Table
CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    current_shift_date DATE NOT NULL,
    preferred_swap_date DATE NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Seed Employee User (password: emp123)
INSERT IGNORE INTO users (usersname, email, password, department, job_description, role, staff_type) VALUES
('Murambwa', 'murambwa@mohcc.gov.zw', '$2a$10$rE5fGIMAboWD7KR0mb2IZuJMZ94iQ6NYWCLOirnU4E4KZF7sFcePu', 'Health Services', 'Employee', 'employee', 'permanent');

