// Supabase Client for Friends Scheduler
// This module initializes the Supabase client and provides helper functions

// Import the Supabase client from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from './config.js';

// Supabase configuration
const SUPABASE_URL = SUPABASE_CONFIG.URL;
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.ANON_KEY;

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication functions
async function signUp(email, password, userData) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: userData, // Additional user data like username, full_name, etc.
            }
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error signing up:', error.message);
        return { data: null, error };
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error signing in:', error.message);
        return { data: null, error };
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error signing out:', error.message);
        return { error };
    }
}

async function getCurrentSession() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error getting session:', error.message);
        return { data: null, error };
    }
}

// Database functions

// Schedule functions
async function getScheduleEvents(userId) {
    try {
        const { data, error } = await supabase
            .from('schedules')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching events:', error.message);
        return { data: null, error };
    }
}

async function addScheduleEvent(eventData) {
    try {
        const { data, error } = await supabase
            .from('schedules')
            .insert([eventData])
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error adding event:', error.message);
        return { data: null, error };
    }
}

async function updateScheduleEvent(eventId, eventData) {
    try {
        const { data, error } = await supabase
            .from('schedules')
            .update(eventData)
            .eq('id', eventId)
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating event:', error.message);
        return { data: null, error };
    }
}

async function deleteScheduleEvent(eventId) {
    try {
        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', eventId);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting event:', error.message);
        return { error };
    }
}

// Friends functions
async function getFriends(userId) {
    try {
        // Get confirmed friends where the user is either the user_id or friend_id
        const { data, error } = await supabase
            .from('friends')
            .select(`
                id,
                status,
                created_at,
                users!friends_user_id_fkey (id, username, full_name),
                users!friends_friend_id_fkey (id, username, full_name)
            `)
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
            .eq('status', 'confirmed');

        if (error) throw error;

        // Transform data to get the friend information regardless of which side of the relationship
        const transformedData = data.map(friend => {
            const isFriendInitiator = friend.users.id === userId;
            return {
                id: friend.id,
                status: friend.status,
                created_at: friend.created_at,
                friend: isFriendInitiator ? friend.users_2 : friend.users
            };
        });

        return { data: transformedData, error: null };
    } catch (error) {
        console.error('Error fetching friends:', error.message);
        return { data: null, error };
    }
}

async function getFriendRequests(userId) {
    try {
        // Get pending friend requests where the user is the friend_id (they received the request)
        const { data, error } = await supabase
            .from('friends')
            .select(`
                id,
                status,
                created_at,
                users!friends_user_id_fkey (id, username, full_name)
            `)
            .eq('friend_id', userId)
            .eq('status', 'pending');

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching friend requests:', error.message);
        return { data: null, error };
    }
}

async function sendFriendRequest(userId, friendId) {
    try {
        const { data, error } = await supabase
            .from('friends')
            .insert([{
                user_id: userId,
                friend_id: friendId,
                status: 'pending'
            }])
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error sending friend request:', error.message);
        return { data: null, error };
    }
}

async function respondToFriendRequest(requestId, status) {
    try {
        const { data, error } = await supabase
            .from('friends')
            .update({ status })
            .eq('id', requestId)
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error responding to friend request:', error.message);
        return { data: null, error };
    }
}

async function searchUsers(query) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, full_name')
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error searching users:', error.message);
        return { data: null, error };
    }
}

// Groups functions
async function getGroups(userId) {
    try {
        // Get groups created by user
        const { data: ownedGroups, error: ownedError } = await supabase
            .from('groups')
            .select('*')
            .eq('created_by', userId);

        if (ownedError) throw ownedError;

        // Get groups user is a member of
        const { data: memberGroups, error: memberError } = await supabase
            .from('group_members')
            .select('groups(*)')
            .eq('user_id', userId);

        if (memberError) throw memberError;

        // Combine and remove duplicates
        const memberGroupsData = memberGroups.map(item => item.groups);
        const allGroups = [...ownedGroups, ...memberGroupsData];
        const uniqueGroups = Array.from(new Set(allGroups.map(group => group.id)))
            .map(id => allGroups.find(group => group.id === id));

        return { data: uniqueGroups, error: null };
    } catch (error) {
        console.error('Error fetching groups:', error.message);
        return { data: null, error };
    }
}

async function createGroup(groupData) {
    try {
        // Insert the group
        const { data, error } = await supabase
            .from('groups')
            .insert([groupData])
            .select();

        if (error) throw error;

        // Add the creator as a member
        const groupId = data[0].id;
        const creatorId = data[0].created_by;

        const { error: memberError } = await supabase
            .from('group_members')
            .insert([{
                group_id: groupId,
                user_id: creatorId
            }]);

        if (memberError) throw memberError;

        return { data, error: null };
    } catch (error) {
        console.error('Error creating group:', error.message);
        return { data: null, error };
    }
}

async function addGroupMember(groupId, userId) {
    try {
        const { data, error } = await supabase
            .from('group_members')
            .insert([{
                group_id: groupId,
                user_id: userId
            }])
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error adding group member:', error.message);
        return { data: null, error };
    }
}

// Notifications functions
async function getNotifications(userId) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        return { data: null, error };
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error marking notification as read:', error.message);
        return { data: null, error };
    }
}

async function createNotification(notificationData) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert([notificationData])
            .select();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating notification:', error.message);
        return { data: null, error };
    }
}

// Realtime subscriptions
function subscribeToFriendRequests(userId, callback) {
    return supabase
        .channel('friend-requests')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'friends',
            filter: `friend_id=eq.${userId}`
        }, callback)
        .subscribe();
}

function subscribeToNotifications(userId, callback) {
    return supabase
        .channel('notifications')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
        }, callback)
        .subscribe();
}

// Export all functions
export {
    supabase,
    signUp,
    signIn,
    signOut,
    getCurrentSession,
    getScheduleEvents,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
    getFriends,
    getFriendRequests,
    sendFriendRequest,
    respondToFriendRequest,
    searchUsers,
    getGroups,
    createGroup,
    addGroupMember,
    getNotifications,
    markNotificationAsRead,
    createNotification,
    subscribeToFriendRequests,
    subscribeToNotifications
};
