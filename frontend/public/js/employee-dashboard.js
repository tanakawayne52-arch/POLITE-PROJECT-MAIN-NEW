// const socket = io();

let currentUser = null;
let allAttendance = [];
let attendanceSort = { key: 'timestamp', dir: 'desc' };
let notifications = [];
let auditLogs = [];
let announcements = [];

const NAV_INACTIVE = 'w-full flex items-center gap-3 px-4 py-3 text-green-100 hover:bg-white/10 hover:text-white rounded-xl font-medium transition-all';
const NAV_ACTIVE   = 'w-full flex items-center gap-3 px-4 py-3 bg-moh-green text-white rounded-xl font-medium transition-all';

// ── Modal helpers ────────────────────────────────────────────────────────────
function showModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'flex';
}
function hideModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
}

// Initialize the dashboard
async function initDashboard() {
    // Ensure only overview is visible on load (handles hidden class / inline-style conflicts)
    ['profileSection','attendanceSection','auditSection','communicationSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const overviewEl = document.getElementById('overviewSection');
    if (overviewEl) overviewEl.style.display = '';

    try {
        const res = await fetch('/api/user/profile');
        currentUser = await res.json();
        updateUserInfo();

        await Promise.all([
            fetchPersonalStats(),
            fetchTodayStatus(),
            fetchAttendanceHistory()
        ]);

        // autoCheckIn(); // Disabled - manual clock in/out via buttons

        setupRealTimeUpdates();
        updateCurrentDate();
        setInterval(updateCurrentDate, 60000);
        updateRealTimeClock();
        setInterval(updateRealTimeClock, 1000);

        fetchNotifications();
        fetchAnnouncements();
    } catch (err) {
        console.error('Failed to initialize dashboard:', err);
        showNotification('Failed to load dashboard', 'error');
    }
}

function updateUserInfo() {
    if (!currentUser) return;

    // Sidebar
    document.getElementById('employeeName').textContent = currentUser.name;
    document.getElementById('employeeId').textContent   = currentUser.employee_id;
    document.getElementById('employeeDept').textContent = currentUser.department;

    // Overview cards
    document.getElementById('employeeNameDisplay').textContent = currentUser.name;
    document.getElementById('employeeRoleDisplay').textContent = currentUser.post || 'Employee';
    document.getElementById('employeeDeptDisplay').textContent = currentUser.department || 'N/A';
    
    // Additional personnel details
    const emailDisplay = document.getElementById('employeeEmailDisplay');
    const staffTypeDisplay = document.getElementById('employeeStaffTypeDisplay');
    
    if (emailDisplay) emailDisplay.textContent = currentUser.email || 'Not provided';
    if (staffTypeDisplay) staffTypeDisplay.textContent = currentUser.staff_type || 'Not provided';

    // Profile section
    const profileNameHeader = document.getElementById('profileNameHeader');
    const profileRoleHeader = document.getElementById('profileRoleHeader');
    const profileIdHeader   = document.getElementById('profileIdHeader');
    if (profileNameHeader) profileNameHeader.textContent = currentUser.name;
    if (profileRoleHeader) profileRoleHeader.textContent = currentUser.post || 'Employee';
    if (profileIdHeader)   profileIdHeader.textContent   = currentUser.employee_id;

    document.getElementById('profileEmployeeId').textContent   = currentUser.employee_id;
    document.getElementById('profileName').textContent         = currentUser.name;
    document.getElementById('profileEmail').textContent        = currentUser.email;
    document.getElementById('profileDepartment').textContent   = currentUser.department;
    document.getElementById('profilePost').textContent         = currentUser.post || 'N/A';
    document.getElementById('profileEmploymentDate').textContent = currentUser.employment_date || 'N/A';
    
    // Additional profile fields
    const profilePhone = document.getElementById('profilePhone');
    const profileAddress = document.getElementById('profileAddress');
    const profileStaffType = document.getElementById('profileStaffType');
    
    if (profilePhone) profilePhone.textContent = currentUser.phone || 'Not provided';
    if (profileAddress) profileAddress.textContent = currentUser.address || 'Not provided';
    if (profileStaffType) profileStaffType.textContent = currentUser.staff_type || 'Not provided';

    // Security question display
    const securityQuestionDisplay = document.getElementById('securityQuestionDisplay');
    const securityQuestionForm = document.getElementById('securityQuestionForm');
    const currentSecurityQuestion = document.getElementById('currentSecurityQuestion');

    if (currentUser.security_question) {
        if (securityQuestionDisplay) securityQuestionDisplay.classList.remove('hidden');
        if (securityQuestionForm) securityQuestionForm.classList.add('hidden');
        if (currentSecurityQuestion) currentSecurityQuestion.textContent = currentUser.security_question;
    } else {
        if (securityQuestionDisplay) securityQuestionDisplay.classList.add('hidden');
        if (securityQuestionForm) securityQuestionForm.classList.remove('hidden');
    }

    // Edit form
    document.getElementById('editEmail').value   = currentUser.email   || '';
    document.getElementById('editPhone').value   = currentUser.phone   || '';
    document.getElementById('editAddress').value = currentUser.address || '';

    // Profile photos — fetch from server, fall back to pravatar if not uploaded
    fetchProfilePhoto();

    updateShiftDetails();
    updateAnalytics();
}

async function fetchProfilePhoto() {
    try {
        const response = await fetch('/api/user/photo');
        if (response.ok) {
            const blob = await response.blob();
            // Check if it's the default SVG placeholder from server
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('image/svg+xml')) {
                // Server returned default placeholder - no photo uploaded
                // Hide photo elements or show placeholder icon
                ['employeePhoto', 'profilePhoto'].forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.style.display = 'none';
                    // Show placeholder icon if available
                    const placeholderIcon = document.getElementById(id + 'Placeholder');
                    if (placeholderIcon) placeholderIcon.style.display = 'flex';
                });
            } else {
                // User has uploaded a photo - display it
                const photoUrl = URL.createObjectURL(blob);
                ['employeePhoto', 'profilePhoto'].forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.style.display = 'block';
                    el.src = photoUrl;
                    // Hide placeholder icon
                    const placeholderIcon = document.getElementById(id + 'Placeholder');
                    if (placeholderIcon) placeholderIcon.style.display = 'none';
                });
            }
        } else {
            // API error - hide photos
            ['employeePhoto', 'profilePhoto'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.style.display = 'none';
                const placeholderIcon = document.getElementById(id + 'Placeholder');
                if (placeholderIcon) placeholderIcon.style.display = 'flex';
            });
        }
    } catch (error) {
        console.error('Failed to fetch profile photo:', error);
        // On error - hide photos
        ['employeePhoto', 'profilePhoto'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.display = 'none';
            const placeholderIcon = document.getElementById(id + 'Placeholder');
            if (placeholderIcon) placeholderIcon.style.display = 'flex';
        });
    }
}

