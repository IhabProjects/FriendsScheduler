import { getCurrentUser } from './auth.js';

// DOM Elements - these will be populated when the friends view is loaded
let friendsList;
let friendRequestsList;
let searchInput;
let searchResults;
let contentArea;

// Initialize friends functionality
function initFriends() {
    // Create friends view if it doesn't exist yet
    if (!document.getElementById('friends-view')) {
        createFriendsView();
    }

    // Get DOM elements after view is created
    friendsList = document.getElementById('friends-list');
    friendRequestsList = document.getElementById('friend-requests-list');
    searchInput = document.getElementById('friend-search');
    searchResults = document.getElementById('search-results');

    // Add event listeners
    searchInput.addEventListener('input', debounce(searchUsers, 300));

    // Load friends and requests
    loadFriends();
    loadFriendRequests();
}

// Create friends view
function createFriendsView() {
    contentArea = document.getElementById('content-area');

    const friendsView = document.createElement('div');
    friendsView.id = 'friends-view';
    friendsView.className = 'content-view';

    friendsView.innerHTML = `
        <h2>Friends</h2>
        <p>Connect with friends to find common free time for meetups.</p>

        <div class="search-container">
            <h3>Find Friends</h3>
            <div class="form-group">
                <input type="text" id="friend-search" placeholder="Search by name or email">
            </div>
            <div id="search-results" class="search-results"></div>
        </div>

        <div class="friend-requests-container">
            <h3>Friend Requests</h3>
            <div id="friend-requests-list" class="friend-list"></div>
        </div>

        <div class="friends-container">
            <h3>Your Friends</h3>
            <div id="friends-list" class="friend-list"></div>
        </div>
    `;

    contentArea.appendChild(friendsView);
}

// Load friends list
function loadFriends() {
    const friends = getFriends();

    // Clear the list
    friendsList.innerHTML = '';

    // Filter confirmed friends
    const confirmedFriends = friends.filter(friend => friend.status === 'confirmed');

    // If no friends, show message
    if (confirmedFriends.length === 0) {
        friendsList.innerHTML = '<p class="no-friends">No friends added yet.</p>';
        return;
    }

    // Display friends
    confirmedFriends.forEach(friend => {
        const friendItem = createFriendItem(friend);
        friendsList.appendChild(friendItem);
    });
}

// Load friend requests
function loadFriendRequests() {
    const friends = getFriends();

    // Clear the list
    friendRequestsList.innerHTML = '';

    // Filter pending requests
    const pendingRequests = friends.filter(friend => friend.status === 'pending' && friend.direction === 'received');

    // If no requests, show message
    if (pendingRequests.length === 0) {
        friendRequestsList.innerHTML = '<p class="no-requests">No pending friend requests.</p>';
        return;
    }

    // Display requests
    pendingRequests.forEach(friend => {
        const requestItem = createRequestItem(friend);
        friendRequestsList.appendChild(requestItem);
    });
}

// Create friend item element
function createFriendItem(friend) {
    const friendItem = document.createElement('div');
    friendItem.className = 'friend-item';
    friendItem.dataset.id = friend.id;

    friendItem.innerHTML = `
        <div class="friend-avatar">
            <span>${friend.name.charAt(0)}</span>
        </div>
        <div class="friend-details">
            <div class="friend-name">${friend.name}</div>
            <div class="friend-email">${friend.email}</div>
        </div>
        <div class="friend-actions">
            <button class="btn remove-friend" data-id="${friend.id}">Remove</button>
        </div>
    `;

    // Add event listener for remove button
    friendItem.querySelector('.remove-friend').addEventListener('click', () => {
        removeFriend(friend.id);
    });

    return friendItem;
}

// Create friend request item element
function createRequestItem(friend) {
    const requestItem = document.createElement('div');
    requestItem.className = 'friend-item request-item';
    requestItem.dataset.id = friend.id;

    requestItem.innerHTML = `
        <div class="friend-avatar">
            <span>${friend.name.charAt(0)}</span>
        </div>
        <div class="friend-details">
            <div class="friend-name">${friend.name}</div>
            <div class="friend-email">${friend.email}</div>
        </div>
        <div class="friend-actions">
            <button class="btn accept-request" data-id="${friend.id}">Accept</button>
            <button class="btn reject-request" data-id="${friend.id}">Reject</button>
        </div>
    `;

    // Add event listeners for action buttons
    requestItem.querySelector('.accept-request').addEventListener('click', () => {
        acceptFriendRequest(friend.id);
    });

    requestItem.querySelector('.reject-request').addEventListener('click', () => {
        rejectFriendRequest(friend.id);
    });

    return requestItem;
}

