// Attendance Tracking JavaScript
// const socket = io();

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    updateDateTime();
    loadUserInfo();
    setupEventListeners();
    loadAttendanceHistory();
    
    // Update time every second
    setInterval(updateDateTime, 1000);
    
    // Update attendance history every 30 seconds
    setInterval(loadAttendanceHistory, 30000);
});

// Update date and time
function updateDateTime() {
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');
    
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    
    dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
    timeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
}

// Load user information
async function loadUserInfo() {
    try {
        const res = await fetch('/api/user');
        const user = await res.json();
        
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userDepartment').textContent = user.department;
        document.getElementById('employeeId').textContent = user.employeeId;
        document.getElementById('userInitial').textContent = user.name.split(' ').map(n => n[0]).join('');
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Check-out button
    document.getElementById('checkOutBtn')?.addEventListener('click', async () => {
        await handleAttendanceAction('checkout');
    });
    
    // Navigation
    setupNavigation();
}

// Handle attendance actions
async function handleAttendanceAction(action) {
    const statusMessage = document.getElementById('statusMessage');
    const button = action === 'checkin' ? document.getElementById('checkInBtn') : document.getElementById('checkOutBtn');
    
    try {
        button.disabled = true;
        button.classList.add('opacity-50');
        
        const response = await fetch(`/api/attendance/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage(`Successfully ${action === 'checkin' ? 'checked in' : 'checked out'}!`, 'success');
            updateTodayStatus(data.record);
            loadAttendanceHistory();
        } else {
            showStatusMessage(data.message || 'Error occurred', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatusMessage('Connection error. Please try again.', 'error');
    } finally {
        button.disabled = false;
        button.classList.remove('opacity-50');
    }
}

// Show status message
function showStatusMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `p-4 rounded-xl text-center font-medium ${
        type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
    }`;
    statusMessage.classList.remove('hidden');
    
    if (type === 'success') {
        statusMessage.classList.add('success-animation');
    }
    
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 5000);
}

// Update today's status
function updateTodayStatus(record) {
    if (record.type === 'check-in') {
        const time = new Date(record.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.getElementById('lastCheckIn').textContent = time;
    } else if (record.type === 'check-out') {
        const time = new Date(record.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.getElementById('lastCheckOut').textContent = time;
        calculateTotalHours();
    }
}

// Calculate total hours worked today
function calculateTotalHours() {
    const checkInTime = document.getElementById('lastCheckIn').textContent;
    const checkOutTime = document.getElementById('lastCheckOut').textContent;
    
    if (checkInTime !== '--:--' && checkOutTime !== '--:--') {
        // Simple calculation - in production, this would be more accurate
        const [inHour, inMin] = checkInTime.split(':').map(Number);
        const [outHour, outMin] = checkOutTime.split(':').map(Number);
        
        const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        document.getElementById('totalHours').textContent = `${hours}h ${minutes}m`;
    }
}

// Load attendance history
async function loadAttendanceHistory() {
    try {
        const response = await fetch('/api/attendance');
        const attendance = await response.json();
        
        const historyDiv = document.getElementById('attendanceHistory');
        historyDiv.innerHTML = '';
        
        // Get today's attendance records
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = attendance.filter(a => a.timestamp.startsWith(today));
        
        if (todayAttendance.length === 0) {
            historyDiv.innerHTML = '<p class="text-gray-500 text-center py-8">No attendance records for today</p>';
            return;
        }
        
        // Sort by timestamp (newest first)
        todayAttendance.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        todayAttendance.forEach(record => {
            const time = new Date(record.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-4 bg-gray-50 rounded-lg';
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 ${record.type === 'check-in' ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center">
                        <i data-lucide="${record.type === 'check-in' ? 'log-in' : 'log-out'}" class="w-5 h-5 ${record.type === 'check-in' ? 'text-green-600' : 'text-red-600'}"></i>
                    </div>
                    <div>
                        <p class="font-medium text-moh-text-main">${record.type === 'check-in' ? 'Checked In' : 'Checked Out'}</p>
                        <p class="text-sm text-moh-text-sub">${record.userName} • ${record.department}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-medium text-sm">${time}</p>
                    <p class="text-xs text-gray-500">Today</p>
                </div>
            `;
            historyDiv.appendChild(div);
        });
        
        // Reinitialize Lucide icons
        lucide.createIcons();
    } catch (error) {
        console.error('Error loading attendance history:', error);
    }
}

// Setup navigation
function setupNavigation() {
    const navButtons = {
        'navOverview': '/dashboard',
        'navEmployees': '/employees',
        'navDepartments': '/departments',
        'navRealTimeMetrics': '/realtime-metrics',
        'navAttendanceTracking': '/attendance-tracking',
        'navReports': '/reports',
        'logoutBtn': '/api/logout'
    };
    
    Object.entries(navButtons).forEach(([id, url]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', () => {
                if (id === 'logoutBtn') {
                    const confirmed = confirm('Are you sure you want to logout?');
                    if (confirmed) {
                        fetch(url, { method: 'POST' }).then(() => {
                            window.location.href = '/';
                        });
                    }
                } else {
                    window.location.href = url;
                }
            });
        }
    });
}

// Socket.io listeners for real-time updates
// socket.on('attendance_update', (data) => {
//     loadAttendanceHistory();
// });
