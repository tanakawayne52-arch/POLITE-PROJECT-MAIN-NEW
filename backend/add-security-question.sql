-- Add security question and answer fields to users table
USE attendance_db;

ALTER TABLE users 
ADD COLUMN security_question VARCHAR(255) DEFAULT NULL,
ADD COLUMN security_answer VARCHAR(255) DEFAULT NULL;
