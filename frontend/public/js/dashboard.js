// const socket = io();

// socket.on('attendance_update', (data) => {
//     console.log('Real-time update received:', data);
//     // Update stats immediately
//     document.getElementById('statTotalEmployees').textContent = data.stats.totalEmployees;
//     document.getElementById('statPresentToday').textContent = data.stats.presentToday;
//     document.getElementById('statLateArrivals').textContent = data.stats.lateArrivals;
//     document.getElementById('statAvgShift').textContent = data.stats.avgShift;
//     
//     // Refresh activity feed
//     fetchActivity();
// });

async function initAI() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        
        // Handle role-based visibility
        if (config.userRole === 'admin') {
            document.getElementById('addEmployeeBtn')?.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Failed to initialize AI:", err);
    }
}

async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const stats = await res.json();
        document.getElementById('statTotalEmployees').textContent = stats.totalEmployees;
        document.getElementById('statPresentToday').textContent = stats.presentToday;
        document.getElementById('statLateArrivals').textContent = stats.lateArrivals;
        document.getElementById('statAvgShift').textContent = stats.avgShift;
    } catch (err) {
        console.error("Failed to fetch stats:", err);
    }
}

async function fetchActivity() {
    try {
        const feed = document.getElementById('activityFeed');
        if (!feed) {
            console.warn('Activity feed element not found, skipping fetchActivity');
            return;
        }

        const res = await fetch('/api/attendance');
        if (!res.ok) {
            console.error('Failed to fetch activity: HTTP', res.status, res.statusText);
            return;
        }

        const attendance = await res.json();
        feed.innerHTML = '';

        if (!Array.isArray(attendance)) {
            console.error('Invalid attendance data received:', attendance);
            return;
        }

        attendance.slice(-10).reverse().forEach(record => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-4 p-3 bg-moh-bg rounded-xl border border-moh-border';
            item.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-moh-border">
                    <i data-lucide="${record.type === 'check-in' ? 'arrow-up-right' : 'arrow-down-right'}" class="w-5 h-5 ${record.type === 'check-in' ? 'text-moh-green' : 'text-moh-red'}"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-bold">${record.userName}</p>
                    <p class="text-[10px] text-moh-text-sub uppercase font-bold">${record.type} • ${record.department}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-bold text-moh-text-sub">${new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            `;
            feed.appendChild(item);
        });
        lucide.createIcons();
    } catch (err) {
        console.error("Failed to fetch activity:", err?.message || err);
    }
}

let allEmployees = [];

async function fetchEmployees() {
    try {
        const res = await fetch('/api/employees');
        allEmployees = await res.json();
        
        // Populate departments
        const deptFilter = document.getElementById('departmentFilter');
        const departments = [...new Set(allEmployees.map(e => e.department))].sort();
        
        // Keep "All" and add others
        deptFilter.innerHTML = '<option value="all">All Departments</option>';
        departments.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept;
            opt.textContent = dept;
            deptFilter.appendChild(opt);
        });

        renderEmployees(allEmployees);
    } catch (err) {
        console.error("Failed to fetch employees:", err);
    }
}