// Create search result item element
function createSearchResultItem(user) {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.dataset.id = user.id;

    // Check if already friends or request sent/received
    const friends = getFriends();
    const existingFriend = friends.find(friend => friend.id === user.id);

    let actionButton = '';

    if (existingFriend) {
        if (existingFriend.status === 'confirmed') {
            actionButton = '<button class="btn btn-disabled" disabled>Friends</button>';
        } else if (existingFriend.status === 'pending') {
            if (existingFriend.direction === 'sent') {
                actionButton = '<button class="btn btn-disabled" disabled>Request Sent</button>';
            } else {
                actionButton = `
                    <button class="btn accept-request" data-id="${user.id}">Accept</button>
                    <button class="btn reject-request" data-id="${user.id}">Reject</button>
                `;
            }
        }
    } else {
        actionButton = `<button class="btn add-friend" data-id="${user.id}">Add Friend</button>`;
    }

    resultItem.innerHTML = `
        <div class="friend-avatar">
            <span>${user.name.charAt(0)}</span>
        </div>
        <div class="friend-details">
            <div class="friend-name">${user.name}</div>
            <div class="friend-email">${user.email}</div>
        </div>
        <div class="friend-actions">
            ${actionButton}
        </div>
    `;

    // Add event listener for add friend button
    const addButton = resultItem.querySelector('.add-friend');
    if (addButton) {
        addButton.addEventListener('click', () => {
            sendFriendRequest(user);
        });
    }

    // Add event listeners for accept/reject buttons
    const acceptButton = resultItem.querySelector('.accept-request');
    if (acceptButton) {
        acceptButton.addEventListener('click', () => {
            acceptFriendRequest(user.id);
        });
    }

    const rejectButton = resultItem.querySelector('.reject-request');
    if (rejectButton) {
        rejectButton.addEventListener('click', () => {
            rejectFriendRequest(user.id);
        });
    }

    return resultItem;
}

// Search for users
function searchUsers() {
    const query = searchInput.value.trim().toLowerCase();

    // Clear previous results
    searchResults.innerHTML = '';

    if (query.length < 2) {
        return;
    }

    // Get all users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const currentUser = getCurrentUser();

    // Filter users based on search query
    const filteredUsers = users.filter(user =>
        (user.id !== currentUser.id) && // Don't include current user
        (user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
    );

    // Display results
    if (filteredUsers.length === 0) {
        searchResults.innerHTML = '<p class="no-results">No users found.</p>';
    } else {
        filteredUsers.forEach(user => {
            const resultItem = createSearchResultItem(user);
            searchResults.appendChild(resultItem);
        });
    }
}

// Send friend request
function sendFriendRequest(user) {
    const currentUser = getCurrentUser();

    // Add to current user's friends list
    const friends = getFriends();

    // Create friend object
    const friendConnection = {
        id: user.id,
        name: user.name,
        email: user.email,
        status: 'pending',
        direction: 'sent'
    };

    // Add to friends array
    friends.push(friendConnection);

    // Save updated friends list
    localStorage.setItem(`friends_${currentUser.id}`, JSON.stringify(friends));

    // Add to recipient's friends list
    let recipientFriends = JSON.parse(localStorage.getItem(`friends_${user.id}`) || '[]');

    // Create friend object for recipient
    const recipientConnection = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        status: 'pending',
        direction: 'received'
    };

    // Add to recipient's friends array
    recipientFriends.push(recipientConnection);

    // Save updated friends list for recipient
    localStorage.setItem(`friends_${user.id}`, JSON.stringify(recipientFriends));

    // Update UI
    searchUsers();
}

// Accept friend request
function acceptFriendRequest(friendId) {
    const currentUser = getCurrentUser();

    // Update in current user's friends list
    const friends = getFriends();
    const friendIndex = friends.findIndex(friend => friend.id === friendId);

    if (friendIndex !== -1) {
        friends[friendIndex].status = 'confirmed';
        friends[friendIndex].direction = 'none';

        // Save updated friends list
        localStorage.setItem(`friends_${currentUser.id}`, JSON.stringify(friends));
    }

    // Update in friend's list
    let friendsFriends = JSON.parse(localStorage.getItem(`friends_${friendId}`) || '[]');
    const currentUserIndex = friendsFriends.findIndex(friend => friend.id === currentUser.id);

    if (currentUserIndex !== -1) {
        friendsFriends[currentUserIndex].status = 'confirmed';
        friendsFriends[currentUserIndex].direction = 'none';

        // Save updated friends list
        localStorage.setItem(`friends_${friendId}`, JSON.stringify(friendsFriends));
    }

    // Update UI
    loadFriends();
    loadFriendRequests();
    searchUsers();
}

// Reject friend request
function rejectFriendRequest(friendId) {
    const currentUser = getCurrentUser();

    // Remove from current user's friends list
    let friends = getFriends();
    friends = friends.filter(friend => friend.id !== friendId);

    // Save updated friends list
    localStorage.setItem(`friends_${currentUser.id}`, JSON.stringify(friends));

    // Remove from friend's list
    let friendsFriends = JSON.parse(localStorage.getItem(`friends_${friendId}`) || '[]');
    friendsFriends = friendsFriends.filter(friend => friend.id !== currentUser.id);

    // Save updated friends list
    localStorage.setItem(`friends_${friendId}`, JSON.stringify(friendsFriends));

    // Update UI
    loadFriendRequests();
    searchUsers();
}

// Remove friend
function removeFriend(friendId) {
    if (!confirm('Are you sure you want to remove this friend?')) {
        return;
    }

    const currentUser = getCurrentUser();

    // Remove from current user's friends list
    let friends = getFriends();
    friends = friends.filter(friend => friend.id !== friendId);

    // Save updated friends list
    localStorage.setItem(`friends_${currentUser.id}`, JSON.stringify(friends));

    // Remove from friend's list
    let friendsFriends = JSON.parse(localStorage.getItem(`friends_${friendId}`) || '[]');
    friendsFriends = friendsFriends.filter(friend => friend.id !== currentUser.id);

    // Save updated friends list
    localStorage.setItem(`friends_${friendId}`, JSON.stringify(friendsFriends));

    // Update UI
    loadFriends();
}

// Get friends for current user
function getFriends() {
    const currentUser = getCurrentUser();
    return JSON.parse(localStorage.getItem(`friends_${currentUser.id}`) || '[]');
}

// Debounce function to limit function calls
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Export functions
export { initFriends, getFriends };
