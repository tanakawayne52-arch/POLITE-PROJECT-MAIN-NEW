# MOHCC Zimbabwe Attendance Management System
## Complete Application Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Features](#features)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [User Roles and Permissions](#user-roles-and-permissions)
8. [Installation and Setup](#installation-and-setup)
9. [Configuration](#configuration)
10. [Security Features](#security-features)
11. [Frontend Structure](#frontend-structure)
12. [Backend Structure](#backend-structure)
13. [Real-time Features](#real-time-features)
14. [File Upload System](#file-upload-system)
15. [Troubleshooting](#troubleshooting)

---

## Overview

The MOHCC Zimbabwe Attendance Management System is a comprehensive full-stack web application designed for the Ministry of Health and Child Care Zimbabwe to manage employee attendance efficiently. The system provides real-time monitoring, QR code-based check-in/check-out, department analytics, and role-based access control for administrators and employees.

### Key Objectives

- Streamline attendance tracking through digital means
- Provide real-time visibility into employee presence
- Enable comprehensive reporting and analytics
- Support multiple attendance verification methods
- Maintain detailed audit trails for compliance

---

## System Architecture

### Architecture Pattern

The application follows a **Model-View-Controller (MVC)** pattern with the following components:

- **Frontend**: Client-side rendering using HTML, JavaScript, and Tailwind CSS
- **Backend**: RESTful API server using Express.js
- **Database**: Relational database using MySQL
- **Real-time Communication**: WebSocket implementation using Socket.io

### Data Flow

1. **User Authentication**: Session-based authentication with JWT
2. **Attendance Recording**: Multiple methods (manual, QR code, facial recognition)
3. **Real-time Updates**: Socket.io broadcasts attendance changes
4. **Data Persistence**: MySQL database with connection pooling
5. **File Storage**: Local file system for profile photos

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0.0 | UI Framework |
| Tailwind CSS | 4.1.14 | Styling |
| Lucide React | 0.546.0 | Icons |
| Recharts | 3.8.1 | Data Visualization |
| Framer Motion | 12.23.24 | Animations |
| Socket.io Client | 4.8.3 | Real-time Communication |
| React Router DOM | 7.14.1 | Client-side Routing |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | - | Runtime Environment |
| Express | 4.21.2 | Web Framework |
| TypeScript | 5.8.2 | Type Safety |
| Socket.io | 4.8.3 | WebSocket Server |
| MySQL2 | 3.22.0 | Database Driver |
| Bcryptjs | 2.4.3 | Password Hashing |
| JWT | 9.0.3 | Token Authentication |
| Multer | 2.1.1 | File Upload Handling |
| Helmet | 8.1.0 | Security Headers |
| Morgan | 1.10.1 | HTTP Logging |
| Dotenv | 17.2.3 | Environment Variables |
| Vite | 6.2.0 | Build Tool |

### Database

- **MySQL**: Relational database management system
- **Connection Pooling**: Optimized database connections
- **Schema**: Normalized database structure with foreign key constraints

---

## Features

### Core Features

#### 1. QR Code Attendance
- Employees can generate unique QR codes
- Station QR codes for centralized check-in/check-out
- Mobile-friendly scanning interface

#### 2. Real-time Admin Dashboard
- Live attendance monitoring
- Real-time statistics updates via WebSockets
- Activity feed with recent check-ins/check-outs
- Department-wise attendance distribution

#### 3. Department Analytics
- Visual reports using Recharts
- Employee performance metrics
- Attendance distribution across departments
- Trend analysis and comparisons

#### 4. Role-Based Access Control
- **Admin Role**: Full system access, employee management, report generation
- **Employee Role**: Personal dashboard, profile management, attendance view

#### 5. Audit Logs
- Comprehensive logging of all system activities
- User action tracking
- Security event monitoring
- Compliance reporting

### Additional Features

#### Attendance Management
- Manual check-in/check-out with location tracking
- GPS coordinates capture
- Late arrival detection (threshold: 8:30 AM)
- Hours worked calculation with validation
- Monthly attendance reports
- CSV export functionality

#### User Management
- Employee registration with EC number validation
- Profile photo upload
- Department and position assignment
- Staff type classification (attachee, permanent, contract)
- Employment date tracking

#### Communication
- Department-wide announcements
- Priority-based notifications (low, medium, high)
- Real-time notification delivery

#### Leave Management
- Leave request submission (annual, sick, personal, other)
- Approval workflow for administrators
- Leave status tracking
- Automatic announcement generation

#### Shift Management
- Shift swap requests
- Supervisor approval system
- Schedule management

#### Security Features
- Password reset with OTP verification
- Security question/answer backup
- Session-based authentication
- Password hashing with bcrypt
- Input validation and sanitization

---

## Database Schema

### Database: attendance_db

### Tables

#### 1. users
Stores user account information and profile data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| usersname | VARCHAR(100) | NOT NULL | Full name of user |
| email | VARCHAR(100) | UNIQUE, NOT NULL | Email address |
| password | VARCHAR(255) | NOT NULL | Hashed password |
| department | VARCHAR(100) | - | Department name |
| job_description | VARCHAR(100) | - | Job title/position |
| role | ENUM | DEFAULT 'employee' | User role (admin, employee) |
| staff_type | ENUM | DEFAULT 'permanent' | Employment type (attachee, permanent, contract) |
| phone | VARCHAR(20) | - | Phone number |
| address | VARCHAR(255) | - | Physical address |
| employee_id | VARCHAR(9) | UNIQUE | EC number format: 6 digits + 1 letter + 2 digits |
| employment_date | DATE | - | Date of employment |
| profile_photo | VARCHAR(255) | - | Path to profile photo |
| security_question | VARCHAR(255) | DEFAULT NULL | Security question for password reset |
| security_answer | VARCHAR(255) | DEFAULT NULL | Answer to security question |
| otp | VARCHAR(255) | - | One-time password for reset |
| otp_expires_at | TIMESTAMP | - | OTP expiration time |

**Constraints:**
- EC number format validation: `^[0-9]{6}[A-Z][0-9]{2}$`

#### 2. attendance
Records all attendance check-in and check-out events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique record identifier |
| user_id | INT | FOREIGN KEY, NOT NULL | Reference to users table |
| type | ENUM | NOT NULL | Attendance type (check-in, check-out) |
| timestamp | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Time of attendance event |
| method | VARCHAR(50) | DEFAULT 'manual' | Attendance method (manual, QR, facial_recognition) |
| verification_status | VARCHAR(50) | DEFAULT 'verified' | Verification status |
| latitude | DECIMAL(10, 8) | - | GPS latitude coordinate |
| longitude | DECIMAL(11, 8) | - | GPS longitude coordinate |
| location_address | VARCHAR(255) | - | Human-readable location |

**Foreign Key:** user_id → users(user_id) ON DELETE CASCADE

#### 3. directorates
Organizational directorates/departments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique directorate identifier |
| name | VARCHAR(100) | NOT NULL | Directorate name |
| icon | VARCHAR(50) | DEFAULT 'building' | Icon identifier |
| color | VARCHAR(50) | DEFAULT 'emerald' | Color theme |

#### 4. units
Sub-units within directorates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique unit identifier |
| name | VARCHAR(100) | NOT NULL | Unit name |
| directorate_id | INT | FOREIGN KEY | Reference to directorates |
| staff_count | INT | DEFAULT 0 | Number of staff members |

**Foreign Key:** directorate_id → directorates(id) ON DELETE CASCADE

#### 5. positions
Job positions and titles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique position identifier |
| title | VARCHAR(100) | NOT NULL | Position title |
| category | ENUM | DEFAULT 'technical' | Position category (leadership, support, technical) |

**Seeded Positions:**
- Leadership: Director, Deputy Director
- Support: PA, Administrative Officer, Records Officer, Driver, Cleaner, Security Guard, Receptionist, Secretary
- Technical: ICT Officer, Accountant, Procurement Officer, Human Resources Officer, Nursing Officer, Medical Officer, Pharmacist, Laboratory Technician, Finance Officer, Monitoring and Evaluation Officer, Public Health Officer, Health Promotion Officer, Environmental Health Officer, Epidemiologist, Statistician

#### 6. announcements
System-wide and department-specific announcements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique announcement identifier |
| title | VARCHAR(200) | NOT NULL | Announcement title |
| message | TEXT | NOT NULL | Announcement content |
| department | VARCHAR(100) | DEFAULT 'all' | Target department (or 'all') |
| priority | ENUM | DEFAULT 'medium' | Priority level (low, medium, high) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

#### 7. notifications
User-specific notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique notification identifier |
| user_id | INT | FOREIGN KEY, NOT NULL | Reference to users |
| title | VARCHAR(200) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification content |
| type | VARCHAR(50) | DEFAULT 'info' | Notification type |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Foreign Key:** user_id → users(user_id) ON DELETE CASCADE

#### 8. audit_logs
System activity logging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique log identifier |
| user_id | INT | FOREIGN KEY, NOT NULL | Reference to users |
| action | VARCHAR(100) | NOT NULL | Action performed |
| details | TEXT | - | Additional details |
| timestamp | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Event timestamp |

**Foreign Key:** user_id → users(user_id) ON DELETE CASCADE

#### 9. manual_clock_requests
Requests for manual attendance correction.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique request identifier (UUID) |
| user_id | INT | FOREIGN KEY, NOT NULL | Reference to users |
| requested_time | VARCHAR(50) | NOT NULL | Requested time |
| reason | TEXT | - | Reason for request |
| comments | TEXT | - | Additional comments |
| status | ENUM | DEFAULT 'pending' | Request status (pending, approved, rejected) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Foreign Key:** user_id → users(user_id) ON DELETE CASCADE

#### 10. leave_requests
Employee leave applications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique request identifier (UUID) |
| user_id | INT | FOREIGN KEY, NOT NULL | Reference to users |
| type | ENUM | NOT NULL | Leave type (annual, sick, personal, other) |
| start_date | DATE | NOT NULL | Leave start date |
| end_date | DATE | NOT NULL | Leave end date |
| reason | TEXT | - | Reason for leave |
| status | ENUM | DEFAULT 'pending' | Request status (pending, approved, rejected) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Foreign Key:** user_id → users(user_id) ON DELETE CASCADE

#### 11. shift_swap_requests
Shift change requests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique request identifier (UUID) |
| user_id | INT | FOREIGN KEY, NOT NULL | Reference to users |
| current_shift_date | DATE | NOT NULL | Current shift date |
| preferred_swap_date | DATE | NOT NULL | Preferred swap date |
| reason | TEXT | - | Reason for swap |
| status | ENUM | DEFAULT 'pending' | Request status (pending, approved, rejected) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Foreign Key:** user_id → users(user_id) ON DELETE CASCADE

---

## API Documentation

### Base URL
`http://localhost:61460`

### Authentication
Session-based authentication using express-session. All API endpoints (except login) require authentication.

### Response Format
```json
{
  "success": true/false,
  "message": "Description",
  "data": { ... }
}
```

### API Endpoints

#### Authentication

##### POST /api/login
Authenticate user and create session.

**Request Body:**
```json
{
  "identifier": "email or username",
  "password": "user password"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "role": "admin",
    "department": "IT Department"
  }
}
```

##### POST /api/logout
Destroy user session.

**Response:**
```json
{
  "success": true
}
```

##### POST /api/forgot-password/request-otp
Request OTP for password reset.

**Request Body:**
```json
{
  "identifier": "email or phone or username"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to email",
  "otp": "123456",
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "security_question": "What is your pet's name?"
  }
}
```

##### POST /api/forgot-password
Reset password with OTP verification.

**Request Body:**
```json
{
  "identifier": "email or phone or username",
  "otp": "123456",
  "securityAnswer": "answer to security question",
  "newPassword": "new password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

#### User Management

##### GET /api/employees
Get all employees (Admin only).

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "department": "IT Department",
    "post": "ICT Officer",
    "status": "permanent"
  }
]
```

##### POST /api/employees
Add new employee (Admin only).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "department": "IT Department",
  "post": "ICT Officer",
  "role": "employee",
  "staff_type": "permanent",
  "employee_id": "277739H78"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee added successfully"
}
```

##### PUT /api/employees/:id
Update employee information (Admin only).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "department": "IT Department",
  "post": "Senior ICT Officer",
  "role": "employee",
  "staff_type": "permanent",
  "employee_id": "277739H78"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee updated successfully"
}
```

##### GET /api/user
Get current user information.

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "role": "admin",
  "department": "IT Department",
  "employeeId": "N/A"
}
```

##### GET /api/user/profile
Get detailed user profile.

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "department": "IT Department",
  "post": "ICT Officer",
  "role": "employee",
  "staff_type": "permanent",
  "employee_id": "277739H78",
  "phone": "+1234567890",
  "address": "123 Main St",
  "employment_date": "2020-01-15",
  "security_question": "What is your pet's name?",
  "security_answer": "fluffy"
}
```

##### PUT /api/user/profile
Update user profile.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Ave",
  "department": "IT Department",
  "job_description": "Senior ICT Officer",
  "name": "John Doe",
  "employee_id": "277739H78",
  "security_question": "What is your mother's maiden name?",
  "security_answer": "smith"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

##### POST /api/user/photo
Upload profile photo.

**Request:** multipart/form-data with file field 'photo'

**Constraints:**
- File size: Maximum 5MB
- Allowed types: JPEG, PNG, GIF, WebP

**Response:**
```json
{
  "success": true,
  "photoUrl": "/uploads/profile-1234567890-123456789.jpg"
}
```

##### GET /api/user/photo
Get user profile photo.

**Response:** Image file or SVG placeholder

#### Attendance Management

##### GET /api/attendance
Get all attendance records.

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "userName": "John Doe",
    "type": "check-in",
    "timestamp": "2024-01-15T08:25:00.000Z",
    "department": "IT Department",
    "latitude": -17.8292,
    "longitude": 31.0522,
    "location_address": "Harare, Zimbabwe"
  }
]
```

##### GET /api/attendance/:userId
Get attendance records for specific user (Admin only).

**Response:**
```json
[
  {
    "id": 1,
    "type": "check-in",
    "timestamp": "2024-01-15T08:25:00.000Z",
    "location_address": "Harare, Zimbabwe"
  }
]
```

##### POST /api/attendance/checkin
Record check-in with location.

**Request Body:**
```json
{
  "latitude": -17.8292,
  "longitude": 31.0522,
  "location_address": "Harare, Zimbabwe"
}
```

**Response:**
```json
{
  "success": true
}
```

##### POST /api/attendance/checkout
Record check-out.

**Response:**
```json
{
  "success": true
}
```

##### POST /api/attendance/facial-recognition
Record attendance using facial recognition.

**Request Body:**
```json
{
  "image": "base64_encoded_image"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Facial recognition successful"
}
```

##### POST /api/attendance/manual-clock
Submit manual clock request.

**Request Body:**
```json
{
  "time": "2024-01-15T08:30:00.000Z",
  "reason": "Forgot to clock in",
  "comments": "Was in a meeting"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual clock in request submitted for approval"
}
```

##### PUT /api/attendance/:id
Update attendance record (Admin only).

**Request Body:**
```json
{
  "type": "check-in",
  "location_address": "Updated location"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Record updated successfully"
}
```

##### DELETE /api/attendance/:id
Delete attendance record (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Record deleted successfully"
}
```

##### GET /api/user/attendance
Get current user's attendance history.

**Response:**
```json
[
  {
    "timestamp": "2024-01-15",
    "checkInTime": "08:25",
    "checkOutTime": "17:00",
    "hoursWorked": 8.6,
    "location_address": "Harare, Zimbabwe",
    "status": "present"
  }
]
```

##### GET /api/user/attendance/download
Download attendance history as CSV.

**Query Parameters:**
- month (optional): Month number (1-12)
- year (optional): Year (e.g., 2024)

**Response:** CSV file download

##### GET /api/user/today-status
Get today's attendance status.

**Response:**
```json
{
  "checkInTime": "08:25",
  "checkOutTime": null,
  "status": "Clocked In"
}
```

#### Statistics and Reports

##### GET /api/stats
Get system statistics (Admin only).

**Response:**
```json
{
  "totalEmployees": 150,
  "presentToday": 120,
  "lateArrivals": 15,
  "avgShift": "8.2h"
}
```

##### GET /api/user/stats
Get user attendance statistics.

**Response:**
```json
{
  "daysPresent": 18,
  "hoursWorked": 145.5,
  "lateArrivals": 3,
  "attendanceRate": 82
}
```

##### GET /api/realtime-metrics
Get real-time attendance metrics.

**Response:**
```json
{
  "activeNow": 95,
  "checkinsToday": 120,
  "checkoutsToday": 25,
  "lateArrivals": 15,
  "absentToday": 30,
  "efficiencyRate": 87,
  "hourlyActivity": [
    { "hour": "8:00", "count": 45 },
    { "hour": "9:00", "count": 60 }
  ],
  "departmentActivity": [
    { "name": "IT Department", "count": 25 }
  ],
  "recentAttendance": [...]
}
```

##### GET /api/monthly-report
Get monthly attendance report (Admin).

**Query Parameters:**
- month: Month number (1-12)
- year: Year (e.g., 2024)

**Response:**
```json
{
  "summary": {
    "totalWorkingDays": 22,
    "avgAttendance": 85,
    "lateArrivals": 45
  },
  "performance": {
    "bestPerformer": "John Doe",
    "needsImprovement": "Jane Smith",
    "perfectAttendance": 12
  },
  "trends": {
    "vsLastMonth": "N/A",
    "peakDay": "N/A",
    "lowestDay": "N/A"
  },
  "employees": [...]
}
```

##### GET /api/user/monthly-report
Get user monthly report.

**Query Parameters:**
- month: Month number (1-12)
- year: Year (e.g., 2024)
- format: 'pdf' (optional)

**Response:**
```json
{
  "daysPresent": 18,
  "daysAbsent": 4,
  "lateArrivals": 3,
  "totalHours": 145.5,
  "avgHours": 8.1,
  "overtime": 12.5,
  "attendanceRate": 82,
  "punctualityRate": 83,
  "status": "Good"
}
```

#### Department Management

##### GET /api/departments
Get all departments with units.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Health Services",
    "icon": "building",
    "color": "emerald",
    "subDepartments": [
      {
        "name": "Clinical Services",
        "staffCount": 45
      }
    ]
  }
]
```

##### POST /api/departments
Add new department (Admin only).

**Request Body:**
```json
{
  "id": 5,
  "name": "New Department",
  "icon": "building",
  "color": "blue"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Department added successfully"
}
```

##### PUT /api/departments/:id
Update department (Admin only).

**Request Body:**
```json
{
  "name": "Updated Department Name",
  "icon": "office",
  "color": "green"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Department updated successfully"
}
```

##### DELETE /api/departments/:id
Delete department (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Department deleted successfully"
}
```

##### GET /api/positions
Get all positions.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Director",
    "category": "leadership"
  }
]
```

#### Leave Management

##### POST /api/user/leave-request
Submit leave request.

**Request Body:**
```json
{
  "type": "annual",
  "startDate": "2024-02-01",
  "endDate": "2024-02-05",
  "reason": "Family vacation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Leave request submitted successfully"
}
```

##### GET /api/admin/leave-requests
Get all leave requests (Admin only).

**Response:**
```json
[
  {
    "id": "uuid",
    "userName": "John Doe",
    "department": "IT Department",
    "employee_id": "277739H78",
    "type": "annual",
    "startDate": "2024-02-01",
    "endDate": "2024-02-05",
    "reason": "Family vacation",
    "status": "pending",
    "created_at": "2024-01-20T10:00:00.000Z"
  }
]
```

##### PUT /api/admin/leave-requests/:id
Update leave request status (Admin only).

**Request Body:**
```json
{
  "status": "approved"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Leave request updated successfully"
}
```

#### Shift Management

##### POST /api/user/shift-swap
Submit shift swap request.

**Request Body:**
```json
{
  "currentShiftDate": "2024-02-01",
  "preferredSwapDate": "2024-02-02",
  "reason": "Personal commitment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shift swap request submitted successfully"
}
```

#### Notifications and Announcements

##### GET /api/user/notifications
Get user notifications.

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "title": "Leave Request Approved",
    "message": "Your leave request has been approved.",
    "type": "info",
    "is_read": false,
    "created_at": "2024-01-20T10:00:00.000Z"
  }
]
```