function renderEmployees(employees) {
    const tableBody = document.getElementById('employeeTableBody');
    tableBody.innerHTML = '';
    
    employees.forEach(emp => {
        const row = document.createElement('tr');
        row.className = 'border-b border-moh-border hover:bg-moh-bg transition-colors cursor-pointer';
        row.innerHTML = `
            <td class="py-4 px-4 font-mono text-xs font-bold">${emp.employee_id}</td>
            <td class="py-4 px-4 font-bold">${emp.name}</td>
            <td class="py-4 px-4 text-moh-text-sub">${emp.department}</td>
            <td class="py-4 px-4"><span class="bg-moh-bg border border-moh-border px-3 py-1 rounded-full text-[10px] font-bold uppercase">${emp.post || 'N/A'}</span></td>
            <td class="py-4 px-4">
                <span class="flex items-center gap-1.5 text-moh-green font-bold text-[10px] uppercase">
                    <span class="w-1.5 h-1.5 rounded-full bg-moh-green animate-pulse"></span>
                    ${emp.staff_type || emp.status}
                </span>
            </td>
            <td class="py-4 px-4 text-right">
                <button class="text-moh-text-sub hover:text-moh-sidebar transition-all"><i data-lucide="more-horizontal" class="w-5 h-5"></i></button>
            </td>
        `;
        row.addEventListener('click', () => showEmployeeDetails(emp));
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

async function showEmployeeDetails(emp) {
    const modal = document.getElementById('employeeModal');
    document.getElementById('modalEmpName').textContent = emp.name;
    document.getElementById('modalEmpId').textContent = emp.employee_id;
    document.getElementById('modalEmpDept').textContent = emp.department;
    document.getElementById('modalEmpPost').textContent = emp.post || 'N/A';
    document.getElementById('modalEmpInitial').textContent = emp.name.split(' ').map(n => n[0]).join('');
    
    modal.classList.remove('hidden');
    
    // Store current employee data for editing
    modal.dataset.employeeId = emp.id;
    modal.dataset.employeeName = emp.name;
    modal.dataset.employeeEmail = emp.email;
    modal.dataset.employeeDept = emp.department;
    modal.dataset.employeePost = emp.post || '';
    modal.dataset.employeeRole = emp.role || 'employee';
    modal.dataset.employeeStaffType = emp.staff_type || 'permanent';
    modal.dataset.employeeEC = emp.employee_id || '';
    
    // Fetch attendance history for this employee
    try {
        const res = await fetch(`/api/attendance/${emp.id}`);
        const data = await res.json();
        const historyContainer = document.getElementById('modalAttendanceHistory');
        if (data && data.length > 0) {
            historyContainer.innerHTML = data.map(record => `
                <div class="flex justify-between items-center p-3 bg-moh-bg rounded-xl border border-moh-border">
                    <div>
                        <p class="text-sm font-bold capitalize">${record.type.replace('-', ' ')}</p>
                        <p class="text-[10px] text-moh-text-sub font-bold">${new Date(record.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-mono font-bold">${new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        }
    } catch (err) {
        console.error("Failed to fetch employee attendance:", err);
    }
}

document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('employeeModal').classList.add('hidden');
});

document.getElementById('closeEmployeeDetailBtn')?.addEventListener('click', () => {
    document.getElementById('employeeModal').classList.add('hidden');
});

document.getElementById('editEmployeeBtn')?.addEventListener('click', () => {
    const employeeModal = document.getElementById('employeeModal');
    const addEmployeeModal = document.getElementById('addEmployeeModal');
    
    // Get employee data from dataset
    const employeeId = employeeModal.dataset.employeeId;
    const employeeName = employeeModal.dataset.employeeName;
    const employeeEmail = employeeModal.dataset.employeeEmail;
    const employeeDept = employeeModal.dataset.employeeDept;
    const employeePost = employeeModal.dataset.employeePost;
    const employeeRole = employeeModal.dataset.employeeRole;
    const employeeStaffType = employeeModal.dataset.employeeStaffType;
    const employeeEC = employeeModal.dataset.employeeEC;
    
    // Close employee detail modal
    employeeModal.classList.add('hidden');
    
    // Open add employee modal in edit mode
    addEmployeeModal.classList.remove('hidden');
    
    // Update modal title to indicate edit mode
    const modalTitle = addEmployeeModal.querySelector('h3');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i data-lucide="user-pen" class="w-5 h-5 text-moh-green"></i>
            Edit Employee Profile
        `;
    }
    
    // Populate form with employee data
    document.getElementById('newEmpId').value = employeeEC || '';
    document.getElementById('newEmpName').value = employeeName || '';
    document.getElementById('newEmpEmail').value = employeeEmail || '';
    document.getElementById('newEmpRole').value = employeeRole || 'employee';
    document.getElementById('newEmpDept').value = employeeDept || '';
    document.getElementById('newEmpPost').value = employeePost || '';
    document.getElementById('newEmpStaffType').value = employeeStaffType || 'permanent';
    document.getElementById('newEmpPassword').value = '';
    document.getElementById('newEmpPassword').removeAttribute('required');
    document.getElementById('newEmpPassword').placeholder = 'Leave blank to keep current password';
    
    // Store employee ID in form for edit mode
    document.getElementById('addEmployeeForm').dataset.mode = 'edit';
    document.getElementById('addEmployeeForm').dataset.employeeId = employeeId;
    
    // Change submit button text
    const submitBtn = addEmployeeModal.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Update Employee';
    }
    
    // Populate department dropdown
    populateDepartmentDropdown();
    
    lucide.createIcons();
});

document.getElementById('employeeModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('employeeModal')) {
        document.getElementById('employeeModal').classList.add('hidden');
    }
});

function filterEmployees() {
    const dept = document.getElementById('departmentFilter').value;
    const search = document.getElementById('employeeSearch').value.toLowerCase();
    
    const filtered = allEmployees.filter(emp => {
        const matchesDept = dept === 'all' || emp.department === dept;
        const matchesSearch = emp.name.toLowerCase().includes(search) || 
                             emp.employee_id.toLowerCase().includes(search);
        return matchesDept && matchesSearch;
    });
    
    renderEmployees(filtered);
}

document.getElementById('departmentFilter').addEventListener('change', filterEmployees);
document.getElementById('employeeSearch').addEventListener('input', filterEmployees);

let allAttendance = [];
let attendanceSort = { key: 'timestamp', dir: 'desc' };

async function fetchAllAttendance() {
    try {
        const res = await fetch('/api/attendance');
        allAttendance = await res.json();
        filterAttendance();
    } catch (err) {
        console.error("Failed to fetch attendance records:", err);
    }
}

function renderAttendance(records) {
    const tableBody = document.getElementById('attendanceTableBody');
    tableBody.innerHTML = '';
    
    records.forEach(record => {
        const row = document.createElement('tr');
        row.className = 'border-b border-moh-border hover:bg-moh-bg transition-colors';
        row.innerHTML = `
            <td class="py-4 px-4 font-bold">${record.userName}</td>
            <td class="py-4 px-4 text-moh-text-sub">${record.department}</td>
            <td class="py-4 px-4">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${record.type === 'check-in' ? 'bg-emerald-50 border-emerald-100 text-moh-green' : 'bg-red-50 border-red-100 text-moh-red'}">
                    ${record.type.replace('-', ' ')}
                </span>
            </td>
            <td class="py-4 px-4 font-mono text-xs">
                <span class="font-bold">${new Date(record.timestamp).toLocaleDateString('en-GB')}</span>
                <span class="text-moh-text-sub ml-2">${new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </td>
            <td class="py-4 px-4 text-xs max-w-xs truncate" title="${record.location_address || 'Unknown'}">
                ${record.location_address || 'Unknown'}
            </td>
            <td class="py-4 px-4 text-right">
                <span class="text-[10px] font-bold text-moh-green bg-emerald-50 px-2 py-1 rounded-full uppercase">Verified</span>
            </td>
            <td class="py-4 px-4 text-right">
                <button class="text-moh-text-sub hover:text-moh-green transition-all mr-2" onclick="editAttendance(${record.id})"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button class="text-moh-text-sub hover:text-moh-sidebar transition-all" onclick="deleteAttendance(${record.id})"><i data-lucide="trash-2" class="w-4 h-4 text-moh-red"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

function filterAttendance() {
    const from = document.getElementById('attendanceDateFrom').value;
    const to = document.getElementById('attendanceDateTo').value;
    const search = document.getElementById('attendanceSearch').value.toLowerCase();
    
    let filtered = allAttendance.filter(record => {
        const date = record.timestamp.split('T')[0];
        const matchesFrom = !from || date >= from;
        const matchesTo = !to || date <= to;
        const matchesSearch = record.userName.toLowerCase().includes(search);
        return matchesFrom && matchesTo && matchesSearch;
    });
    
    // Sort
    filtered.sort((a, b) => {
        let valA = a[attendanceSort.key];
        let valB = b[attendanceSort.key];
        
        if (attendanceSort.key === 'timestamp') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }
        
        if (valA < valB) return attendanceSort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return attendanceSort.dir === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderAttendance(filtered);
}

window.sortAttendance = (key) => {
    if (attendanceSort.key === key) {
        attendanceSort.dir = attendanceSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        attendanceSort.key = key;
        attendanceSort.dir = 'asc';
    }
    filterAttendance();
};

document.getElementById('attendanceDateFrom')?.addEventListener('change', filterAttendance);
document.getElementById('attendanceDateTo')?.addEventListener('change', filterAttendance);
document.getElementById('attendanceSearch')?.addEventListener('input', filterAttendance);

// \u2500\u2500 Navigation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const NAV_INACTIVE = 'w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-all';
const NAV_ACTIVE = 'w-full flex items-center gap-3 px-4 py-3 bg-moh-green text-white rounded-xl font-medium transition-all';

function showView(viewName) {
    const sections = {
        overview: document.getElementById('overviewSection'),
        employees: document.getElementById('employeesSection'),
        departments: document.getElementById('departmentsSection'),
        attendance: document.getElementById('attendanceSection'),
        realTimeMetrics: document.getElementById('realTimeMetricsSection'),
        reports: document.getElementById('monthlyReportsSection'),
        leaveRequests: document.getElementById('leaveRequestsSection')
    };
    const navButtons = {
        overview: document.getElementById('navOverview'),
        employees: document.getElementById('navEmployees'),
        departments: document.getElementById('navDepartments'),
        attendance: document.getElementById('navAttendanceTracking'),
        realTimeMetrics: document.getElementById('navRealTimeMetrics'),
        reports: document.getElementById('navReports'),
        leaveRequests: document.getElementById('navLeaveRequests')
    };

    // Hide all, reset nav
    Object.values(sections).forEach(s => { if (s) { s.style.display = 'none'; s.classList.add('hidden'); } });
    Object.values(navButtons).forEach(b => { if (b) b.className = NAV_INACTIVE; });

    // Show target
    if (sections[viewName]) {
        sections[viewName].style.display = '';
        sections[viewName].classList.remove('hidden');
    }
    if (navButtons[viewName]) {
        navButtons[viewName].className = NAV_ACTIVE;
    }

    // Load section-specific data
    if (viewName === 'overview') {
        initDashboardCharts();
    } else if (viewName === 'employees') {
        fetchEmployees();
    } else if (viewName === 'departments') {
        fetchDepartments();
    } else if (viewName === 'attendance') {
        fetchAllAttendance();
    } else if (viewName === 'realTimeMetrics') {
        fetchRealTimeMetrics();
    } else if (viewName === 'reports') {
        initializeReports();
    } else if (viewName === 'leaveRequests') {
        fetchLeaveRequests();
    }
}

// If there's an initialize function to run based on current page
// that was previously triggered by showView, we can run it here
const path = window.location.pathname;
if (path === '/dashboard') {
    showView('overview');
} else if (path === '/employees') {
    showView('employees');
} else if (path === '/departments') {
    showView('departments');
} else if (path === '/realtime-metrics') {
    showView('realTimeMetrics');
} else if (path === '/attendance-tracking') {
    showView('attendance');
} else if (path === '/reports') {
    showView('reports');
}

// Setup event listeners for sidebar navigation
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('navOverview')?.addEventListener('click', (e) => { e.preventDefault(); showView('overview'); });
    document.getElementById('navEmployees')?.addEventListener('click', (e) => { e.preventDefault(); showView('employees'); });
    document.getElementById('navDepartments')?.addEventListener('click', (e) => { e.preventDefault(); showView('departments'); });
    document.getElementById('navRealTimeMetrics')?.addEventListener('click', (e) => { e.preventDefault(); showView('realTimeMetrics'); });
    document.getElementById('navAttendanceTracking')?.addEventListener('click', (e) => { e.preventDefault(); showView('attendance'); });
    document.getElementById('navReports')?.addEventListener('click', (e) => { e.preventDefault(); showView('reports'); });
    document.getElementById('navLeaveRequests')?.addEventListener('click', (e) => { e.preventDefault(); showView('leaveRequests'); });
});

let overviewHourlyChartObj = null;
let overviewDeptChartObj = null;

async function initDashboardCharts() {
    try {
        const res = await fetch('/api/realtime-metrics');
        const metrics = await res.json();
        
        const hourlyCtx = document.getElementById('overviewHourlyChart');
        if (hourlyCtx && metrics.hourlyActivity) {
            if (overviewHourlyChartObj) overviewHourlyChartObj.destroy();
            overviewHourlyChartObj = new Chart(hourlyCtx, {
                type: 'bar',
                data: {
                    labels: metrics.hourlyActivity.map(d => d.hour),
                    datasets: [{
                        label: 'Activity',
                        data: metrics.hourlyActivity.map(d => d.count),
                        backgroundColor: '#00843D',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        const deptCtx = document.getElementById('overviewDeptChart');
        if (deptCtx && metrics.departmentActivity) {
            if (overviewDeptChartObj) overviewDeptChartObj.destroy();
            overviewDeptChartObj = new Chart(deptCtx, {
                type: 'doughnut',
                data: {
                    labels: metrics.departmentActivity.map(d => d.name),
                    datasets: [{
                        data: metrics.departmentActivity.map(d => d.count),
                        backgroundColor: [
                            '#00843D', '#FFD200', '#D40000', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: { size: 10 }
                            }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error("Failed to load dashboard charts:", err);
    }
}

async function handleAttendance(type) {
    try {
        const res = await fetch(`/api/attendance/${type}`, { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
            showNotification(`Successfully clocked out!`, 'success');
            fetchStats();
            fetchActivity();
            if (document.getElementById('attendanceSection').classList.contains('hidden') === false) {
                fetchAllAttendance();
            }
        } else {
            showNotification(data.message, 'error');
        }
    } catch (err) {
        console.error(`Failed to ${type}:`, err);
        showNotification('System error. Please try again.', 'error');
    }
}

async function autoCheckIn() {
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
                    fetchStats();
                    fetchActivity();
                    if (document.getElementById('attendanceSection') && !document.getElementById('attendanceSection').classList.contains('hidden')) {
                        fetchAllAttendance();
                    }
                }
            } catch (err) {
                console.error('Failed to auto check-in:', err);
            }
        }, async (error) => {
            console.warn('Geolocation error or permission denied:', error);
            showNotification('Location access denied. Checking in without location...', 'error');
            const res = await fetch('/api/attendance/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
            const data = await res.json();
            if (data.success) {
                fetchStats(); fetchActivity();
                if (document.getElementById('attendanceSection') && !document.getElementById('attendanceSection').classList.contains('hidden')) {
                    fetchAllAttendance();
                }
            }
        }, { timeout: 10000 });
    } else {
        const res = await fetch('/api/attendance/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const data = await res.json();
        if (data.success) {
            fetchStats(); fetchActivity();
            if (document.getElementById('attendanceSection') && !document.getElementById('attendanceSection').classList.contains('hidden')) {
                fetchAllAttendance();
            }
        }
    }
}

function showNotification(message, type) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-50 transform transition-all duration-300 translate-y-20 opacity-0 flex items-center gap-3 font-bold text-sm ${
        type === 'success' ? 'bg-moh-green text-white' : 'bg-moh-red text-white'
    }`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-5 h-5"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    lucide.createIcons();
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-20', 'opacity-0');
    }, 10);
    
    // Remove after 5s
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

document.getElementById('checkInBtn').addEventListener('click', () => handleAttendance('checkin'));
document.getElementById('checkOutBtn').addEventListener('click', () => handleAttendance('checkout'));

document.getElementById('logoutBtn').addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    }
});

