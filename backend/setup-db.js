import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function setupDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });
    
    // Create database
    await connection.execute('CREATE DATABASE IF NOT EXISTS attendance_db');
    await connection.query('USE attendance_db');
    
    // Create users table
    await connection.execute(`
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
      )
    `);
    
    // Create attendance table
    await connection.execute(`
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
      )
    `);

    // Create directorates table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS directorates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT 'building',
        color VARCHAR(50) DEFAULT 'emerald'
      )
    `);

    // Create units table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        directorate_id INT,
        staff_count INT DEFAULT 0,
        FOREIGN KEY (directorate_id) REFERENCES directorates(id) ON DELETE CASCADE
      )
    `);

    // Create positions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS positions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        category ENUM('leadership', 'support', 'technical') DEFAULT 'technical'
      )
    `);

    // Seed positions
    await connection.execute(`
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
      ('Secretary', 'support')
    `);
    
    console.log('Database setup completed successfully!');
    await connection.end();
  } catch (error) {
    console.error('Database setup error:', error);
  }
}

setupDatabase();
