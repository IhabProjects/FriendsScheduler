import { getCurrentUser } from './auth.js';
import { getFriends } from './friends.js';
import { setActiveGroup, clearActiveGroup } from './calendar.js';

// DOM Elements - these will be populated when the groups view is loaded
let groupsList;
let createGroupForm;
let contentArea;

// Initialize groups functionality
function initGroups() {
    // Create groups view if it doesn't exist yet
    if (!document.getElementById('groups-view')) {
        createGroupsView();
    }

    // Get DOM elements after view is created
    groupsList = document.getElementById('groups-list');
    createGroupForm = document.getElementById('create-group-form');

    // Add event listeners
    createGroupForm.addEventListener('submit', createGroup);

    // Load groups
    loadGroups();
}

// Create groups view
function createGroupsView() {
    contentArea = document.getElementById('content-area');

    const groupsView = document.createElement('div');
    groupsView.id = 'groups-view';
    groupsView.className = 'content-view';

    groupsView.innerHTML = `
        <h2>Groups</h2>
        <p>Create groups of friends to find common free time for activities.</p>

        <div class="form-container">
            <h3>Create New Group</h3>
            <form id="create-group-form">
                <div class="form-group">
                    <label for="group-name">Group Name</label>
                    <input type="text" id="group-name" placeholder="e.g., Study Group, Sports Team" required>
                </div>
                <div class="form-group">
                    <label>Select Friends</label>
                    <div id="friend-selection" class="friend-selection"></div>
                </div>
                <button type="submit" class="btn btn-primary">Create Group</button>
            </form>
        </div>

        <div class="groups-container">
            <h3>Your Groups</h3>
            <div id="groups-list" class="groups-list"></div>
        </div>
    `;

    contentArea.appendChild(groupsView);

    // Load friend selection checkboxes
    loadFriendSelection();
}

// Load friend selection checkboxes
function loadFriendSelection() {
    const friendSelection = document.getElementById('friend-selection');
    const friends = getFriends();

    // Filter confirmed friends
    const confirmedFriends = friends.filter(friend => friend.status === 'confirmed');

    // If no friends, show message
    if (confirmedFriends.length === 0) {
        friendSelection.innerHTML = '<p class="no-friends">No friends to add. Add friends first.</p>';
        return;
    }

    // Create checkboxes for each friend
    confirmedFriends.forEach(friend => {
        const friendOption = document.createElement('div');
        friendOption.className = 'friend-option';

        friendOption.innerHTML = `
            <label class="checkbox-label">
                <input type="checkbox" name="friend" value="${friend.id}">
                <span class="friend-name">${friend.name}</span>
            </label>
        `;

        friendSelection.appendChild(friendOption);
    });
}

// Load groups
function loadGroups() {
    const groups = getGroups();

    // Clear the list
    groupsList.innerHTML = '';

    // If no groups, show message
    if (groups.length === 0) {
        groupsList.innerHTML = '<p class="no-groups">No groups created yet.</p>';
        return;
    }

    // Display groups
    groups.forEach(group => {
        const groupItem = createGroupItem(group);
        groupsList.appendChild(groupItem);
    });
}

// Create group item element
function createGroupItem(group) {
    const groupItem = document.createElement('div');
    groupItem.className = 'group-item';
    groupItem.dataset.id = group.id;

    // Get members info
    const members = getGroupMembers(group.id);
    const memberNames = members.map(member => member.name).join(', ');

    groupItem.innerHTML = `
        <div class="group-header">
            <h4 class="group-name">${group.name}</h4>
            <div class="group-actions">
                <button class="btn view-group" data-id="${group.id}">View Calendar</button>
                <button class="btn edit-group" data-id="${group.id}">Edit</button>
                <button class="btn delete-group" data-id="${group.id}">Delete</button>
            </div>
        </div>
        <div class="group-details">
            <div class="group-members">
                <strong>Members:</strong> ${memberNames}
            </div>
        </div>
    `;

    // Add event listeners for action buttons
    groupItem.querySelector('.view-group').addEventListener('click', () => {
        viewGroupCalendar(group.id);
    });

    groupItem.querySelector('.edit-group').addEventListener('click', () => {
        editGroup(group.id);
    });

    groupItem.querySelector('.delete-group').addEventListener('click', () => {
        deleteGroup(group.id);
    });

    return groupItem;
}