async function fetchPersonalStats() {
    try {
        const res   = await fetch('/api/user/stats');
        const stats = await res.json();
        document.getElementById('statDaysPresent').textContent    = stats.daysPresent    || 0;
        document.getElementById('statHoursWorked').textContent    = (stats.hoursWorked   || 0) + 'h';
        document.getElementById('statLateArrivals').textContent   = stats.lateArrivals   || 0;
        document.getElementById('statAttendanceRate').textContent = (stats.attendanceRate || 0) + '%';
    } catch (err) {
        console.error('Failed to fetch personal stats:', err);
    }
}

async function fetchTodayStatus() {
    try {
        const res    = await fetch('/api/user/today-status');
        const status = await res.json();

        // Update both status card and clock-features section
        const ids = {
            todayClockIn:      document.getElementById('todayClockIn'),
            todayClockOut:     document.getElementById('todayClockOut'),
            attendanceStatus:  document.getElementById('attendanceStatus'),
            todayCheckIn:      document.getElementById('todayCheckIn'),
            todayCheckOut:     document.getElementById('todayCheckOut'),
            todayStatus:       document.getElementById('todayStatus'),
        };

        if (ids.todayClockIn)     ids.todayClockIn.textContent     = status.checkInTime  || '--:--';
        if (ids.todayClockOut)    ids.todayClockOut.textContent     = status.checkOutTime || '--:--';
        if (ids.attendanceStatus) ids.attendanceStatus.textContent  = status.status       || 'Not Clocked In';
        if (ids.todayCheckIn)     ids.todayCheckIn.textContent      = status.checkInTime  || '--:--';
        if (ids.todayCheckOut)    ids.todayCheckOut.textContent     = status.checkOutTime || '--:--';
        if (ids.todayStatus)      ids.todayStatus.textContent       = status.status       || 'Not Clocked In';

        // Header buttons state
        const checkInBtn  = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');
        if (status.status === 'Clocked In') {
            if (checkInBtn)  { checkInBtn.disabled  = true;  checkInBtn.classList.add('opacity-50', 'cursor-not-allowed'); }
            if (checkOutBtn) { checkOutBtn.disabled = false; checkOutBtn.classList.remove('opacity-50', 'cursor-not-allowed'); }
        } else {
            if (checkInBtn)  { checkInBtn.disabled  = false; checkInBtn.classList.remove('opacity-50', 'cursor-not-allowed'); }
            if (checkOutBtn) { checkOutBtn.disabled = true;  checkOutBtn.classList.add('opacity-50', 'cursor-not-allowed'); }
        }
    } catch (err) {
        console.error("Failed to fetch today's status:", err);
    }
}

