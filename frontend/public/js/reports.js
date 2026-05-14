// Monthly Reports JavaScript
let attendanceChart = null;
let departmentChart = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setupEventListeners();
    loadReportData();
    initializeCharts();
});

// Setup event listeners
function setupEventListeners() {
    // Month selector
    document.getElementById('monthSelector').addEventListener('change', loadReportData);
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportReport);
    
    // Navigation
    setupNavigation();
}

// Load report data
async function loadReportData() {
    const selectedMonth = document.getElementById('monthSelector').value;
    
    try {
        const res = await fetch(`/api/monthly-report?month=${selectedMonth}`);
        const data = await res.json();
        updateSummaryCards(data);
        updateTable(data.employees);
        updateCharts(data);
    } catch (error) {
        console.error('Error loading report data:', error);
    }
}


// Update summary cards
function updateSummaryCards(data) {
    document.getElementById('totalEmployees').textContent = data.totalEmployees;
    document.getElementById('avgAttendance').textContent = data.avgAttendance + '%';
    document.getElementById('totalHours').textContent = Math.round(data.totalHours);
    document.getElementById('absences').textContent = data.totalAbsences;
}

// Update attendance table
function updateTable(employees) {
    const tableBody = document.getElementById('attendanceTable');
    tableBody.innerHTML = '';
    
    employees.forEach(employee => {
        const row = document.createElement('tr');
        row.className = 'border-b border-moh-border hover:bg-gray-50';
        row.innerHTML = `
            <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-moh-green rounded-full flex items-center justify-center text-white text-xs font-bold">
                        ${employee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                        <p class="font-medium text-moh-text-main">${employee.name}</p>
                        <p class="text-xs text-moh-text-sub">${employee.id}</p>
                    </div>
                </div>
            </td>
            <td class="py-3 px-4 text-moh-text-sub">${employee.department}</td>
            <td class="py-3 px-4 text-center font-medium">${employee.daysPresent}</td>
            <td class="py-3 px-4 text-center font-medium">${employee.daysAbsent}</td>
            <td class="py-3 px-4 text-center font-medium">${employee.lateArrivals}</td>
            <td class="py-3 px-4 text-center font-medium">${employee.totalHours}h</td>
            <td class="py-3 px-4 text-center">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${
                    employee.attendanceRate >= 90 ? 'bg-green-100 text-green-700' :
                    employee.attendanceRate >= 80 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                }">
                    ${employee.attendanceRate}%
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Initialize charts
function initializeCharts() {
    const attendanceCtx = document.getElementById('attendanceChart').getContext('2d');
    const departmentCtx = document.getElementById('departmentChart').getContext('2d');
    
    attendanceChart = new Chart(attendanceCtx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Attendance Rate',
                data: [85, 88, 82, 90],
                borderColor: '#00843D',
                backgroundColor: 'rgba(0, 132, 61, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
    
    departmentChart = new Chart(departmentCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pharmacy', 'Nursing', 'ICT', 'Public Health', 'Administration'],
            datasets: [{
                data: [25, 30, 15, 20, 10],
                backgroundColor: [
                    '#00843D',
                    '#FFD200',
                    '#D40000',
                    '#3B82F6',
                    '#8B5CF6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update charts with new data
function updateCharts(data) {
    if (attendanceChart && data.weeklyData) {
        attendanceChart.data.datasets[0].data = data.weeklyData;
        attendanceChart.update();
    }
    
    if (departmentChart && data.departmentDistribution) {
        departmentChart.data.labels = Object.keys(data.departmentDistribution);
        departmentChart.data.datasets[0].data = Object.values(data.departmentDistribution);
        departmentChart.update();
    }
}

// Export report
function exportReport() {
    const selectedMonth = document.getElementById('monthSelector').value;
    const reportData = {
        month: selectedMonth,
        generatedAt: new Date().toISOString(),
        summary: {
            totalEmployees: document.getElementById('totalEmployees').textContent,
            avgAttendance: document.getElementById('avgAttendance').textContent,
            totalHours: document.getElementById('totalHours').textContent,
            totalAbsences: document.getElementById('absences').textContent
        }
    };
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Monthly Attendance Report\n";
    csvContent += `Month: ${selectedMonth}\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    csvContent += "Employee ID,Name,Department,Days Present,Days Absent,Late Arrivals,Total Hours,Attendance %\n";
    
    const rows = document.querySelectorAll('#attendanceTable tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const rowData = [
                cells[0].querySelector('.text-xs').textContent,
                cells[0].querySelector('.font-medium').textContent,
                cells[1].textContent,
                cells[2].textContent,
                cells[3].textContent,
                cells[4].textContent,
                cells[5].textContent,
                cells[6].querySelector('span').textContent
            ];
            csvContent += rowData.join(',') + '\n';
        }
    });
    
    // Download CSV
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