##### GET /api/user/announcements
Get announcements for user's department.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Office Closure",
    "message": "Office will be closed on Monday.",
    "department": "all",
    "priority": "high",
    "created_at": "2024-01-20T10:00:00.000Z"
  }
]
```

##### GET /api/user/audit-logs
Get user audit logs.

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "action": "Profile Update",
    "details": "Updated phone number",
    "timestamp": "2024-01-20T10:00:00.000Z"
  }
]
```

#### Configuration

##### GET /api/config
Get system configuration.

**Response:**
```json
{
  "geminiApiKey": "your-api-key",
  "userRole": "admin"
}
```

---

## User Roles and Permissions

### Admin Role

**Access Level:** Full system access

**Permissions:**
- View and manage all employees
- Add, edit, delete employees
- Manage departments and units
- View all attendance records
- Edit and delete attendance records
- View real-time metrics and analytics
- Generate and view monthly reports
- Approve/reject leave requests
- View and manage shift swap requests
- Create and manage announcements
- View audit logs
- Access admin dashboard
- Full system configuration access

**Dashboard Features:**
- Overview statistics
- Employee management
- Department management
- Real-time attendance tracking
- Monthly reports
- Leave request management

### Employee Role

**Access Level:** Personal access only

**Permissions:**
- View personal profile
- Edit personal profile information
- Upload profile photo
- View personal attendance history
- Clock in/out
- Submit manual clock requests
- Submit leave requests
- Submit shift swap requests
- View personal notifications
- View announcements
- Download personal attendance reports
- View personal statistics

