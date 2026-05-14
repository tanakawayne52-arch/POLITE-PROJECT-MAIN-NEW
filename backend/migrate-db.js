import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'attendance_db';
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  multipleStatements: true
};

async function migrate() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Add missing columns
    const alterCommands = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_date DATE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS otp VARCHAR(6)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at DATETIME'
    ];

    for (const cmd of alterCommands) {
      try {
        await connection.execute(cmd);
        console.log('Executed:', cmd);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('Column already exists, skipping:', cmd);
        } else {
          console.error('Error executing:', cmd, err.message);
        }
      }
    }

    await connection.end();
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
