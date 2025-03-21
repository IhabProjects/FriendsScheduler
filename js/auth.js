// Authentication module for Friends Scheduler
// Updated to use Supabase for authentication

import * as SupabaseClient from './lib/supabase.js';
import { migrateDataToSupabase } from './lib/migration.js';

// Cache DOM elements
let authScreen, loginForm, registerForm, loginUsername, loginPassword,
    registerName, registerEmail, registerUsername, registerPassword, registerConfirmPassword;

// Initialize authentication
function init() {
    console.log('Initializing Auth module...');

    // Get DOM elements
    authScreen = document.getElementById('auth-screen');

    // Login form elements
    loginForm = document.getElementById('login');
    loginUsername = document.getElementById('login-username');
    loginPassword = document.getElementById('login-password');

    // Register form elements
    registerForm = document.getElementById('register');
    registerName = document.getElementById('register-name');
    registerEmail = document.getElementById('register-email');
    registerUsername = document.getElementById('register-username');
    registerPassword = document.getElementById('register-password');
    registerConfirmPassword = document.getElementById('register-confirm-password');

    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabForms = document.querySelectorAll('.auth-form');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show selected tab content
            tabForms.forEach(form => form.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Set up event listeners
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('register-btn').addEventListener('click', handleRegister);

    // Check Supabase session on load
    checkSession();
}

// Check if user is already logged in with Supabase
async function checkSession() {
    try {
        const { data } = await SupabaseClient.getCurrentSession();

        if (data.session) {
            // User is already logged in
            const userData = {
                id: data.session.user.id,
                email: data.session.user.email,
                username: data.session.user.user_metadata.username || 'User',
                fullName: data.session.user.user_metadata.full_name || ''
            };

            // Store user data in localStorage for app use
            storeUserData(userData);

            // Notify the app about successful login
            const event = new CustomEvent('auth:login', { detail: userData });
            document.dispatchEvent(event);
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    // Get form values
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    // Validate input
    if (!username || !password) {
        showError('login', 'Please enter both username and password');
        return;
    }

    try {
        // For login we use email, but some users might enter username
        // Let's try to handle both cases
        let email = username;

        // If username doesn't look like an email, we'll try to find the email
        // from localStorage for backwards compatibility
        if (!isValidEmail(username)) {
            // Try to find user with this username in localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.username === username);

            if (user && user.email) {
                email = user.email;
            } else {
                // For Supabase, we need email, not username
                showError('login', 'Please enter a valid email address');
                return;
            }
        }

        // Show loading state
        toggleLoadingState('login', true);

        // Call Supabase login
        const { data, error } = await SupabaseClient.signIn(email, password);

        // Hide loading state
        toggleLoadingState('login', false);

        if (error) {
            showError('login', error.message || 'Invalid credentials');
            return;
        }

        // Login successful
        console.log('Login successful!', data);

        // Get user metadata
        const userData = {
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata.username || email.split('@')[0],
            fullName: data.user.user_metadata.full_name || ''
        };

        // Store user data in localStorage for app use
        storeUserData(userData);

        // Clear form
        loginForm.reset();

        // Check if we need to migrate data
        const hasLocalData = checkForLocalData();
        if (hasLocalData) {
            // Offer to migrate data
            if (confirm('We found existing data in your browser. Would you like to migrate it to the new database?')) {
                await migrateDataToSupabase();
            }
        }

        // Notify the app about successful login
        const event = new CustomEvent('auth:login', { detail: userData });
        document.dispatchEvent(event);
    } catch (error) {
        toggleLoadingState('login', false);
        showError('login', 'An error occurred. Please try again.');
        console.error('Login error:', error);
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();

    // Get form values
    const fullName = registerName.value.trim();
    const email = registerEmail.value.trim();
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();
    const confirmPassword = registerConfirmPassword.value.trim();

    // Validate input
    if (!fullName || !email || !username || !password || !confirmPassword) {
        showError('register', 'Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showError('register', 'Passwords do not match');
        return;
    }

    if (!isValidEmail(email)) {
        showError('register', 'Please enter a valid email address');
        return;
    }

    try {
        // Show loading state
        toggleLoadingState('register', true);

        // Call Supabase register
        const { data, error } = await SupabaseClient.signUp(email, password, {
            username,
            full_name: fullName
        });

        // Hide loading state
        toggleLoadingState('register', false);

        if (error) {
            showError('register', error.message || 'Registration failed');
            return;
        }

        // Registration successful
        console.log('Registration successful!', data);

        // Store user data in localStorage for app use
        const userData = {
            id: data.user.id,
            email: data.user.email,
            username,
            fullName
        };

        storeUserData(userData);

        // Clear form
        registerForm.reset();

        // Notify the app about successful registration
        const event = new CustomEvent('auth:register', { detail: userData });
        document.dispatchEvent(event);

        // Show success message
        alert('Registration successful! You can now log in.');

        // Switch to login tab
        document.querySelector('.tab-btn[data-tab="login"]').click();
    } catch (error) {
        toggleLoadingState('register', false);
        showError('register', 'An error occurred. Please try again.');
        console.error('Registration error:', error);
    }
}

// Handle logout
async function logout() {
    try {
        // Call Supabase logout
        const { error } = await SupabaseClient.signOut();

        if (error) {
            console.error('Logout error:', error);
            return;
        }

        // Clear user data from localStorage
        localStorage.removeItem('currentUser');

        // Notify the app about logout
        const event = new CustomEvent('auth:logout');
        document.dispatchEvent(event);
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Store user data in localStorage
function storeUserData(userData) {
    localStorage.setItem('currentUser', JSON.stringify(userData));
}

// Check if there is local data to migrate
function checkForLocalData() {
    const userId = JSON.parse(localStorage.getItem('currentUser'))?.id;
    if (!userId) return false;

    // Check for schedule data
    const scheduleKey = `schedule_${userId}`;
    const hasScheduleData = localStorage.getItem(scheduleKey) &&
                           JSON.parse(localStorage.getItem(scheduleKey)).length > 0;

    // Check for friends data
    const friendsKey = `friends_${userId}`;
    const hasFriendsData = localStorage.getItem(friendsKey) &&
                          JSON.parse(localStorage.getItem(friendsKey)).length > 0;

    // Check for notifications
    const notificationsKey = 'friendScheduler_notifications';
    const hasNotifications = localStorage.getItem(notificationsKey) &&
                            JSON.parse(localStorage.getItem(notificationsKey)).length > 0;

    return hasScheduleData || hasFriendsData || hasNotifications;
}

// Helper function to show error message
function showError(formId, message) {
    const form = document.getElementById(formId);
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

// Toggle loading state on buttons
function toggleLoadingState(formId, isLoading) {
    const form = document.getElementById(formId);
    const button = form.querySelector('button[type="submit"]');

    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    } else {
        button.disabled = false;
        button.innerHTML = formId === 'login' ?
            '<i class="fas fa-sign-in-alt"></i> Login' :
            '<i class="fas fa-user-plus"></i> Register';
    }
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('currentUser') !== null;
}

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Export functions
export {
    init,
    isAuthenticated,
    getCurrentUser,
    logout
};
