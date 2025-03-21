// Import modules
import { initAuth, isAuthenticated, getCurrentUser } from './auth.js';
import { initCalendar } from './calendar.js';
import { initFriends } from './friends.js';
import { initGroups } from './groups.js';
import { initSchedule } from './schedule.js';

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const mainNav = document.getElementById('main-nav');
const userInitial = document.getElementById('user-initial');
const userName = document.getElementById('user-name');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modules
    initAuth();

    // Check authentication status and set up the UI accordingly
    updateAuthUI();

    // Set up navigation
    setupNavigation();
});

// Function to update UI based on authentication status
function updateAuthUI() {
    if (isAuthenticated()) {
        // Hide auth section and show dashboard
        authSection.classList.remove('active');
        dashboardSection.classList.add('active');

        // Update user profile in sidebar
        const user = getCurrentUser();
        userInitial.textContent = user.name.charAt(0);
        userName.textContent = user.name;

        // Initialize other modules that require authentication
        initCalendar();
        initFriends();
        initGroups();
        initSchedule();

        // Initialize notifications after authentication (make sure it's available)
        if (typeof Notifications !== 'undefined') {
            // Add a welcome back notification
            Notifications.addNotification(
                `Welcome back, ${user.name}!`,
                'general'
            );

            // Example: Add a simulated friend request notification after 5 seconds
            setTimeout(() => {
                if (isAuthenticated()) {
                    Notifications.addNotification(
                        'You have a new friend request from Jane Smith',
                        'friend-request',
                        { userId: 'jane123' }
                    );
                }
            }, 5000);
        }

        // Update navigation
        updateNavigation();
    } else {
        // Hide dashboard and show auth section
        dashboardSection.classList.remove('active');
        authSection.classList.add('active');

        // Clear main navigation
        mainNav.innerHTML = '';
    }
}

// Set up navigation
function setupNavigation() {
    // Sidebar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href').substring(1); // Remove the #

            // Remove active class from all links
            sidebarLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            link.classList.add('active');

            // Hide all content views
            document.querySelectorAll('.content-view').forEach(view => {
                view.classList.remove('active');
            });

            // Show the targeted content view
            const targetView = document.getElementById(`${target}-view`);
            if (targetView) {
                targetView.classList.add('active');
            }
        });
    });

    // Auth tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');

            // Remove active class from all buttons and forms
            tabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.remove('active');
            });

            // Add active class to clicked button and target form
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });
}

// Update main navigation based on auth status
function updateNavigation() {
    if (isAuthenticated()) {
        mainNav.innerHTML = `
            <a href="#" class="logout-btn">Logout</a>
        `;

        // Add logout functionality
        document.querySelector('.logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Logout function
function logout() {
    // Add a notification about logging out if Notifications module is loaded
    if (typeof Notifications !== 'undefined') {
        // This notification will show briefly before logout completes
        Notifications.addNotification(
            'You have been logged out successfully',
            'general'
        );
    }

    // Clear user data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('friends');
    localStorage.removeItem('groups');
    localStorage.removeItem('schedule');
    localStorage.removeItem('friendScheduler_notifications');

    // Update UI
    updateAuthUI();
}

// Function to create a test notification (for demonstration)
function createTestNotification(type) {
    if (typeof Notifications === 'undefined') return;

    let message, actionData;

    switch(type) {
        case 'friend-request':
            message = 'New friend request from John Doe';
            actionData = { userId: 'user123' };
            break;
        case 'schedule-update':
            message = 'Alex updated their schedule for next week';
            actionData = { eventId: 'event789' };
            break;
        case 'reminder':
            message = 'Reminder: Study group tomorrow at 3 PM';
            actionData = { date: new Date(Date.now() + 86400000).toISOString() };
            break;
        case 'group':
            message = 'You were added to "Computer Science Study Group"';
            actionData = { groupId: 'group456' };
            break;
        default:
            message = 'New notification';
            actionData = null;
    }

    return Notifications.addNotification(message, type, actionData);
}

// Export functions for use in other modules
export { updateAuthUI, createTestNotification };
