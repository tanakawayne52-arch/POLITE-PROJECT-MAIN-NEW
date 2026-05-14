import mysql from 'mysql2/promise';

async function migrateDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });
    
    await connection.query('USE attendance_db');
    
    // Check if employee_id column exists
    const [columns] = await connection.execute('SHOW COLUMNS FROM users LIKE "employee_id"');
    
    if (columns.length === 0) {
      // Add employee_id column
      await connection.execute('ALTER TABLE users ADD COLUMN employee_id VARCHAR(9) UNIQUE');
      console.log('Added employee_id column');
    } else {
      console.log('employee_id column already exists');
      // Update employee_id column to VARCHAR(9)
      await connection.execute('ALTER TABLE users MODIFY COLUMN employee_id VARCHAR(9) UNIQUE');
      console.log('Updated employee_id column to VARCHAR(9)');
    }
    
    // Drop the existing constraint if it exists
    try {
      await connection.execute('ALTER TABLE users DROP CONSTRAINT chk_employee_id_format');
      console.log('Dropped existing constraint (if any)');
    } catch (err) {
      console.log('No existing constraint to drop');
    }
    
    // Add the CHECK constraint for EC number format
    await connection.execute('ALTER TABLE users ADD CONSTRAINT chk_employee_id_format CHECK (employee_id REGEXP "^[0-9]{6}[A-Z][0-9]{2}$" OR employee_id IS NULL)');
    console.log('Added CHECK constraint for EC number format');
    
    console.log('Database migration completed successfully!');
    await connection.end();
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateDatabase();
