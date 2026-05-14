// Seed Departments Script
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function seedDepartments() {
  console.log('Seeding MOHCC Departments and Units...');

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306');
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';

  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: 'attendance_db',
      multipleStatements: true
    });
    
    console.log('✅ Connected to attendance_db');
    
    // Read seed file
    const seedPath = path.join(process.cwd(), 'seed-departments.sql');
    const seedSql = await fs.readFile(seedPath, 'utf8');
    
    console.log('Inserting departments and units...');
    await connection.query(seedSql);
    
    console.log('✅ Departments and units seeded successfully');
    
    // Verify data
    const [directorates] = await connection.execute('SELECT COUNT(*) as count FROM directorates');
    const [units] = await connection.execute('SELECT COUNT(*) as count FROM units');
    
    console.log(`✅ Total directorates: ${directorates[0].count}`);
    console.log(`✅ Total units: ${units[0].count}`);
    
    await connection.end();
    console.log('🎉 Department seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Department seeding failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Please ensure MySQL server is running');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Check MySQL credentials');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database attendance_db does not exist. Run setup-database.js first');
    }
  }
}

seedDepartments();