async function fetchAttendanceHistory() {
    try {
        const res  = await fetch('/api/user/attendance');
        const data = await res.json();
        allAttendance = Array.isArray(data) ? data : [];
        filterAttendance();
    } catch (err) {
        console.error('Failed to fetch attendance history:', err);
        allAttendance = [];
        filterAttendance();
    }
}

function setupRealTimeUpdates() {
    // In preview mode, socket.io may not be available or connected. 
    // Just simulating a successful setup without throwing an error.
}

function updateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
}

function updateRealTimeClock() {
    const el = document.getElementById('realTimeClock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}

function updateShiftDetails() {
    document.getElementById('shiftType').textContent    = 'Morning';
    document.getElementById('workingHours').textContent = '08:00 - 17:00';
    document.getElementById('workLocation').textContent = 'Main Office';
}

function updateAnalytics() {
    document.getElementById('annualLeave').textContent  = 21;
    document.getElementById('sickLeave').textContent    = 10;
    document.getElementById('usedLeave').textContent    = 5;
    document.getElementById('overtimeHours').textContent = '12.5h';
}

async function fetchNotifications() {
    try {
        const res = await fetch('/api/user/notifications');
        const data = await res.json();
        notifications = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('Failed to fetch notifications:', err);
        notifications = [];
    }
}

// \u2500\u2500 Clock Actions \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

async function fetchAnnouncements() {
    try {
        const res = await fetch('/api/user/announcements');
        const data = await res.json();
        // Check if response is an array, otherwise use fallback
        announcements = Array.isArray(data) ? data : [
            { title: 'Holiday Schedule Update', message: 'Please check the updated holiday schedule for the upcoming month.', created_at: new Date().toISOString(), priority: 'high' },
            { title: 'System Maintenance', message: 'The attendance system will be under maintenance this weekend.', created_at: new Date(Date.now() - 86400000).toISOString(), priority: 'medium' }
        ];
    } catch (err) {
        console.error('Failed to fetch announcements:', err);
        announcements = [
            { title: 'Holiday Schedule Update', message: 'Please check the updated holiday schedule for the upcoming month.', created_at: new Date().toISOString(), priority: 'high' },
            { title: 'System Maintenance', message: 'The attendance system will be under maintenance this weekend.', created_at: new Date(Date.now() - 86400000).toISOString(), priority: 'medium' }
        ];
    }
    renderAnnouncements();
}

function renderAnnouncements() {
    const list = document.getElementById('announcementsList');
    if (!list) return;
    list.innerHTML = '';
    announcements.forEach(a => {
        const div = document.createElement('div');
        const isHigh = a.priority === 'high';
        div.className = `p-4 rounded-xl border ${isHigh ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`;
        div.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="p-2 bg-white rounded-lg">
                    <i data-lucide="${isHigh ? 'alert-circle' : 'info'}" class="w-4 h-4 ${isHigh ? 'text-red-600' : 'text-blue-600'}"></i>
                </div>
                <div class="flex-1">
                    <p class="font-bold text-sm">${a.title}</p>
                    <p class="text-sm text-moh-text-sub mt-1">${a.message}</p>
                    <p class="text-[10px] text-moh-text-sub mt-2">${new Date(a.created_at || a.date).toLocaleDateString()}</p>
                </div>
            </div>`;
        list.appendChild(div);
    });
    lucide.createIcons();
}

// ── Navigation ───────────────────────────────────────────────────────────────
function showView(viewName) {
    const sections = {
        overview:      document.getElementById('overviewSection'),
        profile:       document.getElementById('profileSection'),
        attendance:    document.getElementById('attendanceSection'),
        communication: document.getElementById('communicationSection')
    };
    const navButtons = {
        overview:      document.getElementById('navOverview'),
        profile:       document.getElementById('navProfile'),
        attendance:    document.getElementById('navAttendance'),
        communication: document.getElementById('navCommunication')
    };

    // Hide all, reset nav  — use inline style so it wins over unlayered CSS classes
    Object.values(sections).forEach(s => { if (s) s.style.display = 'none'; });
    Object.values(navButtons).forEach(b => { if (b) b.className = NAV_INACTIVE; });

    // Show target
    if (sections[viewName])   sections[viewName].style.display = '';
    if (navButtons[viewName]) navButtons[viewName].className = NAV_ACTIVE;

    // Load section-specific data
    if (viewName === 'attendance')    fetchAttendanceHistory();
    if (viewName === 'communication') fetchAnnouncements();
}

// ── Attendance ────────────────────────────────────────────────────────────────
async function handleAttendance(type) {
    if (type === 'checkin') {
        // Manual check-in with geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const addressRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const addressData = await addressRes.json();
                    const location_address = addressData.display_name || `${latitude}, ${longitude}`;

                    const res = await fetch('/api/attendance/checkin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude, longitude, location_address })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification('Successfully clocked in!', 'success');
                        fetchTodayStatus(); fetchPersonalStats(); fetchAttendanceHistory();
                    } else {
                        showNotification(data.message || 'Check-in failed', 'error');
                    }
                } catch (err) {
                    console.error('Failed to check-in:', err);
                    showNotification('System error. Please try again.', 'error');
                }
            }, async (error) => {
                console.warn('Geolocation error or permission denied:', error);
                let errorMessage = 'Location access denied. Checking in without location...';
                if (error.code === 3) {
                    errorMessage = 'Location request timed out. Checking in without location...';
                } else if (error.code === 2) {
                    errorMessage = 'Unable to retrieve location. Checking in without location...';
                }
                showNotification(errorMessage, 'warning');
                const res = await fetch('/api/attendance/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                const data = await res.json();
                if (data.success) {
                    showNotification('Successfully clocked in!', 'success');
                    fetchTodayStatus(); fetchPersonalStats(); fetchAttendanceHistory();
                }
            }, { timeout: 15000, enableHighAccuracy: false, maximumAge: 30000 });
        } else {
            const res = await fetch('/api/attendance/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
            const data = await res.json();
            if (data.success) {
                showNotification('Successfully clocked in!', 'success');
                fetchTodayStatus(); fetchPersonalStats(); fetchAttendanceHistory();
            }
        }
        return;
    }
    try {
        const res  = await fetch(`/api/attendance/${type}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showNotification(data.message || `Successfully clocked out!`, 'success');
            fetchTodayStatus(); fetchPersonalStats(); fetchAttendanceHistory();
        } else {
            showNotification(data.message || 'Operation failed', 'error');
        }
    } catch (err) {
        console.error(`Failed to ${type}:`, err);
        showNotification('System error. Please try again.', 'error');
    }
}

async function autoCheckIn() {
    try {
        // Check today's status first to avoid duplicate check-ins
        const statusRes = await fetch('/api/user/today-status');
        const statusData = await statusRes.json();
        
        // Only attempt auto check-in if not already checked in
        if (statusData.status === 'Clocked In') {
            return; // Already checked in, skip auto check-in
        }
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const addressRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const addressData = await addressRes.json();
                    const location_address = addressData.display_name || `${latitude}, ${longitude}`;
                    
                    const res = await fetch('/api/attendance/checkin', { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude, longitude, location_address })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showNotification('Auto-clocked in successfully!', 'success');
                        fetchTodayStatus(); fetchPersonalStats(); fetchAttendanceHistory();
                    } else if (data.message === 'Already checked in') {
                        // Handle case where user was checked in between status check and check-in attempt
                        fetchTodayStatus();
                    }
                } catch (err) {
                    console.error('Failed to auto check-in:', err);
                }
            }, async (error) => {
                console.warn('Geolocation error or permission denied:', error);
                let errorMessage = 'Location access denied. Auto-checking in without location...';
                if (error.code === 3) {
                    errorMessage = 'Location request timed out. Auto-checking in without location...';
                } else if (error.code === 2) {
                    errorMessage = 'Unable to retrieve location. Auto-checking in without location...';
                }
                showNotification(errorMessage, 'warning');
                const res = await fetch('/api/attendance/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                const data = await res.json();
                if (data.success) {
                    showNotification('Auto-clocked in successfully!', 'success');
                    fetchTodayStatus(); fetchPersonalStats(); fetchAttendanceHistory();
                } else if (data.message === 'Already checked in') {
                    fetchTodayStatus();
                }
            }, { timeout: 15000, enableHighAccuracy: false, maximumAge: 30000 });
        } else {
            const res = await fetch('/api/attendance/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
            const data = await res.json();
            if (data.success) {
                showNotification('Auto-clocked in successfully!', 'success');
                fetchTodayStatus(); fetchPersonalStats(); fetchAttendanceHistory();
            } else if (data.message === 'Already checked in') {
                fetchTodayStatus();
            }
        }
    } catch (err) {
        console.error('Failed to check today status for auto check-in:', err);
    }
}