// Create new group
function createGroup(e) {
    e.preventDefault();

    const groupName = document.getElementById('group-name').value;
    const selectedFriends = Array.from(document.querySelectorAll('input[name="friend"]:checked'))
        .map(checkbox => checkbox.value);

    // Validate
    if (groupName.trim() === '') {
        alert('Please enter a group name');
        return;
    }

    if (selectedFriends.length === 0) {
        alert('Please select at least one friend');
        return;
    }

    const currentUser = getCurrentUser();

    // Create group object
    const newGroup = {
        id: generateGroupId(),
        name: groupName,
        createdBy: currentUser.id,
        members: [
            { id: currentUser.id, role: 'admin' },
            ...selectedFriends.map(friendId => ({ id: friendId, role: 'member' }))
        ]
    };

    // Add to groups array
    const groups = getGroups();
    groups.push(newGroup);

    // Save updated groups
    localStorage.setItem(`groups_${currentUser.id}`, JSON.stringify(groups));

    // Create notification for new group
    if (typeof Notifications !== 'undefined') {
        Notifications.addNotification(
            `New group created: ${groupName}`,
            'group',
            { groupId: newGroup.id }
        );

        // Notify group members (in a real app, this would be server-side)
        notifyGroupMembers(newGroup, 'added');
    }

    // Reset form
    createGroupForm.reset();

    // Reload groups
    loadGroups();
}

// Notify group members about changes
function notifyGroupMembers(group, action) {
    // In a real app this would be handled by a server
    // This is a simplified version for demonstration

    const currentUser = getCurrentUser();

    // Skip the current user (group creator/admin)
    const otherMembers = group.members.filter(member =>
        member.id !== currentUser.id && member.role !== 'admin'
    );

    // For demonstration purposes, log notification that would be sent
    otherMembers.forEach(member => {
        console.log(`Group notification would be sent to member ${member.id}`);
    });
}

// View group's common calendar
function viewGroupCalendar(groupId) {
    // Set active group for calendar view
    setActiveGroup(groupId);

    // Navigate to calendar view
    document.querySelector('.sidebar-menu a[href="#calendar"]').click();
}

// Edit group
function editGroup(groupId) {
    const groups = getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) {
        return;
    }

    // Create edit form
    const editForm = document.createElement('div');
    editForm.className = 'edit-group-form';

    const friends = getFriends().filter(friend => friend.status === 'confirmed');

    // Create checkboxes for each friend
    const friendCheckboxes = friends.map(friend => {
        const isMember = group.members.some(member => member.id === friend.id);
        return `
            <div class="friend-option">
                <label class="checkbox-label">
                    <input type="checkbox" name="edit-friend" value="${friend.id}" ${isMember ? 'checked' : ''}>
                    <span class="friend-name">${friend.name}</span>
                </label>
            </div>
        `;
    }).join('');

    editForm.innerHTML = `
        <div class="form-overlay"></div>
        <div class="form-container edit-form">
            <h3>Edit Group</h3>
            <form id="edit-group-form">
                <div class="form-group">
                    <label for="edit-group-name">Group Name</label>
                    <input type="text" id="edit-group-name" value="${group.name}" required>
                </div>
                <div class="form-group">
                    <label>Select Friends</label>
                    <div id="edit-friend-selection" class="friend-selection">
                        ${friendCheckboxes}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn cancel-edit">Cancel</button>
                </div>
            </form>
        </div>
    `;

    // Add to page
    document.body.appendChild(editForm);

    // Add event listeners
    document.getElementById('edit-group-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const newName = document.getElementById('edit-group-name').value;
        const selectedFriends = Array.from(document.querySelectorAll('input[name="edit-friend"]:checked'))
            .map(checkbox => checkbox.value);

        // Update group
        updateGroup(groupId, newName, selectedFriends);

        // Remove form
        document.body.removeChild(editForm);
    });

    document.querySelector('.cancel-edit').addEventListener('click', () => {
        document.body.removeChild(editForm);
    });

    document.querySelector('.form-overlay').addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}

