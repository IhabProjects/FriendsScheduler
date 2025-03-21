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

    // Setup event listeners
    function setupEventListeners() {
        // Navigation
        sidebarLinks.forEach(link => {
            link.addEventListener('click', handleNavigation);
        });

        // Quick links in dashboard
        document.querySelectorAll('.quick-link-btn').forEach(btn => {
            btn.addEventListener('click', handleQuickLink);
        });

        // Logout button
        logoutButton.addEventListener('click', handleLogout);

        // Listen for auth events
        document.addEventListener('auth:login', handleLogin);
        document.addEventListener('auth:register', handleRegister);
        document.addEventListener('auth:logout', handleLogout);
    }

    // Handle navigation
    function handleNavigation(e) {
        e.preventDefault();

        const targetScreen = e.currentTarget.getAttribute('data-screen');
        if (targetScreen) {
            showScreen(targetScreen);

            // Update active link
            sidebarLinks.forEach(link => link.classList.remove('active'));
            e.currentTarget.classList.add('active');
        }
    }

    // Handle quick link clicks in dashboard
    function handleQuickLink(e) {
        const targetScreen = e.currentTarget.getAttribute('data-screen');
        if (targetScreen) {
            showScreen(targetScreen);

            // Update active link in sidebar
            sidebarLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-screen') === targetScreen) {
                    link.classList.add('active');
                }
            });
        }
    }

    // Handle successful login
    function handleLogin(e) {
        const userData = e.detail;
        currentUser = userData;
        showUserDashboard();
        showScreen('dashboard');
    }

    // Handle successful registration
    function handleRegister(e) {
        console.log('User registered:', e.detail);
        // Registration already handles UI updates through auth:login event
    }

    // Handle logout
    function handleLogout() {
        Auth.logout().then(() => {
            currentUser = null;
            showAuthScreen();
        });
    }

    // Show auth screen
    function showAuthScreen() {
        // Hide app container
        document.getElementById('app-container').style.display = 'none';

        // Show auth screen
        screenElements.auth.classList.add('active');

        // Update current screen
        currentScreen = 'auth';

        // Hide header and footer
        document.querySelector('header').style.display = 'none';
        document.querySelector('footer').style.display = 'none';
    }

    // Show user dashboard
    function showUserDashboard() {
        // Update user display
        if (userDisplayName && currentUser) {
            userDisplayName.textContent = currentUser.username || currentUser.email;
        }

        // Show app container
        document.getElementById('app-container').style.display = 'flex';

        // Hide auth screen
        screenElements.auth.classList.remove('active');

        // Show header and footer
        document.querySelector('header').style.display = 'flex';
        document.querySelector('footer').style.display = 'block';

        // Load dashboard data
        Dashboard.loadData();
    }

    // Show a specific screen
    function showScreen(screenName) {
        // Hide all screens
        Object.values(screenElements).forEach(screen => {
            screen.classList.remove('active');
        });

        // Show the target screen
        if (screenElements[screenName]) {
            screenElements[screenName].classList.add('active');
            currentScreen = screenName;

            // Trigger screen-specific actions
            switch (screenName) {
                case 'dashboard':
                    Dashboard.loadData();
                    break;
                case 'schedule':
                    Schedule.refreshView();
                    break;
                case 'friends':
                    Friends.refreshView();
                    break;
                case 'groups':
                    Groups.refreshView();
                    break;
            }
        }
    }

    // Public API
    return {
        init,
        showScreen,
        getCurrentUser: () => currentUser
    };
})();

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);

// Add a loading indicator to the body
document.body.innerHTML += `
<div class="loading-indicator">
    <div class="spinner"></div>
    <p>Loading Friends Scheduler...</p>
</div>
`;
