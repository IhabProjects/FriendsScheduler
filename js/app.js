/**
 * Main application module for the Friends Scheduler
 */
const App = (function() {
    // Cache DOM elements
    const screenElements = {
        auth: document.getElementById('auth-screen'),
        dashboard: document.getElementById('dashboard-screen'),
        schedule: document.getElementById('schedule-screen'),
        friends: document.getElementById('friends-screen'),
        groups: document.getElementById('groups-screen')
    };

    const navLinks = document.querySelectorAll('nav a');
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const logoutButton = document.getElementById('logout-btn');
    const userDisplayName = document.getElementById('user-display-name');

    // State
    let currentUser = null;
    let currentScreen = 'auth';

    // Initialize the application
    function init() {
        console.log('Initializing Friends Scheduler app...');

        // Check if user is logged in
        checkAuthState();

        // Initialize modules
        Auth.init();
        Schedule.init();
        Friends.init();
        Groups.init();
        Notifications.init();

        // Set up event listeners
        setupEventListeners();

        // Add a loading animation to the body while assets are loading
        document.body.classList.add('loading');

        // Remove loading class when window is fully loaded
        window.addEventListener('load', () => {
            setTimeout(() => {
                document.body.classList.remove('loading');
            }, 500);
        });
    }

    // Check if user is already logged in
    function checkAuthState() {
        const user = localStorage.getItem('currentUser');
        if (user) {
            currentUser = JSON.parse(user);
            showUserDashboard();
        } else {
            showAuthScreen();
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Navigation event listeners
        navLinks.forEach(link => {
            link.addEventListener('click', handleNavigation);
        });

        sidebarLinks.forEach(link => {
            link.addEventListener('click', handleNavigation);
        });

        // Logout button
        if (logoutButton) {
            logoutButton.addEventListener('click', handleLogout);
        }

        // Handle ESC key to close any open modals or dropdowns
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-active, .dropdown-active').forEach(el => {
                    el.classList.remove('modal-active', 'dropdown-active');
                });
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-container') && !e.target.matches('.dropdown-toggle')) {
                document.querySelectorAll('.dropdown-active').forEach(dropdown => {
                    dropdown.classList.remove('dropdown-active');
                });
            }
        });
    }

    // Handle navigation
    function handleNavigation(e) {
        e.preventDefault();
        const targetScreen = e.currentTarget.getAttribute('data-screen');

        if (targetScreen && screenElements[targetScreen]) {
            switchScreen(targetScreen);

            // Update active states for navigation
            navLinks.forEach(link => link.classList.remove('active'));
            sidebarLinks.forEach(link => link.classList.remove('active'));

            // Set active class
            document.querySelectorAll(`[data-screen="${targetScreen}"]`).forEach(link => {
                link.classList.add('active');
            });
        }
    }

    // Switch to a different screen
    function switchScreen(screenName) {
        if (currentUser === null && screenName !== 'auth') {
            screenName = 'auth';
        }

        // Hide all screens
        Object.values(screenElements).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });

        // Show requested screen with transition
        if (screenElements[screenName]) {
            screenElements[screenName].classList.add('active');
            currentScreen = screenName;

            // Trigger screen-specific init if needed
            if (screenName === 'schedule') {
                Schedule.refresh();
            } else if (screenName === 'friends') {
                Friends.refresh();
            } else if (screenName === 'groups') {
                Groups.refresh();
            }
        }
    }

    // Show user dashboard
    function showUserDashboard() {
        document.body.classList.add('authenticated');

        // Update user display name
        if (userDisplayName) {
            userDisplayName.textContent = currentUser.fullName || currentUser.username;
        }

        // Switch to dashboard screen
        switchScreen('dashboard');

        // Set dashboard link as active
        navLinks.forEach(link => link.classList.remove('active'));
        sidebarLinks.forEach(link => link.classList.remove('active'));

        document.querySelectorAll('[data-screen="dashboard"]').forEach(link => {
            link.classList.add('active');
        });
    }

    // Show authentication screen
    function showAuthScreen() {
        document.body.classList.remove('authenticated');
        switchScreen('auth');
    }

    // Handle user logout
    function handleLogout() {
        // Show confirmation dialog
        const confirmLogout = confirm('Are you sure you want to log out?');

        if (confirmLogout) {
            currentUser = null;
            localStorage.removeItem('currentUser');
            showAuthScreen();

            // Display logout notification
            Notifications.showToast('You have been logged out successfully', 'info');
        }
    }

    // Get current user
    function getCurrentUser() {
        return currentUser;
    }

    // Set current user
    function setCurrentUser(user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showUserDashboard();
    }

    // Get current screen
    function getCurrentScreen() {
        return currentScreen;
    }

    // Public API
    return {
        init,
        getCurrentUser,
        setCurrentUser,
        getCurrentScreen,
        switchScreen
    };
})();

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', App.init);

// Add a loading indicator to the body
document.body.innerHTML += `
<div class="loading-indicator">
    <div class="spinner"></div>
    <p>Loading Friends Scheduler...</p>
</div>
`;
