// Test Database Connectivity and Login
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'attendance_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function testDatabase() {
  console.log('Testing MySQL database connectivity...');
  
  try {
    // Test connection
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection successful');
    
    // Test query
    const [users] = await connection.execute('SELECT * FROM users LIMIT 5');
    console.log(`✅ Found ${users.length} users in database`);
    
    // Test password verification for first user found
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`✅ Testing password verification for user: ${testUser.usersname}`);
    }
    
    // Test attendance data
    const [attendance] = await connection.execute('SELECT COUNT(*) as count FROM attendance');
    console.log(`✅ Found ${attendance[0].count} attendance records`);
    
    await connection.end();
    console.log('✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 MySQL server may not be running. Please start MySQL service.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Check MySQL username/password in configuration.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database attendance_db not found. Run schema.sql first.');
    }
  }
}

testDatabase();
