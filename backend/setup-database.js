// Database Setup Script
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
  console.log('Setting up MOHCC Attendance Database...');

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306');
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';

  try {
    // Connect to MySQL without specifying database first
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create database first
    await connection.execute('CREATE DATABASE IF NOT EXISTS attendance_db');
    console.log('Database created or already exists');
    
    // Switch to the database
    await connection.changeUser({ database: 'attendance_db' });
    
    // Read schema file (excluding database creation, USE, and user creation statements)
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    let schemaSql = await fs.readFile(schemaPath, 'utf8');
    
    // Remove the first few lines that create and use database, and skip user creation
    const lines = schemaSql.split('\n');
    const startIndex = lines.findIndex(line => line.includes('-- Users Table'));
    schemaSql = lines.slice(startIndex).join('\n');
    
    console.log('Creating tables and seeding data...');
    await connection.query(schemaSql);
    
    console.log('✅ Database schema created successfully');
    
    // Verify data was inserted
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [attendance] = await connection.execute('SELECT COUNT(*) as count FROM attendance');
    const [directorates] = await connection.execute('SELECT COUNT(*) as count FROM directorates');
    
    console.log(`✅ Created ${users[0].count} users`);
    console.log(`✅ Created ${directorates[0].count} directorates`);
    console.log(`✅ Created ${attendance[0].count} attendance records`);
    
    await connection.end();
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Please ensure MySQL server is running on localhost:3306');
      console.log('   - On Windows: Check Services for MySQL/MariaDB');
      console.log('   - Or install XAMPP/WAMP if not installed');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Check MySQL credentials. Default: root/empty password');
    }
  }
}

setupDatabase();