**Dashboard Features:**
- Personal overview
- Profile management
- Attendance history
- Communication center
- Leave management
- Schedule view

---

## Installation and Setup

### Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager
- Git (for cloning repository)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd Polite-Project-main
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Database Setup

#### Option A: Automatic Setup
The application will automatically initialize the database schema if it doesn't exist.

#### Option B: Manual Setup
Run the provided SQL schema:

```bash
mysql -u root -p < schema.sql
```

This will:
- Create the `attendance_db` database
- Create all required tables
- Seed initial data (positions, admin user)
- Create database user with appropriate permissions

### Step 4: Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=attendance_db

# JWT Secret
JWT_SECRET=your-secret-key-here

# Optional: Google Gemini API Key for AI features
GEMINI_API_KEY=your-gemini-api-key
```

### Step 5: Start Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Step 6: Access Application

- **Application URL:** http://localhost:61460
- **Default Admin Credentials:**
  - Email: admin@mohcc.gov.zw
  - Password: admin123
- **Default Employee Credentials:**
  - Email: murambwa@mohcc.gov.zw
  - Password: emp123

### Step 7: Change Default Passwords

For security, change the default passwords immediately after first login.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DB_HOST | Yes | localhost | MySQL database host |
| DB_PORT | Yes | 3306 | MySQL database port |
| DB_USER | Yes | root | MySQL database user |
| DB_PASSWORD | Yes | - | MySQL database password |
| DB_NAME | Yes | attendance_db | Database name |
| JWT_SECRET | Yes | mohcc-zimbabwe-secret-key | Secret key for session encryption |
| GEMINI_API_KEY | No | - | Google Gemini API key for AI features |
| PORT | No | 61460 | Server port |

### Server Configuration

The server runs on port 61460 by default. This can be modified in `server.ts`:

```typescript
const PORT = 61460;
```

### Database Connection Pool

Default connection pool settings:
- Connection Limit: 10
- Queue Limit: 0 (unlimited)
- Wait for Connections: true

Modify in `server.ts`:

```typescript
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
```

### Session Configuration

Default session settings:
- Secret: JWT_SECRET environment variable
- Cookie Max Age: 24 hours
- Secure: false (set to true in production with HTTPS)
- HttpOnly: true
- SameSite: lax

Modify in `server.ts`:

```typescript
app.use(session({
  secret: process.env.JWT_SECRET || 'mohcc-zimbabwe-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 
  }
}) as any);
```

### File Upload Configuration

Default upload settings:
- Upload Directory: `public/uploads/`
- Maximum File Size: 5MB
- Allowed Types: JPEG, PNG, GIF, WebP

Modify in `server.ts`:

```typescript
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
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});
```

---

## Security Features

### Authentication

- **Session-based Authentication:** Uses express-session for secure session management
- **Password Hashing:** All passwords are hashed using bcrypt with salt rounds of 10
- **Session Expiration:** Sessions expire after 24 hours of inactivity
- **Secure Cookies:** HttpOnly flag prevents client-side JavaScript access

### Authorization

- **Role-Based Access Control:** Two roles (admin, employee) with different permission levels
- **Route Protection:** All API endpoints (except login) require authentication
- **Admin-only Endpoints:** Sensitive operations restricted to admin role only

### Input Validation

- **EC Number Format:** Validates EC number format (6 digits + 1 letter + 2 digits)
- **Email Validation:** Unique email constraint in database
- **File Type Validation:** Only specific image types allowed for uploads
- **File Size Limits:** 5MB maximum file size for uploads
- **SQL Injection Prevention:** Parameterized queries throughout the application

### Security Headers

- **Helmet Middleware:** Sets security-related HTTP headers
- **Content Security Policy:** Configurable CSP (currently disabled for development)
- **CORS Configuration:** Cross-origin resource sharing controls

### Password Recovery

- **OTP-based Reset:** One-time password sent via email/SMS
- **OTP Expiration:** OTPs expire after 10 minutes
- **Security Question Backup:** Additional verification layer
- **Case-insensitive Answers:** Security answer validation is case-insensitive

### Audit Logging

- **User Actions:** All user actions are logged to audit_logs table
- **Timestamp Tracking:** Each log entry includes precise timestamp
- **User Attribution:** Logs are associated with specific users

### Data Protection

- **Foreign Key Constraints:** Cascade delete ensures data consistency
- **Transaction Safety:** Database operations use proper error handling
- **Error Logging:** Comprehensive error logging for debugging and security monitoring

---

## Frontend Structure

### Directory Layout

```
public/
├── css/
│   └── style.css          # Global styles
├── js/
│   ├── dashboard.js       # Admin dashboard logic
│   ├── employee-dashboard.js  # Employee dashboard logic
│   ├── attendance-tracking.js  # Attendance management
│   ├── departments.js    # Department management
│   ├── employees.js       # Employee management
│   ├── forgot-password.js    # Password recovery
│   ├── login.js           # Login functionality
│   ├── realtime-metrics.js   # Real-time metrics
│   ├── reports.js         # Report generation
│   └── subpages.js        # Subpage utilities
├── logo.png               # Application logo
└── uploads/               # User uploaded files
```

### Views Structure

```
views/
├── login.html             # Login page
├── dashboard.html         # Admin dashboard
├── employee-dashboard.html # Employee dashboard
├── my-profile.html        # User profile management
├── my-attendance.html     # Personal attendance history
├── communication.html     # Communication center
├── schedule.html          # Schedule view
├── attendance-tracking.html # Attendance tracking
├── realtime-metrics.html  # Real-time metrics
├── reports.html           # Reports page
├── employees.html         # Employee management
├── departments.html       # Department management
├── forgot-password.html   # Password recovery
└── 404.html               # Error page
```

### Key Frontend Features

#### Admin Dashboard
- **Overview Statistics:** Real-time employee count, present today, late arrivals, average shift
- **Activity Feed:** Live attendance updates
- **Department Analytics:** Visual charts showing department performance
- **Employee Management:** Add, edit, delete employees
- **Department Management:** Manage organizational structure

#### Employee Dashboard
- **Personal Overview:** Today's status, monthly statistics
- **Quick Actions:** Check-in, check-out buttons
- **Profile Management:** Edit personal information, upload photo
- **Attendance History:** View personal attendance records
- **Communication:** View announcements and notifications

#### Styling
- **Tailwind CSS:** Utility-first CSS framework
- **Custom Theme:** MOHCC brand colors (green, gold, red)
- **Responsive Design:** Mobile-friendly layouts
- **Lucide Icons:** Consistent iconography throughout

#### JavaScript Architecture
- **Fetch API:** For API communication
- **Socket.io Client:** For real-time updates
- **DOM Manipulation:** Direct DOM updates for performance
- **Event Handling:** User interaction management
- **Error Handling:** Comprehensive error catching and user feedback

---

## Backend Structure

### Main Server File: server.ts

The server is built using Express.js with TypeScript for type safety.

### Key Components

#### 1. Database Connection
```typescript
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
```

#### 2. Session Management
```typescript
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
```

#### 3. File Upload Handling
```typescript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});
```

#### 4. WebSocket Integration
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
```

