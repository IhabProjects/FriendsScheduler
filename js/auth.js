// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Initialize authentication
function initAuth() {
    // Set up event listeners for login and register forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Simple validation
    if (!email || !password) {
        showError(loginForm, 'Please fill in all fields');
        return;
    }

    // Check if user exists
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        // Store current user in localStorage
        localStorage.setItem('user', JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email
        }));

        // Clear form
        loginForm.reset();

        // Update UI
        import('./app.js').then(module => {
            module.updateAuthUI();
        });
    } else {
        showError(loginForm, 'Invalid email or password');
    }
}

// Handle register form submission
function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    // Simple validation
    if (!name || !email || !password || !confirmPassword) {
        showError(registerForm, 'Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showError(registerForm, 'Passwords do not match');
        return;
    }

    // Get existing users or initialize empty array
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Check if user with this email already exists
    if (users.some(user => user.email === email)) {
        showError(registerForm, 'Email already registered');
        return;
    }

    // Create new user
    const newUser = {
        id: generateUserId(),
        name,
        email,
        password
    };

    // Add user to users array
    users.push(newUser);

    // Save to localStorage
    localStorage.setItem('users', JSON.stringify(users));

    // Set current user (auto login after registration)
    localStorage.setItem('user', JSON.stringify({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
    }));

    // Initialize empty schedule for the new user
    localStorage.setItem(`schedule_${newUser.id}`, JSON.stringify([]));

    // Initialize empty friends list
    localStorage.setItem(`friends_${newUser.id}`, JSON.stringify([]));

    // Clear form
    registerForm.reset();

    // Update UI
    import('./app.js').then(module => {
        module.updateAuthUI();
    });
}

// Helper function to show error message
function showError(form, message) {
    // Check if error message element exists, if not create it
    let errorElement = form.querySelector('.error-message');

    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        form.insertBefore(errorElement, form.firstChild);
    }

    errorElement.textContent = message;
    errorElement.classList.add('show');

    // Hide error after 3 seconds
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 3000);
}

// Generate unique user ID
function generateUserId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('user') !== null;
}

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
}

// Export functions
export { initAuth, isAuthenticated, getCurrentUser };
