import { getCurrentUser } from './auth.js';
import { getSchedule } from './schedule.js';
import { getFriends } from './friends.js';
import { getGroups, getGroupMembers } from './groups.js';

// DOM Elements
const calendarContainer = document.querySelector('.calendar-container');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const currentWeekDisplay = document.getElementById('current-week-display');

// State variables
let currentWeek = getCurrentWeek();
let activeGroupId = null;

// Initialize calendar
function initCalendar() {
    // Add event listeners to week navigation buttons
    prevWeekBtn.addEventListener('click', () => {
        navigateWeek(-1);
    });

    nextWeekBtn.addEventListener('click', () => {
        navigateWeek(1);
    });

    // Render calendar
    renderCalendar();
}

// Get current week (Sunday to Saturday)
function getCurrentWeek() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate the date of Sunday (start of week)
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - day);

    return startDate;
}

// Navigate to previous or next week
function navigateWeek(direction) {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction * 7));
    currentWeek = newDate;

    renderCalendar();
}

// Render calendar with schedule data
function renderCalendar() {
    // Update week display
    updateWeekDisplay();

    // Get user schedule
    const currentUser = getCurrentUser();
    const userSchedule = getSchedule(currentUser.id);

    // Get schedules to compare with (based on active group or friends)
    let compareSchedules = [];

    if (activeGroupId) {
        // Get group members' schedules
        const members = getGroupMembers(activeGroupId);
        compareSchedules = members.map(member => getSchedule(member.id));
    } else {
        // Get friends' schedules
        const friends = getFriends();
        const confirmedFriends = friends.filter(friend => friend.status === 'confirmed');
        compareSchedules = confirmedFriends.map(friend => getSchedule(friend.id));
    }

    // Clear calendar container
    calendarContainer.innerHTML = '';

    // Create calendar grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';

    // Add calendar header (days of the week)
    const header = createCalendarHeader();
    calendarGrid.appendChild(header);

    // Add time slots and cells
    createTimeSlots(calendarGrid, userSchedule, compareSchedules);

    // Add legend
    const legend = createCalendarLegend();

    // Add to calendar container
    calendarContainer.appendChild(calendarGrid);
    calendarContainer.appendChild(legend);
}

// Create calendar header with days of the week
function createCalendarHeader() {
    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-header';

    // Empty cell for the time column
    const emptyCell = document.createElement('div');
    emptyCell.className = 'header-cell';
    headerRow.appendChild(emptyCell);

    // Days of the week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // For each day, create header cell with date
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeek);
        date.setDate(currentWeek.getDate() + i);

        const headerCell = document.createElement('div');
        headerCell.className = 'header-cell';

        // Format as "Mon 5/15"
        const day = daysOfWeek[i].substring(0, 3);
        const month = date.getMonth() + 1;
        const dayOfMonth = date.getDate();

        headerCell.textContent = `${day} ${month}/${dayOfMonth}`;
        headerRow.appendChild(headerCell);
    }

    return headerRow;
}

// Create time slots for the calendar
function createTimeSlots(calendarGrid, userSchedule, compareSchedules) {
    // Hours from 8 AM to 10 PM
    const startHour = 8;
    const endHour = 22;

    for (let hour = startHour; hour <= endHour; hour++) {
        // Create time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = formatHour(hour);
        calendarGrid.appendChild(timeLabel);

        // Create cells for each day of the week
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';

            // Check if this time slot is busy in user's schedule
            const date = new Date(currentWeek);
            date.setDate(currentWeek.getDate() + day);
            date.setHours(hour, 0, 0, 0);

            const timestamp = date.getTime();
            const userBusy = isTimeSlotBusy(userSchedule, timestamp);

            // Check if this time slot is common free time among all schedules
            const isCommonFree = !userBusy && compareSchedules.every(schedule =>
                !isTimeSlotBusy(schedule, timestamp)
            );

            // Set appropriate class based on schedule status
            if (userBusy) {
                cell.classList.add('busy');
            } else if (isCommonFree && compareSchedules.length > 0) {
                cell.classList.add('common-free');
            } else {
                cell.classList.add('available');
            }

            // Add click handler for available cells
            if (!userBusy) {
                cell.addEventListener('click', () => toggleTimeSlot(date, cell));
            }

            calendarGrid.appendChild(cell);
        }
    }
}