#### 5. Authentication Middleware
```typescript
function isAuthenticated(req: express.Request): req is express.Request & { session: { user: { id: number; name: string; role: string; department: string } } } {
  return req.session.user !== undefined;
}
```

### API Route Organization

Routes are organized by functionality:

- **Authentication Routes:** Login, logout, password recovery
- **User Management Routes:** CRUD operations for users
- **Attendance Routes:** Check-in, check-out, attendance records
- **Department Routes:** Department and unit management
- **Statistics Routes:** System and user statistics
- **Report Routes:** Monthly reports and analytics
- **Leave Management Routes:** Leave requests and approvals
- **Notification Routes:** User notifications and announcements
- **File Upload Routes:** Profile photo management

### Error Handling

Global error handler provides consistent error responses:

```typescript
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler caught:', {
    error: err,
    message: err?.message,
    path: req.path,
    method: req.method
  });
  
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
  } else {
    res.status(500).sendFile(path.join(__dirname, 'views', '404.html'));
  }
});
```

---

## Real-time Features

### Socket.io Implementation

The application uses Socket.io for real-time communication between server and clients.

### Server-side Events

#### attendance_update
Broadcasted when attendance is recorded.

```typescript
io.emit('attendance_update', { stats });
```

#### new_manual_request
Broadcasted when a manual clock request is submitted.

