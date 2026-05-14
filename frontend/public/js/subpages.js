document.addEventListener('DOMContentLoaded', async () => {
    // Initialize icons if not already done
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    let currentUser = null;

    try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            currentUser = await res.json();
            
            const nameEl = document.getElementById('employeeName');
            const idEl = document.getElementById('employeeId');
            const deptEl = document.getElementById('employeeDept');
            
            if (nameEl) nameEl.textContent = currentUser.name || 'Employee';
            if (idEl) idEl.textContent = currentUser.employee_id || 'EMP-000';
            if (deptEl) deptEl.textContent = currentUser.department || 'Department';

            // Populate My Profile inputs if they exist (based on their readonly attribute and order)
            if (window.location.pathname.includes('/my-profile')) {
                const inputs = document.querySelectorAll('input[readonly]');
                if (inputs.length >= 5) {
                    inputs[0].value = currentUser.name || '';
                    inputs[1].value = currentUser.employee_id || '';
                    inputs[2].value = currentUser.email || '';
                    inputs[3].value = currentUser.department || '';
                    inputs[4].value = currentUser.post || 'Employee';
                }
            }
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }

    // My Attendance logic
    if (window.location.pathname.includes('/my-attendance')) {
        try {
            const statsRes = await fetch('/api/user/stats');
            if (statsRes.ok) {
                const stats = await statsRes.json();
                const statCards = document.querySelectorAll('.bento-card h3.text-2xl');
                if (statCards.length >= 4) {
                    statCards[0].textContent = stats.daysPresent || '0';
                    statCards[1].textContent = stats.lateArrivals || '0';
                    statCards[2].textContent = (stats.hoursWorked || '0') + 'h';
                    statCards[3].textContent = (stats.attendanceRate || '0') + '%';
                }
            }

            const statusRes = await fetch('/api/user/today-status');
            if (statusRes.ok) {
                const status = await statusRes.json();
                const todayCheckIn = document.getElementById('todayCheckIn');
                const todayCheckOut = document.getElementById('todayCheckOut');
                const todayDate = document.getElementById('todayDate');
                if (todayCheckIn) todayCheckIn.textContent = status.checkInTime || 'Not checked in';
                if (todayCheckOut) todayCheckOut.textContent = status.checkOutTime || 'Not checked out';
                if (todayDate) todayDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }

            const attRes = await fetch('/api/user/attendance');
            if (attRes.ok) {
                const records = await attRes.json();
                const tbody = document.getElementById('attendanceTableBody');
                if (tbody) {
                    tbody.innerHTML = '';
                    records.forEach(r => {
                        const row = document.createElement('tr');
                        row.className = 'border-b border-moh-border hover:bg-gray-50';
                        row.innerHTML = `
                            <td class="py-4 px-4">${new Date(r.timestamp).toLocaleDateString()}</td>
                            <td class="py-4 px-4">${r.checkInTime || '--:--'}</td>
                            <td class="py-4 px-4">${r.checkOutTime || '--:--'}</td>
                            <td class="py-4 px-4">${r.hoursWorked || '0h'}</td>
                            <td class="py-4 px-4"><span class="px-3 py-1 rounded-full text-xs font-medium ${r.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${r.status || 'unknown'}</span></td>
                        `;
                        tbody.appendChild(row);
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching attendance data:', err);
        }

        document.getElementById('checkInBtn')?.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/attendance/checkin', { method: 'POST' });
                if (res.ok) { alert('Successfully checked in!'); window.location.reload(); }
            } catch (err) { alert('Error checking in'); }
        });
        document.getElementById('checkOutBtn')?.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/attendance/checkout', { method: 'POST' });
                if (res.ok) { alert('Successfully checked out!'); window.location.reload(); }
            } catch (err) { alert('Error checking out'); }
        });
    }

    // Security & Audit logic
    if (window.location.pathname.includes('/security-audit')) {
        try {
            const logsRes = await fetch('/api/user/audit-logs');
            if (logsRes.ok) {
                const logs = await logsRes.json();
                const list = document.getElementById('auditLogList');
                if (list) {
                    list.innerHTML = '';
                    logs.forEach(log => {
                        const div = document.createElement('div');
                        div.className = 'p-4 bg-white rounded-xl border border-moh-border flex justify-between items-start';
                        div.innerHTML = `
                            <div>
                                <p class="font-bold text-sm">${log.action}</p>
                                <p class="text-xs text-moh-text-sub">${log.method} &bull; ${log.status}</p>
                            </div>
                            <span class="text-xs text-moh-text-sub">${new Date(log.timestamp).toLocaleString()}</span>
                        `;
                        list.appendChild(div);
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        }
    }

    // Communication logic
    if (window.location.pathname.includes('/communication')) {
        try {
            const annRes = await fetch('/api/user/announcements');
            if (annRes.ok) {
                const data = await annRes.json();
                const announcements = Array.isArray(data) ? data : [];
                const list = document.getElementById('announcementsList');
                if (list) {
                    list.innerHTML = '';
                    announcements.forEach(a => {
                        const isHigh = a.priority === 'high';
                        const div = document.createElement('div');
                        div.className = `p-4 rounded-xl border ${isHigh ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`;
                        div.innerHTML = `
                            <div class="flex items-start gap-3">
                                <div class="p-2 bg-white rounded-lg">
                                    <i data-lucide="${isHigh ? 'alert-circle' : 'info'}" class="w-4 h-4 ${isHigh ? 'text-red-600' : 'text-blue-600'}"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="font-bold text-sm">${a.title}</p>
                                    <p class="text-sm text-gray-600 mt-1">${a.message}</p>
                                    <p class="text-xs text-gray-400 mt-2">${new Date(a.date || a.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        `;
                        list.appendChild(div);
                    });
                    lucide.createIcons();
                }
            }
        } catch (err) {
            console.error('Error fetching announcements:', err);
        }
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const confirmed = confirm('Are you sure you want to logout?');
            if (confirmed) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login';
            }
        });
    }
});