let allDepartments = [];

// Departments functionality
async function fetchDepartments() {
    try {
        const res = await fetch('/api/departments');
        allDepartments = await res.json();
        renderDepartments(allDepartments);
    } catch (err) {
        console.error("Failed to fetch departments:", err);
        document.getElementById('departmentsGrid').innerHTML = `
            <div class="col-span-full py-20 text-center text-moh-red">
                <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-4"></i>
                <p>Failed to load departments. Please try again later.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function filterDepartments() {
    const query = document.getElementById('departmentSearch')?.value.toLowerCase() || '';
    
    const filtered = allDepartments.map(dept => {
        // Find sub-departments that match the query
        const matchingSubs = (dept.subDepartments || []).filter(sub => 
            sub.name.toLowerCase().includes(query)
        );
        
        // Check if directorate name matches
        const directorateMatches = dept.name.toLowerCase().includes(query);
        
        if (directorateMatches || matchingSubs.length > 0) {
            return {
                ...dept,
                subDepartments: directorateMatches ? dept.subDepartments : matchingSubs
            };
        }
        return null;
    }).filter(d => d !== null);
    
    renderDepartments(filtered);
}

document.getElementById('departmentSearch')?.addEventListener('input', filterDepartments);

function renderDepartments(departments) {
    const grid = document.getElementById('departmentsGrid');
    grid.innerHTML = '';
    
    let totalUnits = 0;
    
    departments.forEach(dept => {
        totalUnits += (dept.subDepartments ? dept.subDepartments.length : 0);
        
        const card = document.createElement('div');
        card.className = 'bento-card fade-in';
        
        // Map colors to Tailwind classes
        const colorMap = {
            emerald: 'bg-emerald-100 text-emerald-600',
            blue: 'bg-blue-100 text-blue-600',
            purple: 'bg-purple-100 text-purple-600',
            yellow: 'bg-yellow-100 text-yellow-600',
            green: 'bg-green-100 text-green-600',
            orange: 'bg-orange-100 text-orange-600',
            red: 'bg-red-100 text-red-600',
            indigo: 'bg-indigo-100 text-indigo-600'
        };
        
        const colorClass = colorMap[dept.color] || 'bg-gray-100 text-gray-600';
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 ${colorClass} rounded-xl flex items-center justify-center">
                        <i data-lucide="${dept.icon || 'building'}" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-moh-text-main leading-tight">${dept.name}</h3>
                        <p class="text-[10px] text-moh-text-sub uppercase tracking-widest font-bold">${dept.subDepartments ? dept.subDepartments.length : 0} Units</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button class="text-moh-text-sub hover:text-moh-green transition-all" onclick="editDepartment('${dept.id}')"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button class="text-moh-text-sub hover:text-moh-red transition-all" onclick="deleteDepartment('${dept.id}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
            <div class="space-y-1">
                ${(dept.subDepartments || []).map(sub => `
                    <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors cursor-default group">
                        <span class="text-xs font-medium text-gray-700 group-hover:text-moh-green transition-colors">${sub.name}</span>
                        <span class="text-[10px] font-bold bg-white border border-moh-border px-2 py-0.5 rounded-full text-moh-text-sub">${sub.staffCount || 0} Staff</span>
                    </div>
                `).join('')}
            </div>
        `;
        grid.appendChild(card);
    });
    
    // Update summary stats
    const totalDirectoratesEl = document.getElementById('totalDirectorates');
    if(totalDirectoratesEl) totalDirectoratesEl.textContent = departments.length;
    
    const totalUnitsEl = document.getElementById('totalUnits');
    if(totalUnitsEl) totalUnitsEl.textContent = totalUnits;
    
    lucide.createIcons();
}