```typescript
io.emit('new_manual_request', {
  requestId,
  userId: req.session.user.id,
  userName: req.session.user.name,
  requestedTime: time,
  reason,
  timestamp: new Date().toISOString()
});
```

#### new_leave_request
Broadcasted when a leave request is submitted.

```typescript
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
```

#### leave_request_updated
Broadcasted when a leave request status is updated.

```typescript
io.emit('leave_request_updated', { id: req.params.id, status });
```

#### new_announcement
Broadcasted when a new announcement is created.

```typescript
io.emit('new_announcement', { title, message, department: request.department });
```

#### new_shift_swap_request
Broadcasted when a shift swap request is submitted.

```typescript
io.emit('new_shift_swap_request', {
  requestId,
  userId: req.session.user.id,
  userName: req.session.user.name,
  currentShiftDate,
  preferredSwapDate,
  reason,
  timestamp: new Date().toISOString()
});
```

### Client-side Usage

Clients can listen to these events:

```javascript
const socket = io();

socket.on('attendance_update', (data) => {
  console.log('Real-time update received:', data);
  // Update UI
});

socket.on('new_leave_request', (data) => {
  // Handle new leave request
});
```

### Benefits

- **Instant Updates:** Dashboard statistics update immediately
- **Live Activity Feed:** Real-time attendance feed
- **Notification System:** Instant notification delivery
- **Collaborative Features:** Real-time request management

