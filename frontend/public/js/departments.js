// Departments Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setupNavigation();
    fetchDepartments();
    
    // Search functionality
    document.getElementById('departmentSearch')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterDepartments(query);
    });
});

let allDepartments = [];

async function fetchDepartments() {
    try {
        const res = await fetch('/api/departments');
        allDepartments = await res.json();
        renderDepartments(allDepartments);
    } catch (err) {
        console.error("Failed to fetch departments:", err);
        document.getElementById('departmentContainer').innerHTML = `
            <div class="col-span-full py-20 text-center text-moh-red">
                <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-4"></i>
                <p>Failed to load departments. Please try again later.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderDepartments(departments) {
    const container = document.getElementById('departmentContainer');
    container.innerHTML = '';
    
    let totalUnits = 0;
    
    departments.forEach(dept => {
        totalUnits += dept.subDepartments.length;
        
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
            indigo: 'bg-indigo-100 text-indigo-600',
            amber: 'bg-amber-100 text-amber-600',
            rose: 'bg-rose-100 text-rose-600',
            cyan: 'bg-cyan-100 text-cyan-600',
            slate: 'bg-slate-100 text-slate-600'
        };
        
        const colorClass = colorMap[dept.color] || 'bg-gray-100 text-gray-600';
        
        card.innerHTML = `
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 ${colorClass} rounded-xl flex items-center justify-center">
                    <i data-lucide="${dept.icon || 'building'}" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-sm font-bold text-moh-text-main leading-tight">${dept.name}</h3>
                    <p class="text-[10px] text-moh-text-sub uppercase tracking-widest font-bold">${dept.subDepartments.length} Units</p>
                </div>
            </div>
            <div class="space-y-1">
                ${dept.subDepartments.map(sub => `
                    <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors cursor-default group">
                        <span class="text-xs font-medium text-gray-700 group-hover:text-moh-green transition-colors">${sub.name}</span>
                        <span class="text-[10px] font-bold bg-white border border-moh-border px-2 py-0.5 rounded-full text-moh-text-sub">${sub.staffCount} Staff</span>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(card);
    });
    
    // Update summary stats
    document.getElementById('totalDirectorates').textContent = departments.length;
    document.getElementById('totalUnits').textContent = totalUnits;
    
    lucide.createIcons();
}

function filterDepartments(query) {
    const filtered = allDepartments.map(dept => {
        // Find sub-departments that match the query
        const matchingSubs = dept.subDepartments.filter(sub => 
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
