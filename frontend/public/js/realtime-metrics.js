// Real-time Metrics JavaScript
// const socket = io();

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    updateCurrentDate();
    loadMetrics();
    setupNavigation();
    setupEventListeners();
    
    // Update metrics every 30 seconds
    setInterval(loadMetrics, 30000);
});

// Update current date
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('en-US', options);
}

// Load metrics from API
async function loadMetrics() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        updateMetrics(data);
        await loadDepartmentStats();
        await loadRecentActivity();
    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

// Update metrics display
function updateMetrics(data) {
    document.getElementById('totalEmployees').textContent = data.totalEmployees || 0;
    document.getElementById('presentToday').textContent = data.presentToday || 0;
    document.getElementById('lateArrivals').textContent = data.lateArrivals || 0;
    
    const absent = (data.totalEmployees || 0) - (data.presentToday || 0);
    document.getElementById('absentToday').textContent = absent;
    
    const attendanceRate = data.totalEmployees > 0 
        ? Math.round((data.presentToday / data.totalEmployees) * 100) 
        : 0;
    document.getElementById('attendanceRate').textContent = attendanceRate + '%';
}

// Load department statistics
async function loadDepartmentStats() {
    try {
        const response = await fetch('/api/employees');
        const employees = await response.json();
        
        const departments = {};
        employees.forEach(emp => {
            departments[emp.department] = (departments[emp.department] || 0) + 1;
        });
        
        const departmentStatsDiv = document.getElementById('departmentStats');
        departmentStatsDiv.innerHTML = '';
        
        Object.entries(departments).forEach(([dept, count]) => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
            div.innerHTML = `
                <div>
                    <p class="font-medium text-sm">${dept}</p>
                    <p class="text-xs text-gray-500">${count} employees</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-sm">--</p>
                    <div class="w-16 h-2 bg-gray-200 rounded-full mt-1">
                        <div class="h-2 bg-moh-green rounded-full" style="width: 0%"></div>
                    </div>
                </div>
            `;
            departmentStatsDiv.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading department stats:', error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch('/api/attendance');
        const attendance = await response.json();
        
        const recentActivityDiv = document.getElementById('recentActivity');
        recentActivityDiv.innerHTML = '';
        
        if (!Array.isArray(attendance)) {
            console.error('Invalid attendance data received:', attendance);
            recentActivityDiv.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Error loading activity</p>';
            return;
        }
        
        const recentActivities = attendance.slice(-5).reverse();
        
        recentActivities.forEach(activity => {
            const time = new Date(activity.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg';
            div.innerHTML = `
                <div class="w-2 h-2 ${activity.type === 'check-in' ? 'bg-green-500' : 'bg-red-500'} rounded-full"></div>
                <div class="flex-1">
                    <p class="font-medium text-sm">${activity.userName}</p>
                    <p class="text-xs text-gray-500">${activity.type === 'check-in' ? 'Checked in' : 'Checked out'} • ${time}</p>
                </div>
            `;
            recentActivityDiv.appendChild(div);
        });
        
        if (recentActivities.length === 0) {
            recentActivityDiv.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No recent activity</p>';
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
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
                        fetch(url).then(() => {
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

// Setup event listeners
function setupEventListeners() {
    // Socket.io listeners for real-time updates
    // socket.on('attendance_update', (data) => {
    //     loadMetrics();
    //     loadRecentActivity();
    // });
}
