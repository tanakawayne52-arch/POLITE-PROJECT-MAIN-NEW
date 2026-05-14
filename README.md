# MOHCC Zimbabwe Attendance Management System

This is a full-stack attendance management system for the Ministry of Health and Child Care Zimbabwe.

## Features
- **QR Code Attendance**: Employees can generate a unique QR code or scan a station QR code to clock in/out.
- **Real-time Admin Dashboard**: Monitor attendance as it happens with live updates via WebSockets.
- **Department Analytics**: Visual reports on employee performance and attendance distribution across departments.
- **Role-Based Access Control**: Secure access for Admins and Employees.
- **Audit Logs**: Comprehensive logging of all system activities.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Recharts, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express, Socket.io, JWT, Bcrypt.
- **Database**: MySQL.

## Setup Instructions

### 1. Database Setup
Run the provided `schema.sql` in your MySQL environment:
```bash
mysql -u root -p < schema.sql
```

### 2. Environment Variables
Create a `.env` file and provide your MySQL credentials and a JWT secret.

### 3. Installation
```bash
npm install
```

### 4. Running the App
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.


## Scanning Station
Access the dedicated scanning station at `/station`.
