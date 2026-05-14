import mysql from 'mysql2/promise';

async function testConnection() {
  console.log('Testing database connection...');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'attendance_db',
  };

  console.log('Database config:', {
    ...dbConfig,
    password: dbConfig.password ? '[HIDDEN]' : '[EMPTY]'
  });

  try {
    console.log('Attempting to connect...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connection successful!');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query successful:', rows);
    
    await connection.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.code, error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('MySQL server is not running or not accessible');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Invalid credentials - check username/password');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('Database does not exist - need to run schema.sql');
    }
  }
}

testConnection();