---

## File Upload System

### Overview

The application supports profile photo uploads using Multer middleware.

### Configuration

**Upload Directory:** `public/uploads/`
**Maximum File Size:** 5MB
**Allowed Types:** JPEG, PNG, GIF, WebP

### Upload Process

1. **File Selection:** User selects file from device
2. **Validation:** Server validates file type and size
3. **Storage:** File saved to uploads directory with unique name
4. **Database Update:** File path stored in users table
5. **Cleanup:** Failed uploads are automatically cleaned up

### API Endpoint

**POST /api/user/photo**

**Request:** multipart/form-data
- Field name: `photo`
- File type: image/jpeg, image/png, image/gif, image/webp

**Response:**
```json
{
  "success": true,
  "photoUrl": "/uploads/profile-1234567890-123456789.jpg"
}
```

### Error Handling

- **File Size Exceeded:** Returns 400 error with message
- **Invalid File Type:** Returns 400 error with message
- **Database Error:** File is cleaned up if database update fails
- **File System Error:** Comprehensive error logging

### Security Considerations

- **File Type Validation:** MIME type checking before upload
- **Size Limits:** Prevents denial of service via large files
- **Unique Filenames:** Prevents filename conflicts
- **Path Validation:** Ensures files are stored in correct directory
- **Cleanup on Error:** Removes files if upload process fails