function renderAttendance(records) {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-moh-text-sub italic">No attendance records found</td></tr>';
        return;
    }
    records.forEach(r => {
        const row = document.createElement('tr');
        row.className = 'border-b border-moh-border hover:bg-moh-bg transition-colors';
        row.innerHTML = `
            <td class="py-4 px-4 font-mono text-xs"><span class="font-bold">${new Date(r.timestamp).toLocaleDateString('en-GB')}</span></td>
            <td class="py-4 px-4 font-bold">${r.checkInTime  || '--:--'}</td>
            <td class="py-4 px-4 font-bold">${r.checkOutTime || '--:--'}</td>
            <td class="py-4 px-4"><span class="font-bold">${r.hoursWorked || '0'}h</span></td>
            <td class="py-4 px-4 text-xs max-w-xs truncate" title="${r.location_address || 'Unknown'}">${r.location_address || 'Unknown'}</td>
            <td class="py-4 px-4">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    r.status === 'present' ? 'bg-emerald-50 border-emerald-100 text-moh-green' :
                    r.status === 'late'    ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                             'bg-red-50 border-red-100 text-moh-red'}">
                    ${r.status || 'unknown'}
                </span>
            </td>`;
        tbody.appendChild(row);
    });
}

function filterAttendance() {
    const from = document.getElementById('attendanceDateFrom').value;
    const to   = document.getElementById('attendanceDateTo').value;
    let filtered = allAttendance.filter(r => {
        const date = (r.timestamp || '').split('T')[0];
        return (!from || date >= from) && (!to || date <= to);
    });
    filtered.sort((a, b) => {
        let va = a[attendanceSort.key], vb = b[attendanceSort.key];
        if (attendanceSort.key === 'timestamp') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
        return attendanceSort.dir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });
    renderAttendance(filtered);
}

