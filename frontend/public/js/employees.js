// Employees Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setupNavigation();
    setupEmployeeActions();
});

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

// Setup employee actions
function setupEmployeeActions() {
    // Add employee button
    const addEmployeeBtn = document.querySelector('button:has(.lucide-plus)');
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            // TODO: Open add employee modal
            console.log('Add employee clicked');
        });
    }

    // Export button
    const exportBtn = document.querySelector('button:has(.lucide-download)');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            // TODO: Export employee data
            console.log('Export clicked');
        });
    }

    // Search functionality
    const searchInput = document.querySelector('input[placeholder="Search employees..."]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterEmployees(searchTerm);
        });
    }

    // Department filter
    const departmentFilter = document.querySelector('select');
    if (departmentFilter) {
        departmentFilter.addEventListener('change', (e) => {
            const selectedDepartment = e.target.value;
            filterByDepartment(selectedDepartment);
        });
    }
}

// Filter employees by search term
function filterEmployees(searchTerm) {
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const employeeName = row.querySelector('.font-medium')?.textContent.toLowerCase();
        const employeeEmail = row.querySelector('.text-moh-text-sub')?.textContent.toLowerCase();
        const employeeId = row.cells[1]?.textContent.toLowerCase();
        
        if (employeeName?.includes(searchTerm) || 
            employeeEmail?.includes(searchTerm) || 
            employeeId?.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter employees by department
function filterByDepartment(department) {
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const employeeDepartment = row.cells[2]?.textContent;
        
        if (department === 'All Departments' || employeeDepartment === department) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
