import { getCurrentUser } from './auth.js';

// DOM Elements - these will be populated when the schedule view is loaded
let scheduleForm;
let scheduleList;
let contentArea;

// Initialize schedule functionality
function initSchedule() {
    // Create schedule view if it doesn't exist yet
    if (!document.getElementById('schedule-view')) {
        createScheduleView();
    }

    // Get DOM elements after view is created
    scheduleForm = document.getElementById('schedule-form');
    scheduleList = document.getElementById('schedule-list');

    // Add event listeners
    scheduleForm.addEventListener('submit', addEvent);

    // Load events
    loadEvents();
}

// Create schedule view
function createScheduleView() {
    contentArea = document.getElementById('content-area');

    const scheduleView = document.createElement('div');
    scheduleView.id = 'schedule-view';
    scheduleView.className = 'content-view';

    scheduleView.innerHTML = `
        <h2>My Schedule</h2>
        <p>Manage your busy times to help find common free time with friends.</p>

        <div class="form-container">
            <h3>Add Busy Time</h3>
            <form id="schedule-form">
                <div class="form-group">
                    <label for="event-title">Title</label>
                    <input type="text" id="event-title" placeholder="e.g., Class, Work, Study" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="event-date">Date</label>
                        <input type="date" id="event-date" required>
                    </div>
                    <div class="form-group">
                        <label for="event-start-time">Start Time</label>
                        <input type="time" id="event-start-time" required>
                    </div>
                    <div class="form-group">
                        <label for="event-end-time">End Time</label>
                        <input type="time" id="event-end-time" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="event-repeat">Repeat</label>
                    <select id="event-repeat">
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Add Busy Time</button>
            </form>
        </div>

        <div class="schedule-list-container">
            <h3>Your Busy Times</h3>
            <div id="schedule-list" class="event-list"></div>
        </div>
    `;

    contentArea.appendChild(scheduleView);
}

// Add new event to schedule
function addEvent(e) {
    e.preventDefault();

    const title = document.getElementById('event-title').value;
    const dateStr = document.getElementById('event-date').value;
    const startTimeStr = document.getElementById('event-start-time').value;
    const endTimeStr = document.getElementById('event-end-time').value;
    const repeat = document.getElementById('event-repeat').value;

    // Create start date object
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
    const [startHours, startMinutes] = startTimeStr.split(':').map(num => parseInt(num));

    const startDate = new Date(year, month - 1, day, startHours, startMinutes);

    // Create end date object
    const [endHours, endMinutes] = endTimeStr.split(':').map(num => parseInt(num));
    const endDate = new Date(year, month - 1, day, endHours, endMinutes);

    // Validate time range
    if (endDate <= startDate) {
        alert('End time must be after start time');
        return;
    }

    // Get current user and their schedule
    const user = getCurrentUser();
    const schedule = getSchedule(user.id);

    // Create new event object
    const newEvent = {
        id: generateEventId(),
        title,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        repeat
    };

    // Add event to schedule
    schedule.push(newEvent);

    // If event repeats, add recurring instances
    if (repeat !== 'none') {
        const recurrenceLimit = 8; // Limit to 8 recurrences

        for (let i = 1; i <= recurrenceLimit; i++) {
            const recurrenceStart = new Date(startDate);
            const recurrenceEnd = new Date(endDate);

            if (repeat === 'daily') {
                recurrenceStart.setDate(startDate.getDate() + i);
                recurrenceEnd.setDate(endDate.getDate() + i);
            } else if (repeat === 'weekly') {
                recurrenceStart.setDate(startDate.getDate() + (i * 7));
                recurrenceEnd.setDate(endDate.getDate() + (i * 7));
            }

            const recurrenceEvent = {
                id: generateEventId(),
                title,
                start: recurrenceStart.toISOString(),
                end: recurrenceEnd.toISOString(),
                repeat: 'none', // Mark as non-repeating
                parentId: newEvent.id // Reference to the parent event
            };

            schedule.push(recurrenceEvent);
        }
    }

    // Save updated schedule
    localStorage.setItem(`schedule_${user.id}`, JSON.stringify(schedule));

    // Create notification for new event
    if (typeof Notifications !== 'undefined') {
        Notifications.addNotification(
            `New event added: ${title} on ${formatDate(startDate.toLocaleDateString())}`,
            'schedule-update',
            { eventId: newEvent.id }
        );

        // Notify friends about your updated schedule
        notifyFriendsAboutScheduleUpdate(user.id, title);
    }

    // Reset form
    scheduleForm.reset();

    // Reload events
    loadEvents();
}

// Notify friends about a schedule update
function notifyFriendsAboutScheduleUpdate(userId, eventTitle) {
    // This is a simplified version - in a real app, you'd likely use a server
    // to push notifications to friends

    // Get friends who might be interested
    const friends = JSON.parse(localStorage.getItem(`friends_${userId}`) || '[]');
    const confirmedFriends = friends.filter(friend => friend.status === 'confirmed');

    // For demonstration, we'll update their notifications directly
    // In a real app with server, the server would handle this
    confirmedFriends.forEach(friend => {
        const friendUser = getCurrentUser();

        // Create notification data for this user's schedule update
        if (typeof Notifications !== 'undefined' && friend.id !== friendUser.id) {
            // In a real system, this would be pushed to friends via server
            console.log(`Schedule update notification would be sent to ${friend.name}`);
        }
    });
}

