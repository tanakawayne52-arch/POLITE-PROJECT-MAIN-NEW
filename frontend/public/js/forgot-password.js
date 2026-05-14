// Password visibility toggle
const togglePassword = document.getElementById('togglePassword');
const newPasswordInput = document.getElementById('newPassword');
const eyeIcon = document.getElementById('eyeIcon');

togglePassword.addEventListener('click', () => {
    const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    newPasswordInput.setAttribute('type', type);
    
    if (type === 'text') {
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
        `;
    } else {
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        `;
    }
});

// Request OTP
const requestOtpBtn = document.getElementById('requestOtpBtn');
const requestOtpText = document.getElementById('requestOtpText');
const requestOtpSpinner = document.getElementById('requestOtpSpinner');
const otpSection = document.getElementById('otpSection');
const userInfo = document.getElementById('userInfo');
const userContact = document.getElementById('userContact');
const passwordSection = document.getElementById('passwordSection');
const identifierInput = document.getElementById('identifier');
const securityQuestionSection = document.getElementById('securityQuestionSection');
const securityQuestionText = document.getElementById('securityQuestionText');
const securityAnswerInput = document.getElementById('securityAnswer');

requestOtpBtn.addEventListener('click', async () => {
    const identifier = identifierInput.value.trim();
    
    if (!identifier) {
        showError('Please enter your username, email, or phone.');
        return;
    }
    
    // Show loading state
    requestOtpBtn.disabled = true;
    requestOtpText.textContent = 'Sending...';
    requestOtpSpinner.classList.remove('hidden');
    
    try {
        const response = await fetch('/api/forgot-password/request-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ identifier })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show OTP section
            otpSection.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            userContact.textContent = data.user.email || data.user.phone;
            
            // Disable identifier input and request button
            identifierInput.disabled = true;
            requestOtpBtn.classList.add('hidden');
            
            // Auto-fill OTP for testing convenience
            otpInput.value = data.otp;
            // Trigger input event to show password section
            otpInput.dispatchEvent(new Event('input'));

            // Show security question section (always required)
            securityQuestionSection.classList.remove('hidden');
            if (data.user.security_question) {
                securityQuestionText.textContent = data.user.security_question;
            } else {
                securityQuestionText.textContent = 'No security question set up. Please set up a security question in your dashboard profile before resetting your password.';
            }
            securityAnswerInput.required = true;
            securityAnswerInput.placeholder = 'Enter your answer';

            showSuccess(`OTP sent to ${data.user.email || data.user.phone}. OTP has been auto-filled.`);
        } else {
            showError(data.message || 'Failed to send OTP. Please try again.');
        }
    } catch (error) {
        console.error('Request OTP error:', error);
        showError('Network error. Please try again.');
    } finally {
        requestOtpBtn.disabled = false;
        requestOtpText.textContent = 'Request OTP';
        requestOtpSpinner.classList.add('hidden');
    }
});

// OTP input handler
const otpInput = document.getElementById('otp');
otpInput.addEventListener('input', () => {
    // Only allow numbers
    otpInput.value = otpInput.value.replace(/[^0-9]/g, '');
    
    // When 6 digits entered, show password section
    if (otpInput.value.length === 6) {
        passwordSection.classList.remove('hidden');
    }
});

// Helper functions
function showError(message) {
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.querySelector('span').textContent = message;
    errorMsg.classList.remove('hidden');
}

function showSuccess(message) {
    const successMsg = document.getElementById('successMessage');
    successMsg.querySelector('span').textContent = message;
    successMsg.classList.remove('hidden');
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password)
    };
    
    if (requirements.length) strength++;
    if (requirements.uppercase) strength++;
    if (requirements.lowercase) strength++;
    if (requirements.number) strength++;
    
    return { strength, requirements };
}

