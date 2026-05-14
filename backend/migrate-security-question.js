import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrateSecurityQuestion() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'attendance_db'
    });

    console.log('Connected to database. Adding security question columns...');

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'attendance_db'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('security_question', 'security_answer')
    `);

    const existingColumns = columns.map((col) => col.COLUMN_NAME);

    if (existingColumns.includes('security_question') && existingColumns.includes('security_answer')) {
      console.log('Security question columns already exist. No migration needed.');
      await connection.end();
      return;
    }

    // Add missing columns
    if (!existingColumns.includes('security_question')) {
      await connection.execute('ALTER TABLE users ADD COLUMN security_question VARCHAR(255) DEFAULT NULL');
      console.log('Added security_question column');
    }

    if (!existingColumns.includes('security_answer')) {
      await connection.execute('ALTER TABLE users ADD COLUMN security_answer VARCHAR(255) DEFAULT NULL');
      console.log('Added security_answer column');
    }

    console.log('Migration completed successfully!');
    await connection.end();
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateSecurityQuestion();
