/**
 * Notifications.js
 * Manages notifications for the Friends Scheduler application
 * Includes friend requests, schedule updates, and activity reminders
 */

const Notifications = (function() {
    // DOM elements
    let notificationContainer;
    let notificationCounter;
    let notificationList;
    let notificationToggle;

    // Store active notifications
    let notifications = [];

    // Initialize the notifications module
    function initialize() {
        // Create notification elements if they don't exist
        createNotificationElements();

        // Add event listeners
        setupEventListeners();

        // Load existing notifications from storage
        loadNotifications();

        console.log('Notifications module initialized');
    }

    // Create notification UI elements
    function createNotificationElements() {
        // Check if notification container already exists
        if (document.querySelector('.notification-container')) {
            notificationContainer = document.querySelector('.notification-container');
            notificationCounter = document.querySelector('.notification-counter');
            notificationList = document.querySelector('.notification-list');
            notificationToggle = document.querySelector('.notification-toggle');
            return;
        }

        // Create notification container
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';

        // Create notification toggle button
        notificationToggle = document.createElement('button');
        notificationToggle.className = 'notification-toggle';
        notificationToggle.innerHTML = '<i class="fas fa-bell"></i>';

        // Create notification counter
        notificationCounter = document.createElement('span');
        notificationCounter.className = 'notification-counter';
        notificationCounter.textContent = '0';

        // Create notification list
        notificationList = document.createElement('div');
        notificationList.className = 'notification-list hidden';

        // Append elements
        notificationToggle.appendChild(notificationCounter);
        notificationContainer.appendChild(notificationToggle);
        notificationContainer.appendChild(notificationList);

        // Add to page
        const header = document.querySelector('header');
        if (header) {
            header.appendChild(notificationContainer);
        } else {
            document.body.insertBefore(notificationContainer, document.body.firstChild);
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Toggle notification list visibility
        notificationToggle.addEventListener('click', function() {
            notificationList.classList.toggle('hidden');

            // Mark as read when opened
            if (!notificationList.classList.contains('hidden')) {
                markAllAsRead();
            }
        });

        // Close notification list when clicking outside
        document.addEventListener('click', function(event) {
            if (!notificationContainer.contains(event.target)) {
                notificationList.classList.add('hidden');
            }
        });
    }

    // Load notifications from local storage
    function loadNotifications() {
        const storedNotifications = localStorage.getItem('friendScheduler_notifications');
        if (storedNotifications) {
            notifications = JSON.parse(storedNotifications);

            // Filter out expired notifications (older than 7 days)
            const currentTime = new Date().getTime();
            const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000;

            notifications = notifications.filter(notification => {
                return currentTime - notification.timestamp < weekInMilliseconds;
            });

            // Update UI
            updateNotificationUI();
        }
    }

    // Save notifications to local storage
    function saveNotifications() {
        localStorage.setItem('friendScheduler_notifications', JSON.stringify(notifications));
    }

    // Add a new notification
    function addNotification(message, type, actionData = null) {
        const notification = {
            id: generateId(),
            message: message,
            type: type, // 'friend-request', 'schedule-update', 'reminder', etc.
            read: false,
            timestamp: new Date().getTime(),
            actionData: actionData
        };

        // Add to notifications array
        notifications.unshift(notification);

        // Save to storage
        saveNotifications();

        // Update UI
        updateNotificationUI();

        // Show notification alert
        showNotificationAlert(notification);

        return notification.id;
    }

    // Remove a notification by ID
    function removeNotification(id) {
        notifications = notifications.filter(notification => notification.id !== id);

        // Save updated notifications
        saveNotifications();

        // Update UI
        updateNotificationUI();
    }

    // Mark notification as read
    function markAsRead(id) {
        const notification = notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;

            // Save updated state
            saveNotifications();

            // Update UI
            updateNotificationUI();
        }
    }

    // Mark all notifications as read
    function markAllAsRead() {
        notifications.forEach(notification => {
            notification.read = true;
        });

        // Save updated state
        saveNotifications();

        // Update UI
        updateNotificationUI();
    }

    // Update notification UI
    function updateNotificationUI() {
        // Update notification counter
        const unreadCount = notifications.filter(n => !n.read).length;
        notificationCounter.textContent = unreadCount;

        // Show/hide counter based on unread notifications
        if (unreadCount > 0) {
            notificationCounter.classList.remove('hidden');
            notificationToggle.classList.add('has-notifications');
        } else {
            notificationCounter.classList.add('hidden');
            notificationToggle.classList.remove('has-notifications');
        }

        // Update notification list
        notificationList.innerHTML = '';

        if (notifications.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-notification';
            emptyMessage.textContent = 'No notifications';
            notificationList.appendChild(emptyMessage);
        } else {
            // Create a notification item for each notification
            notifications.forEach(notification => {
                const notificationItem = createNotificationItem(notification);
                notificationList.appendChild(notificationItem);
            });
        }
    }

    // Create a notification item
    function createNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = 'notification-item';
        if (notification.read) {
            item.classList.add('read');
        } else {
            item.classList.add('unread');
        }

        // Add icon based on notification type
        const iconClass = getNotificationIcon(notification.type);

        // Format timestamp
        const formattedTime = formatTimestamp(notification.timestamp);

        // Create notification content
        item.innerHTML = `
            <div class="notification-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="notification-content">
                <p>${notification.message}</p>
                <span class="notification-time">${formattedTime}</span>
            </div>
            <div class="notification-actions">
                <button class="mark-read" title="Mark as read">
                    <i class="fas fa-check"></i>
                </button>
                <button class="delete-notification" title="Delete">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add event listeners for buttons
        const deleteButton = item.querySelector('.delete-notification');
        deleteButton.addEventListener('click', function(e) {
            e.stopPropagation();
            removeNotification(notification.id);
        });

        const markReadButton = item.querySelector('.mark-read');
        markReadButton.addEventListener('click', function(e) {
            e.stopPropagation();
            markAsRead(notification.id);
        });

        // Add click handler for the entire notification (for handling actions)
        item.addEventListener('click', function() {
            // Mark notification as read when clicked
            markAsRead(notification.id);

            // Handle notification action if available
            if (notification.actionData) {
                handleNotificationAction(notification);
            }
        });

        return item;
    }

    // Handle notification action
    function handleNotificationAction(notification) {
        switch (notification.type) {
            case 'friend-request':
                if (typeof Friends !== 'undefined' && notification.actionData.userId) {
                    // Switch to friends tab and scroll to request
                    Friends.showFriendRequests(notification.actionData.userId);
                }
                break;

            case 'schedule-update':
                if (typeof Schedule !== 'undefined' && notification.actionData.eventId) {
                    // Navigate to schedule view and highlight event
                    Schedule.showEvent(notification.actionData.eventId);
                }
                break;

            case 'reminder':
                if (typeof Calendar !== 'undefined' && notification.actionData.date) {
                    // Open calendar and show the appropriate date
                    Calendar.navigateToDate(notification.actionData.date);
                }
                break;

            default:
                console.log('No action for this notification type');
        }
    }

    // Show temporary notification alert
    function showNotificationAlert(notification) {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = 'notification-alert';

        // Add icon based on notification type
        const iconClass = getNotificationIcon(notification.type);

        // Set alert content
        alert.innerHTML = `
            <div class="alert-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="alert-content">
                <p>${notification.message}</p>
            </div>
            <button class="alert-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to document
        document.body.appendChild(alert);

        // Add click handler for close button
        const closeButton = alert.querySelector('.alert-close');
        closeButton.addEventListener('click', function() {
            document.body.removeChild(alert);
        });

        // Automatically remove after 5 seconds
        setTimeout(function() {
            if (document.body.contains(alert)) {
                document.body.removeChild(alert);
            }
        }, 5000);
    }

    // Get icon based on notification type
    function getNotificationIcon(type) {
        switch (type) {
            case 'friend-request':
                return 'fas fa-user-plus';
            case 'schedule-update':
                return 'fas fa-calendar-alt';
            case 'reminder':
                return 'fas fa-clock';
            case 'group':
                return 'fas fa-users';
            default:
                return 'fas fa-bell';
        }
    }

    // Format timestamp to relative time
    function formatTimestamp(timestamp) {
        const now = new Date().getTime();
        const diff = now - timestamp;

        // Convert to seconds
        const seconds = Math.floor(diff / 1000);

        if (seconds < 60) {
            return 'Just now';
        }

        // Convert to minutes
        const minutes = Math.floor(seconds / 60);

        if (minutes < 60) {
            return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
        }

        // Convert to hours
        const hours = Math.floor(minutes / 60);

        if (hours < 24) {
            return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
        }

        // Convert to days
        const days = Math.floor(hours / 24);

        if (days < 7) {
            return `${days} ${days === 1 ? 'day' : 'days'} ago`;
        }

        // Use actual date for older notifications
        const date = new Date(timestamp);
        return `${date.toLocaleDateString()}`;
    }

    // Generate a unique ID for notifications
    function generateId() {
        return 'notification_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Public API
    return {
        initialize,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead
    };
})();

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    Notifications.initialize();
});