### Retrieval

**GET /api/user/photo**

Returns the user's profile photo or a default SVG placeholder if no photo is uploaded.

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms:**
- Server fails to start
- "Database not connected" errors

**Solutions:**
- Verify MySQL is running
- Check database credentials in `.env` file
- Ensure database `attendance_db` exists
- Check firewall settings

#### 2. Session Not Persisting

**Symptoms:**
- User logged out immediately after login
- Session data not available

**Solutions:**
- Check JWT_SECRET in `.env` file
- Verify session cookie settings
- Clear browser cookies
- Check browser console for errors

#### 3. File Upload Fails

**Symptoms:**
- Photo upload returns error
- File not saved

**Solutions:**
- Verify `public/uploads/` directory exists and is writable
- Check file size (max 5MB)
- Verify file type (JPEG, PNG, GIF, WebP only)
- Check server logs for detailed error

#### 4. Real-time Updates Not Working

**Symptoms:**
- Dashboard not updating live
- Socket.io connection errors

**Solutions:**
- Verify Socket.io client is loaded
- Check browser console for WebSocket errors
- Verify CORS settings in server
- Check if client is listening to correct events

#### 5. Port Already in Use

**Symptoms:**
- Server fails to start with "EADDRINUSE" error

**Solutions:**
- Change PORT in `server.ts`
- Kill process using port 61460
- Use different port in `.env` file