// Real-time metrics functionality
async function fetchRealTimeMetrics() {
    try {
        const res = await fetch('/api/realtime-metrics');
        const metrics = await res.json();
        updateRealTimeMetrics(metrics);
    } catch (err) {
        console.error("Failed to fetch real-time metrics:", err);
    }
}

function updateRealTimeMetrics(metrics) {
    document.getElementById('rtActiveNowCount').textContent = metrics.activeNow || 0;
    document.getElementById('rtPresentTodayCount').textContent = metrics.checkinsToday || 0;
    document.getElementById('rtLateArrivalsCount').textContent = metrics.lateArrivals || 0;
    document.getElementById('rtAbsentTodayCount').textContent = metrics.absentToday || 0;
    document.getElementById('rtAttendanceRateLabel').textContent = (metrics.efficiencyRate || 0) + '% attendance rate';
    
    // Hourly Activity Chart
    const hourlyContainer = document.getElementById('hourlyActivityChart');
    if (metrics.hourlyActivity && metrics.hourlyActivity.length > 0) {
        hourlyContainer.className = 'flex-1 overflow-y-auto pr-2 space-y-6';
        hourlyContainer.innerHTML = metrics.hourlyActivity.map(h => {
             return `
                <div class="flex items-center gap-3">
                    <span class="text-xs font-bold text-moh-text-sub w-12">${h.hour}</span>
                    <div class="flex-1 h-8 bg-moh-bg rounded-lg overflow-hidden">
                        <div class="h-full bg-moh-green/20 hover:bg-moh-green/40 transition-all rounded-lg flex items-center justify-end pr-2" style="width: ${Math.min(h.count * 10, 100)}%">
                            <span class="text-[10px] font-bold text-moh-green">${h.count}</span>
                        </div>
                    </div>
                </div>
             `;
        }).join('');
    } else {
        hourlyContainer.innerHTML = '<p class="text-moh-text-sub italic text-center py-10">No data today</p>';
    }

    // Department Activity Chart
    const deptCanvas = document.getElementById('departmentActivityChart');
    if (deptCanvas) {
        if (metrics.departmentActivity && metrics.departmentActivity.length > 0) {
            const ctx = deptCanvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.deptChartInstance) {
                window.deptChartInstance.destroy();
            }
            
            // Create gradient for bars
            const gradient = ctx.createLinearGradient(0, 0, 0, 256);
            gradient.addColorStop(0, '#00843D');
            gradient.addColorStop(1, '#00A852');
            
            window.deptChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: metrics.departmentActivity.map(d => d.name),
                    datasets: [{
                        label: 'Employees Present',
                        data: metrics.departmentActivity.map(d => d.count),
                        backgroundColor: gradient,
                        borderColor: '#006B30',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                        hoverBackgroundColor: '#00A852',
                        hoverBorderColor: '#00843D',
                        hoverBorderWidth: 3,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart',
                        delay: (context) => context.dataIndex * 100
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            padding: 12,
                            cornerRadius: 8,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    return `${context.parsed.y} employees present`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                font: {
                                    size: 11,
                                    weight: '500'
                                },
                                color: '#64748B'
                            },
                            grid: {
                                display: true,
                                color: '#E2E8F0',
                                drawBorder: false,
                                borderDash: [5, 5]
                            },
                            border: {
                                display: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45,
                                font: {
                                    size: 10,
                                    weight: '600'
                                },
                                color: '#1A1A1A',
                                padding: 8
                            },
                            border: {
                                display: false
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        } else {
            // Show no data message
            const ctx = deptCanvas.getContext('2d');
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#64748B';
            ctx.textAlign = 'center';
            ctx.fillText('No data today', deptCanvas.width / 2, deptCanvas.height / 2);
        }
    }

    // Today's Attendance Timeline
    const timelineContainer = document.getElementById('todayAttendanceTimeline');
    if (metrics.recentAttendance && metrics.recentAttendance.length > 0) {
        timelineContainer.innerHTML = `
            <table class="w-full text-left">
                <thead>
                    <tr class="text-moh-text-sub text-[10px] font-bold uppercase tracking-widest border-b border-moh-border">
                        <th class="pb-3 px-3">Time</th>
                        <th class="pb-3 px-3">Employee</th>
                        <th class="pb-3 px-3">Department</th>
                        <th class="pb-3 px-3">Type</th>
                        <th class="pb-3 px-3">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${metrics.recentAttendance.map(record => `
                        <tr class="border-b border-moh-border hover:bg-moh-bg transition-colors">
                            <td class="py-3 px-3 font-mono text-xs font-bold">${new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td class="py-3 px-3 font-bold">${record.userName}</td>
                            <td class="py-3 px-3 text-moh-text-sub text-xs">${record.department}</td>
                            <td class="py-3 px-3">
                                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                    record.type === 'check-in' ? 'bg-emerald-50 border-emerald-100 text-moh-green' : 'bg-red-50 border-red-100 text-moh-red'
                                }">
                                    ${record.type.replace('-', ' ')}
                                </span>
                            </td>
                            <td class="py-3 px-3">
                                <span class="text-[10px] font-bold text-moh-green bg-emerald-50 px-2 py-1 rounded-full uppercase">Verified</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        timelineContainer.innerHTML = '<p class="text-moh-text-sub italic text-center py-10">No attendance records today</p>';
    }
}

// Monthly reports functionality
function initializeReports() {
    populateDateSelectors();
    fetchMonthlyReportData();
}

function populateDateSelectors() {
    const monthSelect = document.getElementById('reportMonth');
    const yearSelect = document.getElementById('reportYear');
    
    if (monthSelect.options.length > 0) return; // Prevent duplicate population
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const currentYear = new Date().getFullYear();
    
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // Set current month and year as default
    monthSelect.value = new Date().getMonth() + 1;
    yearSelect.value = currentYear;
}

async function fetchMonthlyReportData() {
    try {
        const month = document.getElementById('reportMonth').value;
        const year = document.getElementById('reportYear').value;
        
        if (!month || !year) return;
        
        const res = await fetch(`/api/monthly-report?month=${month}&year=${year}`);
        const data = await res.json();
        renderMonthlyReport(data);
    } catch (err) {
        console.error("Failed to fetch monthly report:", err);
    }
}

function renderMonthlyReport(data) {
    // Update summary cards
    document.getElementById('totalEmployees').textContent = data.employees ? data.employees.length : 0;
    document.getElementById('avgAttendance').textContent = data.summary ? (data.summary.avgAttendance + '%') : '0%';
    
    let totalHours = 0;
    let totalAbsences = 0;
    
    // Render employee table
    const tableBody = document.getElementById('attendanceTable');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (data.employees && data.employees.length > 0) {
            data.employees.forEach(emp => {
                totalHours += (emp.totalHours || 0);
                totalAbsences += (emp.daysAbsent || 0);
                
                const row = document.createElement('tr');
                row.className = 'border-b border-moh-border hover:bg-moh-bg transition-colors';
                row.innerHTML = `
                    <td class="py-4 px-4 font-bold">${emp.name}</td>
                    <td class="py-4 px-4 text-moh-text-sub">${emp.department}</td>
                    <td class="py-4 px-4 font-bold text-moh-green">${emp.daysPresent}</td>
                    <td class="py-4 px-4 font-bold text-moh-red">${emp.daysAbsent || 0}</td>
                    <td class="py-4 px-4 font-bold text-amber-600">${emp.lateArrivals}</td>
                    <td class="py-4 px-4">
                        <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            emp.attendanceRate >= 95 ? 'bg-emerald-50 border-emerald-100 text-moh-green' :
                            emp.attendanceRate >= 85 ? 'bg-amber-50 border-amber-100 text-amber-600' :
                            'bg-red-50 border-red-100 text-moh-red'
                        }">
                            ${emp.attendanceRate}%
                        </span>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-moh-text-sub italic">No data available for selected period</td></tr>';
        }
    }
    
    document.getElementById('totalHours').textContent = Math.round(totalHours);
    document.getElementById('absences').textContent = totalAbsences;

    // Update charts
    updateMonthlyCharts(data);
}

let monthlyAttendanceChart = null;
let monthlyDepartmentChart = null;

async function fetchRealtimeAttendanceData() {
    try {
        const res = await fetch('/api/realtime-metrics');
        const metrics = await res.json();
        return metrics;
    } catch (err) {
        console.error('Failed to fetch realtime data:', err);
        return null;
    }
}

function updateMonthlyCharts(data) {
    const attendanceCtx = document.getElementById('attendanceChart');
    const departmentCtx = document.getElementById('departmentChart');
    
    if (!attendanceCtx || !departmentCtx) return;

    if (monthlyAttendanceChart) monthlyAttendanceChart.destroy();
    if (monthlyDepartmentChart) monthlyDepartmentChart.destroy();

    // Fetch real-time hourly data
    fetchRealtimeAttendanceData().then(metrics => {
        if (!metrics) return;

        const hourlyLabels = metrics.hourlyActivity.map(h => h.hour);
        const hourlyData = metrics.hourlyActivity.map(h => h.count);

        // Create gradient for line chart
        const ctx = attendanceCtx.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, 'rgba(0, 132, 61, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 132, 61, 0.0)');

        monthlyAttendanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hourlyLabels,
                datasets: [{
                    label: 'Check-ins by Hour',
                    data: hourlyData,
                    borderColor: '#00843D',
                    backgroundColor: gradient,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00843D',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y} check-ins`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 11, weight: '500' },
                            color: '#64748B'
                        },
                        grid: {
                            color: '#E2E8F0',
                            borderDash: [5, 5]
                        },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10, weight: '600' },
                            color: '#1A1A1A',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        border: { display: false }
                    }
                }
            }
        });
    });

    const deptCounts = {};
    if (data.employees) {
        data.employees.forEach(emp => {
            deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
        });
    }

    monthlyDepartmentChart = new Chart(departmentCtx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(deptCounts),
            datasets: [{
                data: Object.values(deptCounts),
                backgroundColor: ['#00843D', '#FFD200', '#D40000', '#3B82F6', '#8B5CF6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

document.getElementById('reportMonth')?.addEventListener('change', fetchMonthlyReportData);
document.getElementById('reportYear')?.addEventListener('change', fetchMonthlyReportData);
document.getElementById('exportBtn')?.addEventListener('click', () => {
    const tableRows = document.querySelectorAll('#attendanceTable tr');
    if (!tableRows || tableRows.length === 0 || tableRows[0].cells.length === 1) {
        showNotification('No data to export', 'error');
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,Employee,Department,Days Present,Days Absent,Late Arrivals,Total Hours,Attendance %\\n";
    tableRows.forEach(row => {
        const cells = Array.from(row.cells).map(cell => cell.textContent.trim().replace(/\\n/g, ' '));
        csvContent += cells.join(",") + "\\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "monthly_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Modal event listeners
document.getElementById('addEmployeeBtn')?.addEventListener('click', async () => {
    document.getElementById('addEmployeeModal').classList.remove('hidden');
    // Populate department dropdown
    await populateDepartmentDropdown();
});

async function populateDepartmentDropdown() {
    try {
        const res = await fetch('/api/departments');
        const departments = await res.json();
        
        const deptSelect = document.getElementById('newEmpDept');
        if (!deptSelect) return;
        
        deptSelect.innerHTML = '<option value="">Select Department</option>';
        
        departments.forEach(dept => {
            if (dept.subDepartments && dept.subDepartments.length > 0) {
                dept.subDepartments.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit.name;
                    option.textContent = `${dept.name} / ${unit.name}`;
                    deptSelect.appendChild(option);
                });
            }
        });
    } catch (err) {
        console.error('Failed to load departments:', err);
    }
}

document.getElementById('closeAddEmployeeModal')?.addEventListener('click', () => {
    resetAddEmployeeModal();
    document.getElementById('addEmployeeModal').classList.add('hidden');
});
document.getElementById('cancelAddEmployee')?.addEventListener('click', () => {
    resetAddEmployeeModal();
    document.getElementById('addEmployeeModal').classList.add('hidden');
});

function resetAddEmployeeModal() {
    const modal = document.getElementById('addEmployeeModal');
    const form = document.getElementById('addEmployeeForm');
    
    // Reset form mode to add
    delete form.dataset.mode;
    delete form.dataset.employeeId;
    
    // Reset modal title
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i data-lucide="user-plus" class="w-5 h-5 text-moh-green"></i>
            Add New Employee
        `;
    }
    
    // Reset submit button text
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Add Employee';
    }
    
    // Reset password field
    document.getElementById('newEmpPassword').setAttribute('required', 'true');
    document.getElementById('newEmpPassword').placeholder = 'Enter default password';
    
    // Reset form
    form.reset();
    
    lucide.createIcons();
}

document.getElementById('addEmployeeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = document.getElementById('addEmployeeForm');
    const isEditMode = form.dataset.mode === 'edit';
    const employeeId = form.dataset.employeeId;
    
    const data = {
        employee_id: document.getElementById('newEmpId').value,
        name: document.getElementById('newEmpName').value,
        email: document.getElementById('newEmpEmail').value,
        password: document.getElementById('newEmpPassword').value,
        role: document.getElementById('newEmpRole').value,
        department: document.getElementById('newEmpDept').value,
        post: document.getElementById('newEmpPost').value,
        staff_type: document.getElementById('newEmpStaffType').value
    };
    
    // Remove password if empty in edit mode
    if (isEditMode && !data.password) {
        delete data.password;
    }

    // Remove employee_id if empty
    if (!data.employee_id) {
        delete data.employee_id;
    }
    
    try {
        let res;
        if (isEditMode) {
            // Update existing employee
            res = await fetch(`/api/employees/${employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Add new employee
            res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        const result = await res.json();
        if (result.success) {
            showNotification(isEditMode ? 'Employee updated successfully!' : 'Employee added successfully!', 'success');
            resetAddEmployeeModal();
            document.getElementById('addEmployeeModal').classList.add('hidden');
            fetchEmployees();
        } else {
            showNotification(result.message || (isEditMode ? 'Error updating employee' : 'Error adding employee'), 'error');
        }
    } catch (err) {
        showNotification('System error', 'error');
    }
});

document.getElementById('exportAttendance')?.addEventListener('click', () => {
    if (allAttendance.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    const csvRows = ['Employee,Department,Type,Timestamp,Status'];
    allAttendance.forEach(record => {
        const type = record.type.replace('-', ' ');
        const time = new Date(record.timestamp).toLocaleString();
        csvRows.push(`${record.userName},${record.department},${type},${time},Verified`);
    });
    const blob = new Blob([csvRows.join('\\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'attendance_export.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Export successful!', 'success');
});

document.getElementById('addDepartmentBtn')?.addEventListener('click', () => {
    document.getElementById('departmentForm').reset();
    document.getElementById('deptModalMode').value = 'add';
    document.getElementById('deptIdContainer').classList.remove('hidden');
    document.getElementById('departmentModalTitle').innerHTML = '<i data-lucide="building" class="w-5 h-5 text-moh-green"></i> Add Department';
    document.getElementById('departmentModal').classList.remove('hidden');
    lucide.createIcons();
});

document.getElementById('closeDepartmentModal')?.addEventListener('click', () => {
    document.getElementById('departmentModal').classList.add('hidden');
});
document.getElementById('cancelDepartment')?.addEventListener('click', () => {
    document.getElementById('departmentModal').classList.add('hidden');
});

document.getElementById('departmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('deptModalMode').value;
    const id = document.getElementById('newDeptId').value;
    const data = {
        id: id,
        name: document.getElementById('newDeptName').value,
        icon: document.getElementById('newDeptIcon').value,
        color: document.getElementById('newDeptColor').value
    };
    
    try {
        const url = mode === 'add' ? '/api/departments' : `/api/departments/${id}`;
        const method = mode === 'add' ? 'POST' : 'PUT';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            showNotification(`Department ${mode === 'add' ? 'added' : 'updated'} successfully!`, 'success');
            document.getElementById('departmentModal').classList.add('hidden');
            fetchDepartments();
        } else {
            showNotification(result.message || 'Error saving department', 'error');
        }
    } catch (err) {
        showNotification('System error', 'error');
    }
});

document.getElementById('generateReportBtn')?.addEventListener('click', () => {
    fetchMonthlyReportData();
    showNotification('Report generated successfully!', 'success');
});

document.getElementById('reportMonth')?.addEventListener('change', fetchMonthlyReportData);
document.getElementById('reportYear')?.addEventListener('change', fetchMonthlyReportData);

// Global functions for department actions
let departmentsCache = [];
const origFetchDepartments = fetchDepartments;
fetchDepartments = async function() {
    try {
        const res = await fetch('/api/departments');
        departmentsCache = await res.json();
        renderDepartments(departmentsCache);
    } catch (err) {
        console.error("Failed to fetch departments:", err);
    }
};

window.editDepartment = (idStr) => {
    const dept = departmentsCache.find(d => d.id == idStr || d.id === idStr);
    if (!dept) return;
    
    document.getElementById('deptModalMode').value = 'edit';
    document.getElementById('newDeptId').value = dept.id;
    document.getElementById('deptIdContainer').classList.add('hidden'); // Hide ID field when editing since it is PK
    document.getElementById('newDeptName').value = dept.name;
    document.getElementById('newDeptIcon').value = dept.icon || 'building';
    document.getElementById('newDeptColor').value = dept.color || 'emerald';
    
    document.getElementById('departmentModalTitle').innerHTML = '<i data-lucide="edit-2" class="w-5 h-5 text-moh-green"></i> Edit Department';
    document.getElementById('departmentModal').classList.remove('hidden');
    lucide.createIcons();
};

window.deleteDepartment = async (id) => {
    if (confirm('Are you sure you want to delete this department?')) {
        try {
            const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                showNotification('Department deleted successfully!', 'success');
                fetchDepartments();
            } else {
                showNotification(result.message || 'Error deleting department', 'error');
            }
        } catch(err) {
            showNotification('System error', 'error');
        }
    }
};

window.deleteAttendance = async (id) => {
    if (confirm('Are you sure you want to delete this attendance record?')) {
        try {
            const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                showNotification('Attendance record deleted successfully!', 'success');
                fetchAllAttendance();
                fetchStats();
            } else {
                showNotification(result.message || 'Error deleting record', 'error');
            }
        } catch(err) {
            showNotification('System error', 'error');
        }
    }
};

window.editAttendance = async (id) => {
    const record = allAttendance.find(a => a.id === id);
    if (!record) return;

    const newType = prompt('Edit Type (check-in or check-out):', record.type);
    if (!newType || !['check-in', 'check-out'].includes(newType)) {
        if (newType !== null) showNotification('Invalid type', 'error');
        return;
    }

    const newLocation = prompt('Edit Location Address:', record.location_address || '');
    if (newLocation === null) return;

    try {
        const res = await fetch(`/api/attendance/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: newType, location_address: newLocation })
        });
        const result = await res.json();
        if (result.success) {
            showNotification('Attendance record updated successfully!', 'success');
            fetchAllAttendance();
        } else {
            showNotification(result.message || 'Error updating record', 'error');
        }
    } catch(err) {
        showNotification('System error', 'error');
    }
};

// Leave Requests functionality
async function fetchLeaveRequests() {
    try {
        const res = await fetch('/api/admin/leave-requests');
        const requests = await res.json();
        renderLeaveRequests(requests);
    } catch (err) {
        console.error("Failed to fetch leave requests:", err);
        document.getElementById('leaveRequestsTable').innerHTML = `
            <tr>
                <td colspan="8" class="py-10 text-center text-moh-red">
                    <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>
                    <p>Failed to load leave requests. Please try again later.</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
    }
}

function renderLeaveRequests(requests) {
    const tableBody = document.getElementById('leaveRequestsTable');
    tableBody.innerHTML = '';

    if (!requests || requests.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="py-10 text-center text-moh-text-sub">
                    <i data-lucide="calendar-x" class="w-8 h-8 mx-auto mb-2"></i>
                    <p>No leave requests found.</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    requests.forEach(request => {
        const row = document.createElement('tr');
        row.className = 'border-b border-moh-border hover:bg-moh-bg transition-colors';

        const statusClass = request.status === 'approved' ? 'bg-green-100 text-green-800' :
                           request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                           'bg-yellow-100 text-yellow-800';

        row.innerHTML = `
            <td class="py-4 px-4 font-bold">${request.userName}</td>
            <td class="py-4 px-4 text-moh-text-sub">${request.department}</td>
            <td class="py-4 px-4"><span class="capitalize">${request.type}</span></td>
            <td class="py-4 px-4 font-mono text-xs">${new Date(request.start_date).toLocaleDateString('en-GB')}</td>
            <td class="py-4 px-4 font-mono text-xs">${new Date(request.end_date).toLocaleDateString('en-GB')}</td>
            <td class="py-4 px-4 text-xs max-w-xs truncate" title="${request.reason || 'N/A'}">${request.reason || 'N/A'}</td>
            <td class="py-4 px-4">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${statusClass}">${request.status}</span>
            </td>
            <td class="py-4 px-4 text-right">
                ${request.status === 'pending' ? `
                    <button class="text-moh-green hover:text-emerald-800 transition-all mr-2" onclick="updateLeaveRequest('${request.id}', 'approved')">
                        <i data-lucide="check" class="w-4 h-4"></i>
                    </button>
                    <button class="text-moh-red hover:text-red-700 transition-all" onclick="updateLeaveRequest('${request.id}', 'rejected')">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                ` : `
                    <span class="text-[10px] text-moh-text-sub font-bold uppercase">Processed</span>
                `}
            </td>
        `;
        tableBody.appendChild(row);
    });
    lucide.createIcons();
}

window.updateLeaveRequest = async (id, status) => {
    try {
        const res = await fetch(`/api/admin/leave-requests/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const result = await res.json();
        if (result.success) {
            showNotification(`Leave request ${status} successfully!`, 'success');
            fetchLeaveRequests();
        } else {
            showNotification(result.message || 'Error updating leave request', 'error');
        }
    } catch (err) {
        showNotification('System error', 'error');
    }
};

document.getElementById('refreshLeaveRequests')?.addEventListener('click', fetchLeaveRequests);

// Init
initAI();
fetchStats();
fetchActivity();
// autoCheckIn(); // Disabled - manual clock in/out via buttons
setInterval(fetchStats, 30000);

// Only set up activity interval if the element exists
if (document.getElementById('activityFeed')) {
    setInterval(fetchActivity, 10000);
}