window.sortAttendance = (key) => {
    attendanceSort.dir = attendanceSort.key === key ? (attendanceSort.dir === 'asc' ? 'desc' : 'asc') : 'asc';
    attendanceSort.key = key;
    filterAttendance();
};

// ── Communication ────────────────────────────────────────────────────────────

// ── Profile editing ───────────────────────────────────────────────────────────
async function handleProfileUpdate(e) {
    e.preventDefault();
    const data = {
        email:   document.getElementById('editEmail').value,
        phone:   document.getElementById('editPhone').value,
        address: document.getElementById('editAddress').value
    };
    try {
        const res    = await fetch('/api/user/profile', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            showNotification('Profile updated successfully!', 'success');
            hideModal('editProfileModal');
            await initDashboard();
        } else {
            showNotification(result.message || 'Error updating profile', 'error');
        }
    } catch (err) {
        showNotification('System error', 'error');
    }
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportAttendance() {
    if (!allAttendance.length) { showNotification('No data to export', 'error'); return; }
    const rows = ['Date,Check-in,Check-out,Hours Worked,Status'];
    allAttendance.forEach(r => {
        rows.push(`${new Date(r.timestamp).toLocaleDateString('en-GB')},${r.checkInTime || '--'},${r.checkOutTime || '--'},${r.hoursWorked || 0}h,${r.status || 'unknown'}`);
    });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })),
        download: 'my_attendance_export.csv'
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showNotification('Export successful!', 'success');
}

