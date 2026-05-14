import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'frontend', 'public', 'uploads');
fs.mkdir(uploadsDir, { recursive: true })
  .then(() => console.log('[Photo Upload] Uploads directory created/verified:', uploadsDir))
  .catch((err) => console.error('[Photo Upload] Failed to create uploads directory:', err));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.error('[Photo Upload] Invalid file type:', file.mimetype);
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = 61460;

const DB_NAME = process.env.DB_NAME || 'attendance_db';
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool: mysql.Pool;
function createPool() {
  pool = mysql.createPool(dbConfig);
  return pool;
}

declare module 'express-session' {
  interface SessionData {
    user: { id: number; name: string; role: string; department: string };
  }
}

declare global {
  namespace Express {
    interface Request {
      session: session.Session & Partial<session.SessionData>;
    }
  }
}

// Type guard function to check if user is authenticated
function isAuthenticated(req: express.Request): req is express.Request & { session: { user: { id: number; name: string; role: string; department: string } } } {
  return req.session.user !== undefined;
}

// Middleware
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(morgan('dev') as any);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'mohcc-zimbabwe-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 
  }
}) as any);

// Helper function to get stats
async function getStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const LATE_TIME = '08:30:00';
    
    const [totalRes]: any = await pool.query('SELECT COUNT(*) as count FROM users');
    const [presentRes]: any = await pool.query('SELECT COUNT(DISTINCT user_id) as count FROM attendance WHERE DATE(timestamp) = ? AND type = "check-in"', [today]);
    const [lateRes]: any = await pool.query('SELECT COUNT(*) as count FROM attendance WHERE DATE(timestamp) = ? AND type = "check-in" AND TIME(timestamp) > ?', [today, LATE_TIME]);
    
    // Calculate avg shift for today's completed shifts
    const [shifts]: any = await pool.query(`
      SELECT user_id, 
             MIN(CASE WHEN type = 'check-in' THEN timestamp END) as check_in,
             MAX(CASE WHEN type = 'check-out' THEN timestamp END) as check_out
      FROM attendance 
      WHERE DATE(timestamp) = ?
      GROUP BY user_id 
      HAVING check_in IS NOT NULL AND check_out IS NOT NULL
    `, [today]);

    let totalHours = 0;
    shifts.forEach((s: any) => {
      // PERMANENT FIX: Validate check-out comes after check-in
      const checkInDate = new Date(s.check_in);
      const checkOutDate = new Date(s.check_out);
      if (checkOutDate.getTime() > checkInDate.getTime()) {
        totalHours += (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
      } else {
        console.warn('[getStats Validation] Check-out timestamp is not after check-in for user', s.user_id);
      }
    });
    const avgShift = shifts.length > 0 ? (totalHours / shifts.length).toFixed(1) + 'h' : '0h';

    return {
      totalEmployees: totalRes[0].count,
      presentToday: presentRes[0].count,
      lateArrivals: lateRes[0].count,
      avgShift: avgShift
    };
  } catch (err) {
    console.error('Stats error:', err);
    return { totalEmployees: 0, presentToday: 0, lateArrivals: 0, avgShift: '0h' };
  }
}

// Admin constants removed - create admin users through API

async function ensureDatabaseInitialized() {
  try {
    const testConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      multipleStatements: true,
    });
    await testConnection.query('SELECT 1');
    await testConnection.end();
  } catch (err: any) {
    if (err?.code === 'ER_BAD_DB_ERROR') {
      console.warn('attendance_db not found. Initializing schema from schema.sql...');
      const schemaSql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
      const initConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true,
      });
      await initConnection.query(schemaSql);
      await initConnection.end();
      console.log('Database schema initialized.');
    } else {
      throw err;
    }
  }
}

async function ensureAdminUserExists() {
  // Admin user creation removed - create admin users through the API
  console.log('Admin user auto-creation disabled - use API to create admin users.');
}

async function ensureDepartmentsSeeded() {
  // Department seeding removed - use API endpoints to add departments and units
  console.log('Department seeding disabled - use API to add data.');
}