// Load events from storage and display them
function loadEvents() {
    const user = getCurrentUser();
    const schedule = getSchedule(user.id);

    // Clear the list
    scheduleList.innerHTML = '';

    // Sort events by start time
    schedule.sort((a, b) => new Date(a.start) - new Date(b.start));

    // Group events by date
    const eventsByDate = groupEventsByDate(schedule);

    // If no events, show message
    if (Object.keys(eventsByDate).length === 0) {
        scheduleList.innerHTML = '<p class="no-events">No busy times added yet.</p>';
        return;
    }

    // Display events grouped by date
    for (const date in eventsByDate) {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.textContent = formatDate(date);
        scheduleList.appendChild(dateHeader);

        eventsByDate[date].forEach(event => {
            const eventItem = createEventItem(event);
            scheduleList.appendChild(eventItem);
        });
    }
}

// Group events by date for display
function groupEventsByDate(events) {
    const groupedEvents = {};

    events.forEach(event => {
        const date = new Date(event.start).toLocaleDateString();

        if (!groupedEvents[date]) {
            groupedEvents[date] = [];
        }

        groupedEvents[date].push(event);
    });

    return groupedEvents;
}

// Create event item element
function createEventItem(event) {
    const eventItem = document.createElement('div');
    eventItem.className = 'event-item';
    eventItem.dataset.id = event.id;

    const startTime = new Date(event.start);
    const endTime = new Date(event.end);

    const timeStr = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    const repeatStr = event.repeat !== 'none' ? ` (${capitalizeFirstLetter(event.repeat)})` : '';

    eventItem.innerHTML = `
        <div class="event-details">
            <div class="event-title">${event.title}</div>
            <div class="event-time">${timeStr}${repeatStr}</div>
        </div>
        <div class="event-actions">
            <button class="btn delete-event" data-id="${event.id}">Delete</button>
        </div>
    `;

    // Add event listener for delete button
    eventItem.querySelector('.delete-event').addEventListener('click', () => {
        deleteEvent(event.id, event.parentId);
    });

    return eventItem;
}

// Delete event
function deleteEvent(eventId, parentId) {
    const user = getCurrentUser();
    let schedule = getSchedule(user.id);

    // Find event before deletion for notification
    const eventToDelete = schedule.find(event => event.id === eventId);
    const eventTitle = eventToDelete ? eventToDelete.title : 'Event';

    if (parentId) {
        // If this is a recurrence, ask if user wants to delete all recurrences
        if (confirm('Delete all occurrences of this event?')) {
            // Delete parent and all recurrences
            schedule = schedule.filter(event => event.id !== parentId && event.parentId !== parentId);
        } else {
            // Delete only this occurrence
            schedule = schedule.filter(event => event.id !== eventId);
        }
    } else {
        // Ask if user wants to delete all recurrences
        const hasRecurrences = schedule.some(event => event.parentId === eventId);

        if (hasRecurrences && confirm('Delete all occurrences of this event?')) {
            // Delete this event and all recurrences
            schedule = schedule.filter(event => event.id !== eventId && event.parentId !== eventId);
        } else {
            // Delete only this event
            schedule = schedule.filter(event => event.id !== eventId);
        }
    }

    // Save updated schedule
    localStorage.setItem(`schedule_${user.id}`, JSON.stringify(schedule));

    // Notification for event deletion
    if (typeof Notifications !== 'undefined') {
        Notifications.addNotification(
            `Event "${eventTitle}" has been deleted from your schedule`,
            'schedule-update'
        );
    }

    // Reload events
    loadEvents();
}

// Show a specific event (called from notifications)
function showEvent(eventId) {
    // First switch to the schedule tab
    const scheduleTab = document.querySelector('.sidebar-menu a[href="#schedule"]');
    if (scheduleTab) {
        scheduleTab.click();
    }

    // Wait for DOM to update
    setTimeout(() => {
        // If a specific event ID is provided, scroll to that event
        if (eventId) {
            const eventItem = document.querySelector(`.event-item[data-id="${eventId}"]`);
            if (eventItem) {
                eventItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                eventItem.classList.add('highlight');

                // Remove highlight after animation
                setTimeout(() => {
                    eventItem.classList.remove('highlight');
                }, 2000);
            }
        }
    }, 100);
}

// Get schedule for a user
function getSchedule(userId) {
    return JSON.parse(localStorage.getItem(`schedule_${userId}`) || '[]');
}

// Format time (HH:MM AM/PM)
function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be displayed as 12

    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Format date (Friday, May 5, 2023)
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Capitalize first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Generate unique event ID
function generateEventId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Export functions
export { initSchedule, getSchedule, showEvent };