// Update group
function updateGroup(groupId, newName, selectedFriends) {
    const currentUser = getCurrentUser();
    const groups = getGroups();
    const groupIndex = groups.findIndex(g => g.id === groupId);

    if (groupIndex === -1) {
        return;
    }

    const oldName = groups[groupIndex].name;
    const nameChanged = oldName !== newName;

    // Update group name
    groups[groupIndex].name = newName;

    // Track added and removed members for notifications
    const currentMemberIds = groups[groupIndex].members.map(m => m.id);
    const addedMemberIds = selectedFriends.filter(id => !currentMemberIds.includes(id));
    const removedMemberIds = currentMemberIds.filter(id =>
        !selectedFriends.includes(id) && id !== currentUser.id
    );

    // Update members (keeping admin as is)
    const adminMembers = groups[groupIndex].members.filter(member => member.role === 'admin');

    groups[groupIndex].members = [
        ...adminMembers,
        ...selectedFriends
            .filter(friendId => !adminMembers.some(admin => admin.id === friendId))
            .map(friendId => ({ id: friendId, role: 'member' }))
    ];

    // Save updated groups
    localStorage.setItem(`groups_${currentUser.id}`, JSON.stringify(groups));

    // Create notifications for group updates
    if (typeof Notifications !== 'undefined') {
        // Notification for name change
        if (nameChanged) {
            Notifications.addNotification(
                `Group renamed: ${oldName} → ${newName}`,
                'group',
                { groupId }
            );
        }

        // Notification for member changes
        if (addedMemberIds.length > 0 || removedMemberIds.length > 0) {
            const memberChangeMsg = [];

            if (addedMemberIds.length > 0) {
                memberChangeMsg.push(`Added ${addedMemberIds.length} member${addedMemberIds.length > 1 ? 's' : ''}`);
            }

            if (removedMemberIds.length > 0) {
                memberChangeMsg.push(`Removed ${removedMemberIds.length} member${removedMemberIds.length > 1 ? 's' : ''}`);
            }

            Notifications.addNotification(
                `Group "${newName}" updated: ${memberChangeMsg.join(', ')}`,
                'group',
                { groupId }
            );
        }

        // Notify members about the updates
        notifyGroupMembers(groups[groupIndex], 'updated');
    }

    // Reload groups
    loadGroups();
}

// Delete group
function deleteGroup(groupId) {
    if (!confirm('Are you sure you want to delete this group?')) {
        return;
    }

    const currentUser = getCurrentUser();

    // Get group before deletion
    const groups = getGroups();
    const group = groups.find(g => g.id === groupId);

    if (!group) return;

    const groupName = group.name;

    // Store member info for notifications
    const memberIds = group.members
        .filter(m => m.id !== currentUser.id)
        .map(m => m.id);

    // Remove from groups array
    const updatedGroups = groups.filter(group => group.id !== groupId);

    // Save updated groups
    localStorage.setItem(`groups_${currentUser.id}`, JSON.stringify(updatedGroups));

    // Create notification for deleted group
    if (typeof Notifications !== 'undefined') {
        Notifications.addNotification(
            `Group deleted: ${groupName}`,
            'group'
        );

        // In a real app, members would be notified about the group deletion
        memberIds.forEach(memberId => {
            console.log(`Member ${memberId} would be notified about group deletion`);
        });
    }

    // If active group is being deleted, clear it
    clearActiveGroup();

    // Reload groups
    loadGroups();
}

// Get all groups for current user
function getGroups() {
    const currentUser = getCurrentUser();
    return JSON.parse(localStorage.getItem(`groups_${currentUser.id}`) || '[]');
}

// Get group by ID
function getGroup(groupId) {
    const groups = getGroups();
    return groups.find(group => group.id === groupId);
}

// Get members of a group with their details
function getGroupMembers(groupId) {
    const group = getGroup(groupId);

    if (!group) {
        return [];
    }

    // Get all users
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Map member IDs to user details
    return group.members.map(member => {
        const user = users.find(user => user.id === member.id);
        return {
            id: member.id,
            name: user ? user.name : 'Unknown User',
            email: user ? user.email : '',
            role: member.role
        };
    });
}

// Generate unique group ID
function generateGroupId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Export functions
export { initGroups, getGroups, getGroup, getGroupMembers };