// Check if a time slot is busy in a schedule
function isTimeSlotBusy(schedule, timestamp) {
    return schedule.some(event => {
        const eventStart = new Date(event.start).getTime();
        const eventEnd = new Date(event.end).getTime();
        return timestamp >= eventStart && timestamp < eventEnd;
    });
}

// Toggle time slot status (available/busy)
function toggleTimeSlot(date, cell) {
    const user = getCurrentUser();
    const userSchedule = getSchedule(user.id);

    const timestamp = date.getTime();
    const hour = date.getHours();

    // Check if this time slot is already part of an event
    const existingEventIndex = userSchedule.findIndex(event => {
        const eventStart = new Date(event.start).getTime();
        const eventEnd = new Date(event.end).getTime();
        return timestamp >= eventStart && timestamp < eventEnd;
    });

    if (existingEventIndex !== -1) {
        // Remove existing event
        userSchedule.splice(existingEventIndex, 1);
        cell.classList.remove('busy');
        cell.classList.add('available');
    } else {
        // Create new event
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setHours(hour + 1); // 1 hour duration

        const newEvent = {
            id: generateEventId(),
            title: 'Busy',
            start: startDate.toISOString(),
            end: endDate.toISOString()
        };

        userSchedule.push(newEvent);
        cell.classList.remove('available');
        cell.classList.add('busy');
    }

    // Save updated schedule
    localStorage.setItem(`schedule_${user.id}`, JSON.stringify(userSchedule));

    // Re-render calendar to update common free times
    renderCalendar();
}

// Create calendar legend
function createCalendarLegend() {
    const legend = document.createElement('div');
    legend.className = 'calendar-legend';

    // Available legend item
    const availableLegend = document.createElement('div');
    availableLegend.className = 'legend-item legend-available';
    availableLegend.innerHTML = '<div class="legend-color"></div> Available';

    // Busy legend item
    const busyLegend = document.createElement('div');
    busyLegend.className = 'legend-item legend-busy';
    busyLegend.innerHTML = '<div class="legend-color"></div> Busy';

    // Common free legend item
    const commonFreeLegend = document.createElement('div');
    commonFreeLegend.className = 'legend-item legend-common-free';
    commonFreeLegend.innerHTML = '<div class="legend-color"></div> Common Free Time';

    legend.appendChild(availableLegend);
    legend.appendChild(busyLegend);
    legend.appendChild(commonFreeLegend);

    return legend;
}

// Update week display
function updateWeekDisplay() {
    const startDate = new Date(currentWeek);
    const endDate = new Date(currentWeek);
    endDate.setDate(startDate.getDate() + 6);

    const startMonth = startDate.toLocaleString('default', { month: 'short' });
    const endMonth = endDate.toLocaleString('default', { month: 'short' });

    const startDay = startDate.getDate();
    const endDay = endDate.getDate();

    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    let displayText = '';

    if (startYear === endYear) {
        if (startMonth === endMonth) {
            displayText = `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
        } else {
            displayText = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
        }
    } else {
        displayText = `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    }

    currentWeekDisplay.textContent = displayText;
}

// Format hour to AM/PM
function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

// Generate unique event ID
function generateEventId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Set active group for calendar view
function setActiveGroup(groupId) {
    activeGroupId = groupId;
    renderCalendar();
}

// Clear active group
function clearActiveGroup() {
    activeGroupId = null;
    renderCalendar();
}

// Export functions
export { initCalendar, setActiveGroup, clearActiveGroup };