#### 6. EC Number Validation Fails

**Symptoms:**
- Employee creation fails with format error

**Solutions:**
- Ensure EC number follows format: 6 digits + 1 letter + 2 digits
- Example: 277739H78
- Letter must be uppercase

#### 7. Attendance Hours Calculation Incorrect

**Symptoms:**
- Hours worked showing wrong values
- Check-out before check-in errors

**Solutions:**
- System validates timestamps automatically
- Check database for corrupted records
- Verify timezone settings
- Check system clock accuracy

### Logging

The application uses Morgan for HTTP logging and console.log for application logging.

**View Logs:**
- Server terminal output
- Browser console (F12)
- Database error logs (if configured)

### Debug Mode

Enable detailed logging by modifying server configuration:

```typescript
app.use(morgan('dev') as any);
```

### Performance Issues

**Symptoms:**
- Slow page loads
- Delayed API responses

**Solutions:**
- Check database connection pool settings
- Optimize database queries
- Enable database indexing
- Check server resources (CPU, memory)
- Clear browser cache

### Browser Compatibility

**Supported Browsers:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Required Features:**
- JavaScript enabled
- Cookies enabled
- WebSocket support
- File API support

---

## Appendix

### Default Credentials

**Admin Account:**
- Email: admin@mohcc.gov.zw
- Password: admin123
- Role: admin

**Employee Account:**
- Email: murambwa@mohcc.gov.zw
- Password: emp123
- Role: employee

**Important:** Change these passwords immediately after first login.

### EC Number Format

EC numbers must follow the format: `XXXXXXXYY`

- X: 6 digits (0-9)
- Y: 1 uppercase letter (A-Z)
- YY: 2 digits (0-9)

Example: 277739H78

### Late Arrival Threshold

The default late arrival threshold is set to 8:30 AM. Employees checking in after this time are marked as late.

This can be modified in the server code:

```typescript
const LATE_TIME = '08:30:00';
```

### Working Days

The system assumes 22 working days per month for attendance rate calculations.

### Support

For technical support or issues, contact:
- Ministry of Health and Child Care Zimbabwe IT Department
- Email: support@mohcc.gov.zw

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial release |

---

## License

This application is proprietary software developed for the Ministry of Health and Child Care Zimbabwe. All rights reserved.

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Application Version:** 0.0.0