// Update password strength indicator
newPasswordInput.addEventListener('input', () => {
    const password = newPasswordInput.value;
    const { strength, requirements } = checkPasswordStrength(password);
    
    // Update strength bars
    const bars = [
        document.getElementById('strengthBar1'),
        document.getElementById('strengthBar2'),
        document.getElementById('strengthBar3'),
        document.getElementById('strengthBar4')
    ];
    
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
    const texts = ['Weak', 'Fair', 'Good', 'Strong'];
    
    bars.forEach((bar, index) => {
        bar.className = 'h-1 flex-1 rounded-full transition-colors';
        if (index < strength) {
            bar.classList.add(colors[strength - 1]);
        } else {
            bar.classList.add('bg-gray-200');
        }
    });
    
    const strengthText = document.getElementById('strengthText');
    if (password.length === 0) {
        strengthText.textContent = 'Password strength';
        strengthText.className = 'text-xs text-gray-500';
    } else {
        strengthText.textContent = texts[strength - 1] || 'Weak';
        strengthText.className = `text-xs ${colors[strength - 1] || 'text-red-500'}`;
    }
    
    // Update requirement indicators
    const updateRequirement = (id, met) => {
        const el = document.getElementById(id);
        if (met) {
            el.classList.remove('text-gray-400');
            el.classList.add('text-green-600');
            el.querySelector('svg').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
        } else {
            el.classList.remove('text-green-600');
            el.classList.add('text-gray-400');
            el.querySelector('svg').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
        }
    };
    
    updateRequirement('reqLength', requirements.length);
    updateRequirement('reqUppercase', requirements.uppercase);
    updateRequirement('reqLowercase', requirements.lowercase);
    updateRequirement('reqNumber', requirements.number);
    
    // Clear error message
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.classList.add('hidden');
    errorMsg.querySelector('span').textContent = '';
});

// Password match checker
const confirmPasswordInput = document.getElementById('confirmPassword');
const matchStatus = document.getElementById('matchStatus');

confirmPasswordInput.addEventListener('input', () => {
    const password = newPasswordInput.value;
    const confirm = confirmPasswordInput.value;
    
    if (confirm.length === 0) {
        matchStatus.textContent = 'Passwords do not match';
        matchStatus.className = 'text-xs mt-1 text-gray-400';
    } else if (password === confirm) {
        matchStatus.textContent = 'Passwords match';
        matchStatus.className = 'text-xs mt-1 text-green-600';
    } else {
        matchStatus.textContent = 'Passwords do not match';
        matchStatus.className = 'text-xs mt-1 text-red-500';
    }
    
    // Clear error message
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.classList.add('hidden');
    errorMsg.querySelector('span').textContent = '';
});

// Clear error on identifier input
document.getElementById('identifier').addEventListener('input', () => {
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.classList.add('hidden');
    errorMsg.querySelector('span').textContent = '';
});

// Form submission
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identifier = identifierInput.value.trim();
    const otp = otpInput.value.trim();
    const securityAnswer = securityAnswerInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    
    // Clear messages
    errorMsg.classList.add('hidden');
    errorMsg.querySelector('span').textContent = '';
    successMsg.classList.add('hidden');
    successMsg.querySelector('span').textContent = '';
    
    // Validate identifier
    if (!identifier) {
        errorMsg.querySelector('span').textContent = 'Please enter your username, email, or phone.';
        errorMsg.classList.remove('hidden');
        return;
    }
    
    // Validate OTP
    if (!otp || otp.length !== 6) {
        errorMsg.querySelector('span').textContent = 'Please enter the 6-digit OTP sent to your email or phone.';
        errorMsg.classList.remove('hidden');
        return;
    }

    // Validate security answer (always required)
    if (!securityAnswer) {
        errorMsg.querySelector('span').textContent = 'Please answer the security question.';
        errorMsg.classList.remove('hidden');
        return;
    }

    // Validate password strength
    const { strength, requirements } = checkPasswordStrength(newPassword);
    if (strength < 4) {
        errorMsg.querySelector('span').textContent = 'Password does not meet all requirements. Please ensure it has at least 8 characters, uppercase, lowercase, and a number.';
        errorMsg.classList.remove('hidden');
        return;
    }
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
        errorMsg.querySelector('span').textContent = 'Passwords do not match. Please try again.';
        errorMsg.classList.remove('hidden');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.textContent = 'Resetting...';
    btnSpinner.classList.remove('hidden');
    
    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identifier,
                otp,
                securityAnswer,
                newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            successMsg.querySelector('span').textContent = 'Password reset successful! Redirecting to login...';
            successMsg.classList.remove('hidden');
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.replace('/login');
            }, 2000);
        } else {
            errorMsg.querySelector('span').textContent = data.message || 'Password reset failed. Please try again.';
            errorMsg.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        errorMsg.querySelector('span').textContent = 'Network error. Please try again.';
        errorMsg.classList.remove('hidden');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.textContent = 'Reset Password';
        btnSpinner.classList.add('hidden');
    }
});