// Routes - Views
app.get('/', (req, res) => {
  try {
    if (isAuthenticated(req)) {
      if (req.session.user.role === 'admin') {
        res.redirect('/dashboard');
      } else {
        res.redirect('/employee-dashboard');
      }
    } else {
      res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'login.html'));
    }
  } catch (err) {
    console.error('Root route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/login', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'login.html'));
  } catch (err) {
    console.error('Login route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/forgot-password', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'forgot-password.html'));
  } catch (err) {
    console.error('Forgot password route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/forgot-password.html', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'forgot-password.html'));
  } catch (err) {
    console.error('Forgot password route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/dashboard', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    if (req.session.user.role !== 'admin') return res.redirect('/employee-dashboard');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'dashboard.html'));
  } catch (err) {
    console.error('Dashboard route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/employee-dashboard', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'employee-dashboard.html'));
  } catch (err) {
    console.error('Employee dashboard route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Employee portal routes
app.get('/my-profile', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    if (req.session.user.role === 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'my-profile.html'));
  } catch (err) {
    console.error('My profile route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/my-attendance', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    if (req.session.user.role === 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'my-attendance.html'));
  } catch (err) {
    console.error('My attendance route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/communication', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    if (req.session.user.role === 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'communication.html'));
  } catch (err) {
    console.error('Communication route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/schedule', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    if (req.session.user.role === 'admin') return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'schedule.html'));
  } catch (err) {
    console.error('Schedule route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/realtime-metrics', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'realtime-metrics.html'));
  } catch (err) {
    console.error('Realtime metrics route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/attendance-tracking', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'attendance-tracking.html'));
  } catch (err) {
    console.error('Attendance tracking route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/reports', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'reports.html'));
  } catch (err) {
    console.error('Reports route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/employees', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'employees.html'));
  } catch (err) {
    console.error('Employees route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/departments', (req, res) => {
  try {
    if (!isAuthenticated(req)) return res.redirect('/');
    res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'departments.html'));
  } catch (err) {
    console.error('Departments route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API Endpoints
app.post('/api/login', async (req, res) => {
  const { identifier, password } = req.body;
  try {
    if (!pool) return res.status(500).json({ success: false, message: 'Database not connected' });
    
    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE email = ? OR usersname = ?',
      [identifier, identifier]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (isMatch) {
        req.session.user = { 
          id: user.user_id, 
          name: user.usersname, 
          role: user.role, 
          department: user.department || 'Unassigned'
        };
        return req.session.save((err: any) => {
          if (err) return res.status(500).json({ success: false, message: 'Session error' });
          res.json({ success: true, user: req.session.user });
        });
      }
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.post('/api/forgot-password/request-otp', async (req, res) => {
  const { identifier } = req.body;
  try {
    if (!pool) return res.status(500).json({ success: false, message: 'Database not connected' });

    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE email = ? OR phone = ? OR usersname = ?',
      [identifier, identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found. Please check your email, phone, or username.' });
    }

    const user = rows[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    // Store OTP in database
    await pool.query(
      'UPDATE users SET otp = ?, otp_expires_at = ? WHERE user_id = ?',
      [otp, expiresAt, user.user_id]
    );

    console.log(`OTP for ${user.usersname} (${user.email || user.phone}): ${otp} (expires at ${expiresAt})`);

    // In production, you would send this OTP via email or SMS
    // For now, we'll return it in the response for testing
    res.json({
      success: true,
      message: `OTP sent to ${user.email || user.phone}`,
      otp: otp, // Remove this in production!
      user: {
        name: user.usersname,
        email: user.email,
        phone: user.phone,
        security_question: user.security_question
      }
    });
  } catch (err) {
    console.error('Request OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  const { identifier, otp, securityAnswer, newPassword } = req.body;
  try {
    if (!pool) return res.status(500).json({ success: false, message: 'Database not connected' });

    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE email = ? OR phone = ? OR usersname = ?',
      [identifier, identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found. Please check your email, phone, or username.' });
    }

    const user = rows[0];

    // Verify OTP
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // Check if OTP has expired
    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Verify security answer if user has a security question set up
    if (user.security_question) {
      if (!securityAnswer) {
        return res.status(400).json({ success: false, message: 'Security answer is required.' });
      }
      // Case-insensitive comparison for security answer
      if (!user.security_answer || user.security_answer.toLowerCase() !== securityAnswer.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Incorrect security answer. Please try again.' });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    await pool.query(
      'UPDATE users SET password = ?, otp = NULL, otp_expires_at = NULL WHERE user_id = ?',
      [hashed, user.user_id]
    );

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
});

app.get('/api/employees', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT user_id as id, usersname as name, email, department, job_description as post, staff_type as status FROM users WHERE role = "employee"'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/attendance/:id', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { type, location_address } = req.body;
  try {
    await pool.query('UPDATE attendance SET type = ?, location_address = ? WHERE id = ?', [type, location_address, req.params.id]);
    const stats = await getStats();
    io.emit('attendance_update', { stats });
    res.json({ success: true, message: 'Record updated successfully' });
  } catch(err) {
    console.error('Update attendance error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.delete('/api/attendance/:id', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    await pool.query('DELETE FROM attendance WHERE id = ?', [req.params.id]);
    const stats = await getStats();
    io.emit('attendance_update', { stats });
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch(err) {
    console.error('Delete attendance error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.get('/api/attendance/:userId', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const [rows]: any = await pool.query(
      'SELECT id, type, timestamp, location_address FROM attendance WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50',
      [req.params.userId]
    );
    res.json(rows);
  } catch(err) {
    console.error('Fetch attendance by user error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/attendance', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(403).json({ message: 'Unauthorized' });
  try {
    const [rows] = await pool.query(
      'SELECT a.id, a.user_id, u.usersname as userName, a.type, a.timestamp, u.department, a.latitude, a.longitude, a.location_address FROM attendance a JOIN users u ON a.user_id = u.user_id ORDER BY a.timestamp DESC'
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Attendance API error:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

app.post('/api/attendance/checkin', async (req, res) => {
  if (!pool) return res.status(500).json({ success: false, message: "Database not connected" });
  if (!isAuthenticated(req)) return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    const { latitude, longitude, location_address } = req.body;
    const [lastRecord]: any = await pool.query(
      'SELECT type FROM attendance WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1',
      [req.session.user.id]
    );

    if (lastRecord.length > 0 && lastRecord[0].type === 'check-in') {
      return res.status(400).json({ success: false, message: 'Already checked in' });
    }

    await pool.query(
      'INSERT INTO attendance (user_id, type, timestamp, latitude, longitude, location_address) VALUES (?, "check-in", NOW(), ?, ?, ?)',
      [req.session.user.id, latitude || null, longitude || null, location_address || null]
    );

    const stats = await getStats();
    io.emit('attendance_update', { stats });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/attendance/checkout', async (req, res) => {
  if (!pool) return res.status(500).json({ success: false, message: "Database not connected" });
  if (!isAuthenticated(req)) return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    const [lastRecord]: any = await pool.query(
      'SELECT type FROM attendance WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1',
      [req.session.user.id]
    );

    if (!lastRecord.length || lastRecord[0].type === 'check-out') {
      return res.status(400).json({ success: false, message: 'Check in first' });
    }

    await pool.query(
      'INSERT INTO attendance (user_id, type, timestamp) VALUES (?, "check-out", NOW())',
      [req.session.user.id]
    );

    const stats = await getStats();
    io.emit('attendance_update', { stats });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/stats', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const stats = await getStats();
  res.json(stats);
});

app.get('/api/departments', async (req, res) => {
  try {
    const [directorates]: any = await pool.query('SELECT * FROM directorates');
    const [units]: any = await pool.query('SELECT * FROM units');
    
    // Get all users to calculate actual staff counts
    const [employees]: any = await pool.query('SELECT user_id, department, role FROM users');
    
    console.log('Total users:', employees.length);
    console.log('Units:', units.map((u: any) => u.name));
    console.log('Employee departments:', employees.map((e: any) => e.department));
    
    // Calculate staff count for each unit based on actual employees
    const unitsWithCount = units.map((u: any) => {
      const staffCount = employees.filter((e: any) => e.department === u.name).length;
      console.log(`Unit "${u.name}" has ${staffCount} employees`);
      return { ...u, staffCount };
    });
    
    const result = directorates.map((d: any) => ({
      ...d,
      subDepartments: unitsWithCount
        .filter((u: any) => u.directorate_id === d.id)
        .map((u: any) => ({ name: u.name, staffCount: u.staffCount }))
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Departments API error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const [positions]: any = await pool.query('SELECT * FROM positions ORDER BY category, title');
    res.json(positions);
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/realtime-metrics', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(403).json({ message: 'Unauthorized' });
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const [todayAttendance]: any = await pool.query('SELECT a.*, u.usersname as userName, u.department FROM attendance a JOIN users u ON a.user_id = u.user_id WHERE DATE(a.timestamp) = ?', [today]);
    const [totalEmployees]: any = await pool.query('SELECT COUNT(*) as count FROM users');
    
    const checkInsToday = todayAttendance.filter((a: any) => a.type === 'check-in').length;
    const checkOutsToday = todayAttendance.filter((a: any) => a.type === 'check-out').length;
    const activeNow = checkInsToday - checkOutsToday;
    
    const [lateRes]: any = await pool.query('SELECT COUNT(*) as count FROM attendance WHERE DATE(timestamp) = ? AND type = "check-in" AND TIME(timestamp) > "08:30:00"', [today]);
    const lateArrivals = lateRes[0].count;
    const efficiencyRate = checkInsToday > 0 ? Math.round(((checkInsToday - lateArrivals) / checkInsToday) * 100) : 0;
    
    const absentToday = Math.max(0, totalEmployees[0].count - checkInsToday);

    // Hourly Activity
    const hourlyActivity = Array(24).fill(0);
    todayAttendance.filter((a: any) => a.type === 'check-in').forEach((a: any) => {
      const hour = new Date(a.timestamp).getHours();
      hourlyActivity[hour]++;
    });

    // Department Activity
    const [directorates]: any = await pool.query('SELECT id, name FROM directorates');
    const departmentActivity = directorates.map((d: any) => {
        const count = todayAttendance.filter((a: any) => a.directorate_id === d.id && a.type === 'check-in').length;
        return { name: d.name, count: count };
    });
    
    res.json({
      activeNow: Math.max(0, activeNow),
      checkinsToday: checkInsToday,
      checkoutsToday: checkOutsToday,
      lateArrivals: lateArrivals,
      absentToday: absentToday,
      efficiencyRate: efficiencyRate,
      hourlyActivity: hourlyActivity.map((count, hour) => ({ hour: `${hour}:00`, count })),
      departmentActivity: departmentActivity,
      recentAttendance: todayAttendance.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    });
  } catch (err) {
    console.error('Realtime metrics error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/monthly-report', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(403).json({ message: 'Unauthorized' });
  
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ message: 'Params missing' });
  
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
    
    const [rows]: any = await pool.query(`
      SELECT u.user_id as id, u.usersname as name, u.department,
             COUNT(CASE WHEN a.type = 'check-in' THEN 1 END) as daysPresent,
             COUNT(CASE WHEN a.type = 'check-in' AND TIME(a.timestamp) > '08:30:00' THEN 1 END) as lateArrivals
      FROM users u
      LEFT JOIN attendance a ON u.user_id = a.user_id AND DATE(a.timestamp) BETWEEN ? AND ?
      WHERE u.role = 'employee'
      GROUP BY u.user_id, u.usersname, u.department
    `, [startDate, endDate]);

    const employees = rows.map((r: any) => ({
        ...r,
        daysAbsent: 0, // Calculate based on actual working days
        earlyDepartures: 0,
        attendanceRate: r.daysPresent > 0 ? Math.round((r.daysPresent / 22) * 100) : 0
    }));

    res.json({
      summary: { totalWorkingDays: 22, avgAttendance: employees.length > 0 ? Math.round(employees.reduce((acc: any, e: any) => acc + e.attendanceRate, 0) / employees.length) : 0, lateArrivals: employees.reduce((acc: any, e: any) => acc + e.lateArrivals, 0) },
      performance: { bestPerformer: employees.length > 0 ? employees.reduce((prev: any, current: any) => (prev.attendanceRate > current.attendanceRate) ? prev : current).name : '-', needsImprovement: employees.length > 0 ? employees.reduce((prev: any, current: any) => (prev.attendanceRate < current.attendanceRate) ? prev : current).name : '-', perfectAttendance: employees.filter((e: any) => e.attendanceRate >= 95).length },
      trends: { vsLastMonth: 'N/A', peakDay: 'N/A', lowestDay: 'N/A' },
      employees: employees
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/config', (req, res) => {
  if (!isAuthenticated(req)) return res.status(403).json({ message: 'Unauthorized' });
  res.json({
    geminiApiKey: process.env.GEMINI_API_KEY,
    userRole: req.session.user.role
  });
});

app.get('/api/user', (req, res) => {
  if (!isAuthenticated(req)) return res.status(403).json({ message: 'Unauthorized' });
  res.json({
    id: req.session.user.id,
    name: req.session.user.name,
    role: req.session.user.role,
    department: req.session.user.department,
    employeeId: "N/A"
  });
});

app.post('/api/employees', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { name, email, password, department, post, role, staff_type, employee_id } = req.body;

  // Validate EC number format (6 digits + 1 uppercase letter + 2 digits)
  // Only validate if employee_id is provided and not empty
  if (employee_id !== undefined && employee_id !== null && employee_id.trim() !== '' && !/^[0-9]{6}[A-Z][0-9]{2}$/.test(employee_id)) {
    return res.status(400).json({ success: false, message: 'EC number must be in format: 6 digits + 1 letter + 2 digits (e.g. 277739H78)' });
  }
  
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }
  
  if (!department) {
    return res.status(400).json({ success: false, message: 'Department is required' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (usersname, email, password, department, job_description, role, staff_type, employee_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashed, department, post, role || "employee", staff_type || "permanent", employee_id || null]
    );
    res.json({ success: true, message: 'Employee added successfully' });
  } catch (err) {
    console.error('Add employee error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { name, email, department, post, role, staff_type, employee_id } = req.body;
  const userId = req.params.id;

  // Validate EC number format (6 digits + 1 uppercase letter + 2 digits)
  // Only validate if employee_id is provided and not empty
  if (employee_id !== undefined && employee_id !== null && employee_id.trim() !== '' && !/^[0-9]{6}[A-Z][0-9]{2}$/.test(employee_id)) {
    return res.status(400).json({ success: false, message: 'EC number must be in format: 6 digits + 1 letter + 2 digits (e.g. 277739H78)' });
  }
  
  try {
    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name) {
      updates.push('usersname = ?');
      values.push(name);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (department) {
      updates.push('department = ?');
      values.push(department);
    }
    if (post !== undefined) {
      updates.push('job_description = ?');
      values.push(post);
    }
    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (staff_type !== undefined) {
      updates.push('staff_type = ?');
      values.push(staff_type);
    }
    if (employee_id !== undefined) {
      updates.push('employee_id = ?');
      values.push(employee_id);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    values.push(userId);
    
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );
    
    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (err: any) {
    console.error('Update employee error:', err);
    res.status(500).json({ success: false, message: 'Database error', error: err?.message || 'Unknown error' });
  }
});

app.post('/api/departments', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { id, name, icon, color } = req.body;
  try {
    await pool.query(
      'INSERT INTO directorates (id, name, icon, color) VALUES (?, ?, ?, ?)',
      [id, name, icon || 'building', color || 'emerald']
    );
    res.json({ success: true, message: 'Department added successfully' });
  } catch (err) {
    console.error('Add department error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.put('/api/departments/:id', async (req, res) => {
   if (!isAuthenticated(req) || req.session.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
   const { name, icon, color } = req.body;
   try {
     await pool.query('UPDATE directorates SET name = ?, icon = ?, color = ? WHERE id = ?', [name, icon, color, req.params.id]);
     res.json({ success: true, message: 'Department updated successfully' });
   } catch(err) {
     console.error('Edit department error:', err);
     res.status(500).json({ success: false, message: 'Database error' });
   }
});

app.delete('/api/departments/:id', async (req, res) => {
   if (!isAuthenticated(req) || req.session.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
   try {
     await pool.query('DELETE FROM directorates WHERE id = ?', [req.params.id]);
     res.json({ success: true, message: 'Department deleted successfully' });
   } catch(err) {
     console.error('Delete department error:', err);
     res.status(500).json({ success: false, message: 'Database error' });
   }
});

// Employee Dashboard API Endpoints
app.get('/api/user/profile', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not connected' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
    console.log('[Profile API] User ID from session:', req.session.user.id);
    const [rows]: any = await pool.query(
      'SELECT user_id as id, usersname as name, email, department, job_description as post, role, staff_type, employee_id, phone, address, employment_date, security_question, security_answer FROM users WHERE user_id = ?',
      [req.session.user.id]
    );
    console.log('[Profile API] Query result:', rows);
    if (rows.length > 0) {
      const user = rows[0];
      console.log('[Profile API] User data:', user);
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        post: user.post,
        role: user.role,
        staff_type: user.staff_type,
        employee_id: user.employee_id,
        phone: user.phone,
        address: user.address,
        employment_date: user.employment_date,
        security_question: user.security_question,
        security_answer: user.security_answer
      });
    }
    res.status(404).json({ message: 'User not found' });
  } catch (err: any) {
    console.error('Get user profile error:', {
      error: err,
      message: err?.message,
      code: err?.code,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage,
      userId: req.session.user?.id
    });
    res.status(500).json({ message: 'Database error', error: err?.message });
  }
});

app.put('/api/user/profile', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(403).json({ message: 'Unauthorized' });

  const { email, phone, address, department, job_description, name, employee_id, security_question, security_answer } = req.body;

  try {
    // Build dynamic update query based on provided fields
    const updates = [];
    const values = [];
    
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department);
    }
    if (job_description !== undefined) {
      updates.push('job_description = ?');
      values.push(job_description);
    }
    if (name !== undefined) {
      updates.push('usersname = ?');
      values.push(name);
    }
    if (employee_id !== undefined) {
      updates.push('employee_id = ?');
      values.push(employee_id);
    }
    if (security_question !== undefined) {
      updates.push('security_question = ?');
      values.push(security_question);
    }
    if (security_answer !== undefined) {
      updates.push('security_answer = ?');
      values.push(security_answer);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(req.session.user.id);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`;
    await pool.query(query, values);
    
    console.log('[Profile Update] User profile updated:', {
      userId: req.session.user.id,
      updates: updates
    });
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update user profile error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.get('/api/user/stats', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not connected' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const [presentRes]: any = await pool.query(
      'SELECT COUNT(DISTINCT DATE(timestamp)) as count FROM attendance WHERE user_id = ? AND type = "check-in" AND MONTH(timestamp) = ? AND YEAR(timestamp) = ?',
      [req.session.user.id, currentMonth, currentYear]
    );
    
    // PERMANENT FIX: Fetch records ASC and pair them properly with validation
    const [rows]: any = await pool.query(
      'SELECT type, timestamp FROM attendance WHERE user_id = ? AND MONTH(timestamp) = ? AND YEAR(timestamp) = ? ORDER BY timestamp ASC',
      [req.session.user.id, currentMonth, currentYear]
    );
    
    console.log('[DEBUG] Stats - Total records fetched:', rows.length);
    console.log('[DEBUG] Stats - Records:', rows);
    
    // Group by date and pair records
    const dailyRecords = new Map();
    rows.forEach((record: any) => {
      if (!record.timestamp) return;
      const timestampStr = record.timestamp instanceof Date ? record.timestamp.toISOString() : String(record.timestamp);
      const date = timestampStr.split('T')[0];
      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, []);
      }
      dailyRecords.get(date).push(record);
    });
    
    console.log('[DEBUG] Stats - Daily records grouped:', dailyRecords.size, 'days');
    dailyRecords.forEach((dayRecords: any[], date: string) => {
      console.log('[DEBUG] Stats - Date:', date, 'Records:', dayRecords.length, dayRecords.map((r: any) => r.type));
    });
    
    // Calculate hours with flexible pairing
    let hoursWorked = 0;
    dailyRecords.forEach((dayRecords: any[], date: string) => {
      // Flexible pairing: pair each check-out with the most recent check-in
      let lastCheckIn: any = null;
      let lastCheckInTimestamp: Date | null = null;
      
      dayRecords.forEach((record: any) => {
        if (record.type === 'check-in') {
          // Store the most recent check-in
          lastCheckIn = record;
          lastCheckInTimestamp = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
        } else if (record.type === 'check-out') {
          // Pair this check-out with the most recent check-in
          if (lastCheckIn && lastCheckInTimestamp) {
            const checkOutDate = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
            
            // Validate: check-out must come after check-in
            if (checkOutDate.getTime() > lastCheckInTimestamp.getTime()) {
              // Calculate hours for this pair
              const hours = (checkOutDate.getTime() - lastCheckInTimestamp.getTime()) / (1000 * 60 * 60);
              hoursWorked += hours;
            } else {
              console.warn('[Stats Validation] Check-out timestamp is not after check-in for date', date);
            }
            
            // Reset last check-in after pairing
            lastCheckIn = null;
            lastCheckInTimestamp = null;
          } else {
            console.warn('[Stats Validation] Check-out without preceding check-in for date', date);
          }
        }
      });
    });
    
    const [lateRes]: any = await pool.query(
      'SELECT COUNT(*) as count FROM attendance WHERE user_id = ? AND type = "check-in" AND MONTH(timestamp) = ? AND YEAR(timestamp) = ? AND TIME(timestamp) > "08:30:00"',
      [req.session.user.id, currentMonth, currentYear]
    );
    
    const daysPresent = presentRes[0]?.count || 0;
    const lateArrivals = lateRes[0]?.count || 0;
    const workingDays = 22;
    const attendanceRate = Math.round((daysPresent / workingDays) * 100);
    
    return res.json({
      daysPresent,
      hoursWorked: Math.round(hoursWorked * 10) / 10,
      lateArrivals,
      attendanceRate
    });
  } catch (err) {
    console.error('Get user stats error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/user/attendance', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not connected' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
    
    const [rows]: any = await pool.query(
      'SELECT type, timestamp, location_address FROM attendance WHERE user_id = ? ORDER BY timestamp ASC LIMIT 50',
      [req.session.user.id]
    );
    
    // PERMANENT FIX: Always sort ASC before processing (already done in query)
    // Group by date and pair records properly
    const dailyRecords = new Map();
    rows.forEach((record: any) => {
      if (!record.timestamp) return;
      const timestampStr = record.timestamp instanceof Date ? record.timestamp.toISOString() : String(record.timestamp);
      const date = timestampStr.split('T')[0];
      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, []);
      }
      dailyRecords.get(date).push(record);
    });
    
    // Process each day's records with flexible pairing
    const result: any[] = [];
    dailyRecords.forEach((dayRecords: any[], date: string) => {
      // Records are already sorted ASC from query
      let totalHours = 0;
      let checkInTime: string | null = null;
      let checkOutTime: string | null = null;
      let checkInTimestamp: Date | null = null;
      let location_address = 'Unknown';
      let status = 'absent';
      
      // Flexible pairing: pair each check-out with the most recent check-in
      let lastCheckIn: any = null;
      let lastCheckInTimestamp: Date | null = null;
      
      dayRecords.forEach((record: any) => {
        if (record.type === 'check-in') {
          // Store the most recent check-in
          lastCheckIn = record;
          lastCheckInTimestamp = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
          
          // Update check-in time for display (most recent check-in)
          if (lastCheckInTimestamp) {
            checkInTime = lastCheckInTimestamp.toTimeString().slice(0, 5);
            checkInTimestamp = lastCheckInTimestamp;
            location_address = record.location_address || location_address;
            status = 'present';
            
            if (lastCheckInTimestamp.toTimeString().slice(0, 8) > '08:30:00') {
              status = 'late';
            }
          }
        } else if (record.type === 'check-out') {
          // Pair this check-out with the most recent check-in
          if (lastCheckIn && lastCheckInTimestamp) {
            const checkOutDate = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
            
            // Validate: check-out must come after check-in
            if (checkOutDate.getTime() > lastCheckInTimestamp.getTime()) {
              // Calculate hours for this pair
              const hours = (checkOutDate.getTime() - lastCheckInTimestamp.getTime()) / (1000 * 60 * 60);
              totalHours += hours;
              
              // Update check-out time to the last check-out
              checkOutTime = checkOutDate.toTimeString().slice(0, 5);
              
              console.log('[Hours Calculation]', {
                date,
                checkIn: lastCheckInTimestamp,
                checkOut: checkOutDate,
                hoursCalculated: hours,
                totalHours
              });
            } else {
              console.warn('[Attendance Validation] Check-out timestamp is not after check-in for date', date);
            }
            
            // Reset last check-in after pairing
            lastCheckIn = null;
            lastCheckInTimestamp = null;
          } else {
            console.warn('[Attendance Validation] Check-out without preceding check-in for date', date);
          }
        }
      });
      
      result.push({
        timestamp: date,
        checkInTime,
        checkOutTime,
        hoursWorked: Math.round(totalHours * 10) / 10,
        location_address,
        status
      });
    });
    
    // Reverse for display (newest first)
    result.reverse();
    return res.json(result);
  } catch (err) {
    console.error('Get user attendance error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Today Status API
app.get('/api/user/today-status', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not connected' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
    
    const today = new Date().toISOString().split('T')[0];
    const [rows]: any = await pool.query(
      'SELECT type, timestamp FROM attendance WHERE user_id = ? AND DATE(timestamp) = ? ORDER BY timestamp ASC',
      [req.session.user.id, today]
    );
    let checkInTime: string | null = null;
    let checkOutTime: string | null = null;
    rows.forEach((record: any) => {
      const time = new Date(record.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      if (record.type === 'check-in') checkInTime = time;
      if (record.type === 'check-out') checkOutTime = time;
    });
    const lastRecord = rows[rows.length - 1];
    const status = !lastRecord ? 'Not Clocked In' : lastRecord.type === 'check-in' ? 'Clocked In' : 'Clocked Out';
    return res.json({ checkInTime, checkOutTime, status });
  } catch (err) {
    console.error('Get today status error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Download Attendance History as CSV
app.get('/api/user/attendance/download', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: 'Database not connected' });
    if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
    
    const { month, year } = req.query;
    let startDate: string;
    let endDate: string;
    
    if (month && year) {
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
    } else {
      // Default to current month
      const now = new Date();
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    
    // PERMANENT FIX: Always sort ASC before processing
    const [rows]: any = await pool.query(
      'SELECT type, timestamp, location_address FROM attendance WHERE user_id = ? AND DATE(timestamp) BETWEEN ? AND ? ORDER BY timestamp ASC',
      [req.session.user.id, startDate, endDate]
    );
    
    // Get user info for the filename
    const [userRows]: any = await pool.query(
      'SELECT usersname, employee_id FROM users WHERE user_id = ?',
      [req.session.user.id]
    );
    const user = userRows[0];
    
    // PERMANENT FIX: Group by date and pair records properly with validation
    const dailyRecords = new Map();
    rows.forEach((record: any) => {
      if (!record.timestamp) return;
      const timestampStr = record.timestamp instanceof Date ? record.timestamp.toISOString() : String(record.timestamp);
      const date = timestampStr.split('T')[0];
      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, []);
      }
      dailyRecords.get(date).push(record);
    });
    
    // Process each day's records with flexible pairing
    const result: any[] = [];
    dailyRecords.forEach((dayRecords: any[], date: string) => {
      // Records are already sorted ASC from query
      let totalHours = 0;
      let checkInTime: string | null = null;
      let checkOutTime: string | null = null;
      let checkInTimestamp: Date | null = null;
      let location = 'Unknown';
      let status = 'absent';
      
      // Flexible pairing: pair each check-out with the most recent check-in
      let lastCheckIn: any = null;
      let lastCheckInTimestamp: Date | null = null;
      
      dayRecords.forEach((record: any) => {
        if (record.type === 'check-in') {
          // Store the most recent check-in
          lastCheckIn = record;
          lastCheckInTimestamp = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
          
          // Set first check-in time for display
          if (!checkInTime && lastCheckInTimestamp) {
            checkInTime = lastCheckInTimestamp.toTimeString().slice(0, 5);
            checkInTimestamp = lastCheckInTimestamp;
            location = record.location_address || location;
            status = 'present';
            
            if (lastCheckInTimestamp.toTimeString().slice(0, 8) > '08:30:00') {
              status = 'late';
            }
          }
        } else if (record.type === 'check-out') {
          // Pair this check-out with the most recent check-in
          if (lastCheckIn && lastCheckInTimestamp) {
            const checkOutDate = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
            
            // Validate: check-out must come after check-in
            if (checkOutDate.getTime() > lastCheckInTimestamp.getTime()) {
              // Calculate hours for this pair
              const hours = (checkOutDate.getTime() - lastCheckInTimestamp.getTime()) / (1000 * 60 * 60);
              totalHours += hours;
              
              // Update check-out time to the last check-out
              checkOutTime = checkOutDate.toTimeString().slice(0, 5);
              
              console.log('[Hours Calculation]', {
                date,
                checkIn: lastCheckInTimestamp,
                checkOut: checkOutDate,
                hoursCalculated: hours,
                totalHours
              });
            } else {
              console.warn('[Attendance Validation] Check-out timestamp is not after check-in for date', date);
            }
            
            // Reset last check-in after pairing
            lastCheckIn = null;
            lastCheckInTimestamp = null;
          } else {
            console.warn('[Attendance Validation] Check-out without preceding check-in for date', date);
          }
        }
      });
      
      result.push({
        date,
        checkInTime,
        checkOutTime,
        hoursWorked: Math.round(totalHours * 10) / 10,
        location,
        status
      });
    });
    
    // Generate CSV
    const csvHeader = 'Date,Check In,Check Out,Total Hours,Location,Status\n';
    const csvRows = result.map(r => 
      `${r.date},${r.checkInTime || '--:--'},${r.checkOutTime || '--:--'},${r.hoursWorked > 0 ? r.hoursWorked + 'h' : '-'},${r.location},${r.status}`
    ).join('\n');
    
    const csv = csvHeader + csvRows;
    
    // Set headers for CSV download
    const filename = `attendance_history_${user.employee_id || user.usersname.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    
  } catch (err) {
    console.error('Download attendance history error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/user/monthly-report', async (req, res) => {
  if (!pool) return res.status(500).json({ message: 'Database not connected' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
  
  const { month, year, format } = req.query;
  if (!month || !year) return res.status(400).json({ message: 'Params missing' });
  
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
    
    // PERMANENT FIX: Always sort ASC before processing
    const [rows]: any = await pool.query(
      'SELECT type, timestamp FROM attendance WHERE user_id = ? AND DATE(timestamp) BETWEEN ? AND ? ORDER BY timestamp ASC',
      [req.session.user!.id, startDate, endDate]
    );
    
    // PERMANENT FIX: Group by date and pair records properly with validation
    const dailyRecords = new Map();
    rows.forEach((record: any) => {
      if (!record.timestamp) return;
      const timestampStr = record.timestamp instanceof Date ? record.timestamp.toISOString() : String(record.timestamp);
      const date = timestampStr.split('T')[0];
      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, []);
      }
      dailyRecords.get(date).push(record);
    });
    
    let daysPresent = 0;
    let daysAbsent = 0;
    let lateArrivals = 0;
    let totalHours = 0;
    
    // Process each day's records with flexible pairing
    dailyRecords.forEach((dayRecords: any[], date: string) => {
      // Records are already sorted ASC from query
      let dayHasValidPair = false;
      let firstCheckIn: Date | null = null;
      
      // Flexible pairing: pair each check-out with the most recent check-in
      let lastCheckIn: any = null;
      let lastCheckInTimestamp: Date | null = null;
      
      dayRecords.forEach((record: any) => {
        if (record.type === 'check-in') {
          // Store the most recent check-in
          lastCheckIn = record;
          lastCheckInTimestamp = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
          
          // Store first check-in for late check detection
          if (!firstCheckIn) {
            firstCheckIn = lastCheckInTimestamp;
          }
        } else if (record.type === 'check-out') {
          // Pair this check-out with the most recent check-in
          if (lastCheckIn && lastCheckInTimestamp) {
            const checkOutDate = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
            
            // Validate: check-out must come after check-in
            if (checkOutDate.getTime() > lastCheckInTimestamp.getTime()) {
              // Valid pair found
              dayHasValidPair = true;
              daysPresent++;
              
              // Check if late (using first check-in of the day)
              if (firstCheckIn && firstCheckIn.toTimeString().slice(0, 8) > '08:30:00') {
                lateArrivals++;
              }
              
              // Calculate hours for this pair
              const hours = (checkOutDate.getTime() - lastCheckInTimestamp.getTime()) / (1000 * 60 * 60);
              totalHours += hours;
            } else {
              console.warn('[Monthly Report Validation] Check-out timestamp is not after check-in for date', date);
            }
            
            // Reset last check-in after pairing
            lastCheckIn = null;
            lastCheckInTimestamp = null;
          } else {
            console.warn('[Monthly Report Validation] Check-out without preceding check-in for date', date);
          }
        }
      });
      
      if (!dayHasValidPair) {
        daysAbsent++;
      }
    });
    
    const workingDays = Math.min(daysPresent + daysAbsent, 22);
    const attendanceRate = workingDays > 0 ? Math.round((daysPresent / workingDays) * 100) : 0;
    const punctualityRate = daysPresent > 0 ? Math.round(((daysPresent - lateArrivals) / daysPresent) * 100) : 0;
    const avgHours = daysPresent > 0 ? Math.round((totalHours / daysPresent) * 10) / 10 : 0;
    
    // Calculate overtime (hours > 8 per day) - re-calculate with flexible pairing
    let overtime = 0;
    dailyRecords.forEach((dayRecords: any[], date: string) => {
      let dayTotalHours = 0;
      
      // Flexible pairing: pair each check-out with the most recent check-in
      let lastCheckIn: any = null;
      let lastCheckInTimestamp: Date | null = null;
      
      dayRecords.forEach((record: any) => {
        if (record.type === 'check-in') {
          // Store the most recent check-in
          lastCheckIn = record;
          lastCheckInTimestamp = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
        } else if (record.type === 'check-out') {
          // Pair this check-out with the most recent check-in
          if (lastCheckIn && lastCheckInTimestamp) {
            const checkOutDate = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
            
            // Validate: check-out must come after check-in
            if (checkOutDate.getTime() > lastCheckInTimestamp.getTime()) {
              const hours = (checkOutDate.getTime() - lastCheckInTimestamp.getTime()) / (1000 * 60 * 60);
              dayTotalHours += hours;
            }
            
            // Reset last check-in after pairing
            lastCheckIn = null;
            lastCheckInTimestamp = null;
          }
        }
      });
      
      if (dayTotalHours > 8) {
        overtime += dayTotalHours - 8;
      }
    });
    
    const reportData = {
      daysPresent,
      daysAbsent,
      lateArrivals,
      totalHours: Math.round(totalHours * 10) / 10,
      avgHours,
      overtime: Math.round(overtime * 10) / 10,
      attendanceRate,
      punctualityRate,
      status: attendanceRate >= 95 ? 'Excellent' : attendanceRate >= 85 ? 'Good' : 'Needs Improvement'
    };
    
    if (format === 'pdf') {
      res.json(reportData);
    } else {
      res.json(reportData);
    }
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Facial Recognition API
app.post('/api/attendance/facial-recognition', async (req, res) => {
  if (!pool) return res.status(500).json({ message: 'Database not connected' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const { image } = req.body;
    
    // Mock facial recognition verification
    // In a real implementation, this would use a facial recognition service
    // For now, we'll simulate successful verification
    
    const timestamp = new Date().toISOString();
    
    // Record attendance with facial recognition method
    if (isAuthenticated(req)) {
      await pool.query(
        'INSERT INTO attendance (user_id, type, timestamp, method, verification_status) VALUES (?, ?, ?, ?, ?)',
        [req.session.user.id, 'check-in', timestamp, 'facial_recognition', 'verified']
      );
      
      // Emit real-time update
      io.emit('attendance_update', {
        userId: req.session.user.id,
        action: 'check-in',
        method: 'facial_recognition',
        timestamp
      });
    }
    
    res.json({ success: true, message: 'Facial recognition successful' });
  } catch (err) {
    console.error('Facial recognition error:', err);
    res.status(500).json({ message: 'Facial recognition failed' });
  }
});

// Manual Clock In API
app.post('/api/attendance/manual-clock', async (req, res) => {
  if (!pool) return res.status(500).json({ message: 'Database not connected' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const { time, reason, comments } = req.body;
    
    // Create manual clock in request for supervisor approval
    const requestId = uuidv4();
    if (isAuthenticated(req)) {
      await pool.query(
        'INSERT INTO manual_clock_requests (id, user_id, requested_time, reason, comments, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [requestId, req.session.user.id, time, reason, comments, 'pending', new Date().toISOString()]
      );
      
      // Emit notification to supervisors
      io.emit('new_manual_request', {
        requestId,
        userId: req.session.user.id,
        userName: req.session.user.name,
        requestedTime: time,
        reason,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true, message: 'Manual clock in request submitted for approval' });
  } catch (err) {
    console.error('Manual clock in error:', err);
    res.status(500).json({ message: 'Failed to submit manual clock in request' });
  }
});

// Notifications API
app.get('/api/user/notifications', async (req, res) => {
  if (!pool) return res.status(500).json({ message: 'Database not connected' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [isAuthenticated(req) ? req.session.user.id : 0]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Audit Logs API
app.get('/api/user/audit-logs', async (req, res) => {
  if (!pool) return res.status(500).json({ message: 'Database not connected' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20',
      [isAuthenticated(req) ? req.session.user.id : 0]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Announcements API
app.get('/api/user/announcements', async (req, res) => {
  if (!pool) return res.status(500).json({ message: 'Database not connected' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userDepartment = req.session.user.department || 'all';
    const [rows]: any = await pool.query(
      'SELECT * FROM announcements WHERE department = ? OR department = ? ORDER BY created_at DESC LIMIT 20',
      [userDepartment, 'all']
    );

    res.json(rows || []);
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Leave Request API
app.post('/api/user/leave-request', async (req, res) => {
  if (!pool) return res.status(500).json({ message: 'Database not connected' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { type, startDate, endDate, reason } = req.body;
    const requestId = uuidv4();

    if (isAuthenticated(req)) {
      await pool.query(
        'INSERT INTO leave_requests (id, user_id, type, start_date, end_date, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [requestId, req.session.user.id, type, startDate, endDate, reason, 'pending', new Date().toISOString()]
      );

      // Emit notification to managers
      io.emit('new_leave_request', {
        requestId,
        userId: req.session.user.id,
        userName: req.session.user.name,
        type,
        startDate,
        endDate,
        reason,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Leave request submitted successfully' });
  } catch (err) {
    console.error('Leave request error:', err);
    res.status(500).json({ message: 'Failed to submit leave request' });
  }
});

// Get all leave requests (admin only)
app.get('/api/admin/leave-requests', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  try {
    const [rows]: any = await pool.query(`
      SELECT lr.*, u.usersname as userName, u.department, u.employee_id
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.user_id
      ORDER BY lr.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get leave requests error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Update leave request status (approve/reject)
app.put('/api/admin/leave-requests/:id', async (req, res) => {
  if (!isAuthenticated(req) || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get the leave request details to create announcement
    const [requestRows]: any = await pool.query(
      'SELECT lr.*, u.usersname as userName, u.department FROM leave_requests lr JOIN users u ON lr.user_id = u.user_id WHERE lr.id = ?',
      [req.params.id]
    );

    if (requestRows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const request = requestRows[0];

    // Update the leave request status
    await pool.query(
      'UPDATE leave_requests SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    // Create an announcement for the employee
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';
    const title = `Leave Request ${statusText}`;
    const message = `Your ${request.type} leave request from ${new Date(request.start_date).toLocaleDateString()} to ${new Date(request.end_date).toLocaleDateString()} has been ${statusText.toLowerCase()}.`;

    await pool.query(
      'INSERT INTO announcements (title, message, department, priority, created_at) VALUES (?, ?, ?, ?, ?)',
      [title, message, request.department, status === 'approved' ? 'high' : 'medium', new Date().toISOString()]
    );

    io.emit('leave_request_updated', { id: req.params.id, status });
    io.emit('new_announcement', { title, message, department: request.department });

    res.json({ success: true, message: 'Leave request updated successfully' });
  } catch (err) {
    console.error('Update leave request error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Shift Swap Request API
app.post('/api/user/shift-swap', async (req, res) => {
  if (!pool) return res.status(500).json({ message: 'Database not connected' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const { currentShiftDate, preferredSwapDate, reason } = req.body;
    const requestId = uuidv4();
    
    if (isAuthenticated(req)) {
      await pool.query(
        'INSERT INTO shift_swap_requests (id, user_id, current_shift_date, preferred_swap_date, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [requestId, req.session.user.id, currentShiftDate, preferredSwapDate, reason, 'pending', new Date().toISOString()]
      );
      
      // Emit notification to managers
      io.emit('new_shift_swap_request', {
        requestId,
        userId: req.session.user.id,
        userName: req.session.user.name,
        currentShiftDate,
        preferredSwapDate,
        reason,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true, message: 'Shift swap request submitted successfully' });
  } catch (err) {
    console.error('Shift swap request error:', err);
    res.status(500).json({ message: 'Failed to submit shift swap request' });
  }
});

// Multer error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.error('[Photo Upload] Multer error:', {
      code: err.code,
      field: err.field,
      message: err.message
    });
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File size exceeds 5MB limit' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, message: 'Unexpected file field' });
    }
    return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
  }
  
  if (err && err.message === 'Only image files (JPEG, PNG, GIF, WebP) are allowed') {
    console.error('[Photo Upload] Invalid file type error');
    return res.status(400).json({ success: false, message: err.message });
  }
  
  next(err);
});

// User Photo API
app.post('/api/user/photo', upload.single('photo'), async (req, res) => {
  console.log('[Photo Upload] POST request received');
  
  if (!pool) {
    console.error('[Photo Upload] Database not connected');
    return res.status(500).json({ success: false, message: 'Database not connected' });
  }
  if (!isAuthenticated(req)) {
    console.error('[Photo Upload] Unauthorized access attempt');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  let uploadedFilePath = null;
  
  try {
    if (!req.file) {
      console.error('[Photo Upload] No file uploaded in request');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('[Photo Upload] File received:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    uploadedFilePath = req.file.path;
    
    // Validate file was actually saved to disk
    try {
      await fs.access(uploadedFilePath);
      const stats = await fs.stat(uploadedFilePath);
      console.log('[Photo Upload] File saved to disk:', {
        path: uploadedFilePath,
        size: stats.size,
        exists: true
      });
    } catch (accessErr) {
      console.error('[Photo Upload] File not accessible after upload:', accessErr);
      return res.status(500).json({ success: false, message: 'File upload failed - file not accessible' });
    }

    // Save photo path to database
    const photoPath = '/uploads/' + req.file.filename;
    console.log('[Photo Upload] Updating database for user:', req.session.user.id, 'with path:', photoPath);
    
    const [result] = await pool.query(
      'UPDATE users SET profile_photo = ? WHERE user_id = ?',
      [photoPath, req.session.user.id]
    );
    
    console.log('[Photo Upload] Database update result:', result);

    if ((result as any).affectedRows === 0) {
      console.error('[Photo Upload] No rows updated in database for user:', req.session.user.id);
      // Clean up uploaded file since DB update failed
      await fs.unlink(uploadedFilePath).catch(unlinkErr => 
        console.error('[Photo Upload] Failed to cleanup file after DB error:', unlinkErr)
      );
      return res.status(500).json({ success: false, message: 'Failed to update database' });
    }

    console.log('[Photo Upload] Upload successful for user:', req.session.user.id);
    res.json({ success: true, photoUrl: photoPath });
  } catch (err) {
    console.error('[Photo Upload] Upload error:', {
      error: err,
      message: (err as Error).message,
      stack: (err as Error).stack,
      userId: req.session.user?.id
    });
    
    // Clean up uploaded file if it exists
    if (uploadedFilePath) {
      try {
        await fs.unlink(uploadedFilePath);
        console.log('[Photo Upload] Cleaned up uploaded file after error:', uploadedFilePath);
      } catch (unlinkErr) {
        console.error('[Photo Upload] Failed to cleanup file after error:', unlinkErr);
      }
    }
    
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
});

app.get('/api/user/photo', async (req, res) => {
  console.log('[Photo Upload] GET request received for user:', req.session.user?.id);
  
  if (!pool) {
    console.error('[Photo Upload] Database not connected on GET');
    return res.status(500).json({ message: 'Database not connected' });
  }
  if (!isAuthenticated(req)) {
    console.error('[Photo Upload] Unauthorized GET request');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    // Check if user has a custom profile photo in database
    const [rows]: any = await pool.query(
      'SELECT profile_photo FROM users WHERE user_id = ?',
      [req.session.user.id]
    );

    console.log('[Photo Upload] Database query result:', {
      userId: req.session.user.id,
      rowsFound: rows.length,
      hasPhoto: rows.length > 0 && rows[0].profile_photo
    });

    if (rows.length > 0 && rows[0].profile_photo) {
      const dbPhotoPath = rows[0].profile_photo;
      console.log('[Photo Upload] Photo path from database:', dbPhotoPath);
      
      // Validate path format
      if (!dbPhotoPath.startsWith('/uploads/') || !dbPhotoPath.includes('.')) {
        console.error('[Photo Upload] Invalid photo path format:', dbPhotoPath);
      } else {
        // Serve the user's uploaded photo
        const photoPath = path.join(__dirname, 'public', dbPhotoPath);
        console.log('[Photo Upload] Attempting to serve file:', photoPath);
        
        try {
          await fs.access(photoPath);
          const stats = await fs.stat(photoPath);
          console.log('[Photo Upload] File found and accessible:', {
            path: photoPath,
            size: stats.size
          });
          return res.sendFile(photoPath);
        } catch (accessErr) {
          console.error('[Photo Upload] File not accessible:', {
            path: photoPath,
            error: accessErr
          });
        }
      }
    } else {
      console.log('[Photo Upload] No custom photo found for user, using default');
    }

    // Return default placeholder image
    console.log('[Photo Upload] Serving default placeholder');
    const svgPlaceholder = `
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="40" fill="#E5E7EB"/>
        <circle cx="40" cy="30" r="12" fill="#9CA3AF"/>
        <path d="M20 65C20 54.5066 28.5066 46 40 46C51.4934 46 60 54.5066 60 65" fill="#9CA3AF"/>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgPlaceholder);
  } catch (err) {
    console.error('[Photo Upload] GET error:', {
      error: err,
      message: (err as Error).message,
      stack: (err as Error).stack,
      userId: req.session.user?.id
    });
    res.status(500).json({ message: 'Failed to get user photo' });
  }
});

// Global error handler - always return JSON for API routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler caught:', {
    error: err,
    message: err?.message,
    path: req.path,
    method: req.method
  });
  
  // Return JSON for API routes, HTML for view routes
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
  } else {
    res.status(500).sendFile(path.join(__dirname, '..', 'frontend', 'views', '404.html'));
  }
});

app.use((req, res) => {
  // Return JSON for API routes, HTML for view routes
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not Found', path: req.path });
  } else {
    res.status(404).sendFile(path.join(__dirname, '..', 'frontend', 'views', '404.html'));
  }
});

(async () => {
  try {
    // Initialize database connection
    await ensureDatabaseInitialized();
    createPool();
    await ensureAdminUserExists();
    await ensureDepartmentsSeeded();
    console.log('Starting server with database connection...');
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`MOHCC Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
