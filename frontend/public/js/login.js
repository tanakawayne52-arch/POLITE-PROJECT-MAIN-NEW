// Clear error messages on input
document.getElementById('identifier').addEventListener('input', () => {
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';
});

document.getElementById('password').addEventListener('input', () => {
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMessage');
    
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';
    
    console.log('Login attempt:', { identifier, password });

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ identifier, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Login successful, redirecting to:', data.user.role === 'admin' ? '/dashboard' : '/employee-dashboard');
            
            // Redirect based on user role
            if (data.user.role === 'admin') {
                window.location.replace('/dashboard');
            } else {
                window.location.replace('/employee-dashboard');
            }
        } else {
            // Show error for invalid credentials
            errorMsg.textContent = data.message || 'Login failed. Please try again.';
            errorMsg.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorMsg.textContent = 'Network error. Please try again.';
        errorMsg.classList.remove('hidden');
    }
});
