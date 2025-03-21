/**
 * Dashboard module for the Friends Scheduler application
 * This module handles the dashboard view with statistics and quick access features
 */
const Dashboard = (function() {
    // DOM elements
    const dashboardEl = document.getElementById('dashboard-screen');
    const statsContainer = document.querySelector('.dashboard-stats');
    const upcomingEventsContainer = document.querySelector('.upcoming-events');
    const pendingRequestsContainer = document.querySelector('.pending-requests');

    // Initialize the dashboard
    function init() {
        console.log('Initializing dashboard module...');
        setupEventListeners();
    }

    // Refresh the dashboard with current data
    function refresh() {
        renderStats();
        renderUpcomingEvents();
        renderPendingRequests();
    }

    // Set up event listeners
    function setupEventListeners() {
        // Event delegation for dashboard interactions
        if (dashboardEl) {
            dashboardEl.addEventListener('click', handleDashboardClick);
        }
    }

    // Handle dashboard interactions
    function handleDashboardClick(e) {
        // Handle "View All" links
        if (e.target.matches('.view-all-link')) {
            e.preventDefault();
            const targetScreen = e.target.getAttribute('data-target');
            if (targetScreen) {
                App.switchScreen(targetScreen);
            }
        }

        // Handle event clicks
        if (e.target.closest('.event-item')) {
            const eventItem = e.target.closest('.event-item');
            const eventId = eventItem.getAttribute('data-id');
            if (eventId) {
                App.switchScreen('schedule');
                // Highlight the selected event after a short delay
                setTimeout(() => {
                    const eventElement = document.querySelector(`.event-item[data-id="${eventId}"]`);
                    if (eventElement) {
                        eventElement.classList.add('highlight-pulse');
                        eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                            eventElement.classList.remove('highlight-pulse');
                        }, 2000);
                    }
                }, 300);
            }
        }

        // Handle friend request actions
        if (e.target.matches('.accept-request-btn, .decline-request-btn')) {
            const requestItem = e.target.closest('.friend-request-item');
            const userId = requestItem?.getAttribute('data-userid');

            if (userId) {
                if (e.target.matches('.accept-request-btn')) {
                    Friends.acceptRequest(userId);
                } else {
                    Friends.declineRequest(userId);
                }

                // Remove the request item with animation
                requestItem.classList.add('fade-out');
                setTimeout(() => {
                    requestItem.remove();
                    // Check if we need to show the empty message
                    if (pendingRequestsContainer && !pendingRequestsContainer.querySelector('.friend-request-item')) {
                        pendingRequestsContainer.innerHTML = '<p class="empty-message">No pending friend requests.</p>';
                    }
                }, 300);
            }
        }
    }

    // Render dashboard statistics
    function renderStats() {
        if (!statsContainer) return;

        // Get statistics data
        const user = App.getCurrentUser();
        if (!user) return;

        // Get friend count
        const friends = JSON.parse(localStorage.getItem('friends') || '[]');

        // Get upcoming events count
        const allEvents = Schedule.getAllEvents();
        const today = new Date();
        const oneWeekLater = new Date(today);
        oneWeekLater.setDate(today.getDate() + 7);

        const upcomingEvents = allEvents.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today && eventDate <= oneWeekLater;
        });

        // Get groups count
        const groups = JSON.parse(localStorage.getItem('groups') || '[]');

        // Render the statistics cards
        statsContainer.innerHTML = `
            <div class="stat-card fade-in">
                <i class="fas fa-calendar-check stat-icon"></i>
                <div class="stat-value">${upcomingEvents.length}</div>
                <div class="stat-label">Upcoming Events</div>
            </div>
            <div class="stat-card fade-in" style="animation-delay: 0.1s;">
                <i class="fas fa-user-friends stat-icon"></i>
                <div class="stat-value">${friends.length}</div>
                <div class="stat-label">Friends</div>
            </div>
            <div class="stat-card fade-in" style="animation-delay: 0.2s;">
                <i class="fas fa-users stat-icon"></i>
                <div class="stat-value">${groups.length}</div>
                <div class="stat-label">Groups</div>
            </div>
            <div class="stat-card fade-in" style="animation-delay: 0.3s;">
                <i class="fas fa-clock stat-icon"></i>
                <div class="stat-value">${user.availableHours || 0}</div>
                <div class="stat-label">Available Hours</div>
            </div>
        `;
    }

    // Render upcoming events
    function renderUpcomingEvents() {
        if (!upcomingEventsContainer) return;

        // Get upcoming events
        const allEvents = Schedule.getAllEvents();
        const today = new Date();
        const oneWeekLater = new Date(today);
        oneWeekLater.setDate(today.getDate() + 7);

        const upcomingEvents = allEvents.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today && eventDate <= oneWeekLater;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Show at most 5 upcoming events
        const displayEvents = upcomingEvents.slice(0, 5);

        if (displayEvents.length === 0) {
            upcomingEventsContainer.innerHTML = '<p class="empty-message">No upcoming events for the next week.</p>';
            return;
        }

        // Group events by date
        const groupedEvents = {};
        displayEvents.forEach(event => {
            const dateKey = new Date(event.date).toDateString();
            if (!groupedEvents[dateKey]) {
                groupedEvents[dateKey] = [];
            }
            groupedEvents[dateKey].push(event);
        });

        // Render events grouped by date
        let html = '';
        Object.keys(groupedEvents).forEach(dateKey => {
            const events = groupedEvents[dateKey];
            const date = new Date(dateKey);
            const formattedDate = formatDate(date);

            html += `<h3 class="date-header">${formattedDate}</h3>`;

            events.forEach(event => {
                const startTime = formatTime(new Date(`${event.date}T${event.startTime}`));
                const endTime = formatTime(new Date(`${event.date}T${event.endTime}`));

                html += `
                    <div class="event-item slide-in-right" data-id="${event.id}">
                        <div class="event-details">
                            <h4 class="event-title">${event.title}</h4>
                            <p class="event-time">${startTime} - ${endTime}</p>
                        </div>
                        <div class="event-type ${event.type}">${event.type}</div>
                    </div>
                `;
            });
        });

        html += `
            <div class="view-all">
                <a href="#" class="view-all-link" data-target="schedule">View All Events</a>
            </div>
        `;

        upcomingEventsContainer.innerHTML = html;
    }

    // Render pending friend requests
    function renderPendingRequests() {
        if (!pendingRequestsContainer) return;

        // Get pending friend requests
        const pendingRequests = Friends.getPendingRequests();

        if (pendingRequests.length === 0) {
            pendingRequestsContainer.innerHTML = '<p class="empty-message">No pending friend requests.</p>';
            return;
        }

        // Render pending requests
        let html = '';
        pendingRequests.forEach(request => {
            html += `
                <div class="friend-request-item slide-in-right" data-userid="${request.id}">
                    <div class="friend-avatar">${request.username.charAt(0).toUpperCase()}</div>
                    <div class="friend-info">
                        <h4>${request.fullName || request.username}</h4>
                        <p>Wants to connect with you</p>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-sm btn-primary accept-request-btn">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button class="btn btn-sm btn-outline decline-request-btn">
                            <i class="fas fa-times"></i> Decline
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="view-all">
                <a href="#" class="view-all-link" data-target="friends">Manage Friends</a>
            </div>
        `;

        pendingRequestsContainer.innerHTML = html;
    }

    // Format date to "Day, Month Date" (e.g., "Monday, June 15")
    function formatDate(date) {
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    // Format time to "HH:MM AM/PM"
    function formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // Public API
    return {
        init,
        refresh
    };
})();