// ── Notifications ─────────────────────────────────────────────────────────────
function showNotification(message, type) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-50 transform transition-all duration-300 translate-y-20 opacity-0 flex items-center gap-3 font-bold text-sm ${
        type === 'success' ? 'bg-moh-green text-white' : 'bg-moh-red text-white'}`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-5 h-5"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.classList.remove('translate-y-20', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ── Event Listeners ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();

    // Header clock buttons
    document.getElementById('checkInBtn').addEventListener('click', () => handleAttendance('checkin'));
    document.getElementById('checkOutBtn').addEventListener('click', () => handleAttendance('checkout'));

    // Profile editing
    document.getElementById('editProfileBtn').addEventListener('click',      () => showModal('editProfileModal'));
    document.getElementById('closeEditProfileModal').addEventListener('click', () => hideModal('editProfileModal'));
    document.getElementById('cancelEditProfile').addEventListener('click',     () => hideModal('editProfileModal'));
    document.getElementById('editProfileForm').addEventListener('submit', handleProfileUpdate);

    // Security question setup
    document.getElementById('changeSecurityQuestionBtn').addEventListener('click', () => {
        document.getElementById('securityQuestionDisplay').classList.add('hidden');
        document.getElementById('securityQuestionForm').classList.remove('hidden');
    });

    document.getElementById('saveSecurityQuestionBtn').addEventListener('click', async () => {
        const question = document.getElementById('securityQuestionSelect').value;
        const answer = document.getElementById('securityAnswerInput').value.trim();

        if (!question || !answer) {
            showNotification('Please select a security question and provide an answer.', 'error');
            return;
        }

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ security_question: question, security_answer: answer })
            });
            const data = await res.json();
            if (data.success) {
                showNotification('Security question saved successfully!', 'success');
                currentUser.security_question = question;
                document.getElementById('securityQuestionDisplay').classList.remove('hidden');
                document.getElementById('securityQuestionForm').classList.add('hidden');
                document.getElementById('currentSecurityQuestion').textContent = question;
                document.getElementById('securityQuestionSelect').value = '';
                document.getElementById('securityAnswerInput').value = '';
            } else {
                showNotification(data.message || 'Failed to save security question.', 'error');
            }
        } catch (err) {
            console.error('Security question save error:', err);
            showNotification('System error. Please try again.', 'error');
        }
    });

    // Attendance filters & export
    document.getElementById('attendanceDateFrom').addEventListener('change', filterAttendance);
    document.getElementById('attendanceDateTo').addEventListener('change', filterAttendance);
    document.getElementById('exportAttendance').addEventListener('click', exportAttendance);

    // Sidebar navigation
    document.getElementById('navOverview').addEventListener('click',      () => showView('overview'));
    document.getElementById('navProfile').addEventListener('click',       () => showView('profile'));
    document.getElementById('navAttendance').addEventListener('click',    () => showView('attendance'));
    document.getElementById('navCommunication').addEventListener('click', () => showView('communication'));

    // Leave request form
    document.getElementById('leaveRequestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            type:      document.getElementById('leaveType').value,
            startDate: document.getElementById('leaveStartDate').value,
            endDate:   document.getElementById('leaveEndDate').value,
            reason:    document.getElementById('leaveReason').value
        };
        if (!data.startDate || !data.endDate) { showNotification('Please fill in all required fields', 'error'); return; }
        try {
            const res    = await fetch('/api/user/leave-request', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) { showNotification('Leave request submitted successfully!', 'success'); e.target.reset(); }
            else showNotification(result.message || 'Error submitting request', 'error');
        } catch (err) { showNotification('System error', 'error'); }
    });

    // Shift swap form
    document.getElementById('shiftSwapForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            currentShiftDate:   document.getElementById('currentShiftDate').value,
            preferredSwapDate:  document.getElementById('preferredSwapDate').value,
            reason:             document.getElementById('swapReason').value
        };
        if (!data.currentShiftDate || !data.preferredSwapDate) { showNotification('Please fill in all required fields', 'error'); return; }
        try {
            const res    = await fetch('/api/user/shift-swap', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) { showNotification('Shift swap request submitted successfully!', 'success'); e.target.reset(); }
            else showNotification(result.message || 'Error submitting request', 'error');
        } catch (err) { showNotification('System error', 'error'); }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        const confirmed = confirm('Are you sure you want to logout?');
        if (confirmed) {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        }
    });

    lucide.createIcons();
});
