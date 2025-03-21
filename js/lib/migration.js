// Migration script to move data from localStorage to Supabase
// This script helps migrate existing user data to Supabase

import * as SupabaseClient from './supabase.js';

// Migration function to move existing localStorage data to Supabase
export async function migrateDataToSupabase() {
    try {
        console.log('Starting data migration to Supabase...');

        // Check if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            console.log('No user logged in. Migration cancelled.');
            return { success: false, message: 'No user logged in' };
        }

        // Get current Supabase session
        const { data: sessionData } = await SupabaseClient.getCurrentSession();
        if (!sessionData.session) {
            console.log('No Supabase session. Migration cancelled.');
            return { success: false, message: 'No Supabase session' };
        }

        // Get user ID from Supabase
        const userId = sessionData.session.user.id;

        // Migrate schedule events
        await migrateScheduleEvents(userId, currentUser.id);

        // Migrate friends
        await migrateFriends(userId, currentUser.id);

        // Migrate groups
        await migrateGroups(userId, currentUser.id);

        // Migrate notifications
        await migrateNotifications(userId, currentUser.id);

        console.log('Data migration completed successfully!');
        return { success: true, message: 'Migration completed' };
    } catch (error) {
        console.error('Error during migration:', error);
        return { success: false, message: error.message };
    }
}

// Migrate schedule events
async function migrateScheduleEvents(supabaseUserId, localUserId) {
    try {
        // Get local schedule data
        const scheduleKey = `schedule_${localUserId}`;
        const localSchedule = JSON.parse(localStorage.getItem(scheduleKey) || '[]');

        if (localSchedule.length === 0) {
            console.log('No schedule events to migrate.');
            return;
        }

        console.log(`Migrating ${localSchedule.length} schedule events...`);

        // Transform data to match Supabase structure
        const events = localSchedule.map(event => ({
            user_id: supabaseUserId,
            title: event.title,
            date: new Date(event.start).toISOString().split('T')[0],
            start_time: new Date(event.start).toTimeString().split(' ')[0],
            end_time: new Date(event.end).toTimeString().split(' ')[0],
            type: event.type || 'busy',
            created_at: new Date().toISOString()
        }));

        // Insert events in batches to avoid rate limiting
        const batchSize = 20;
        for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);
            const { error } = await SupabaseClient.supabase
                .from('schedules')
                .insert(batch);

            if (error) throw error;
            console.log(`Migrated batch ${i/batchSize + 1} of ${Math.ceil(events.length/batchSize)}`);
        }

        console.log('Schedule events migrated successfully!');
    } catch (error) {
        console.error('Error migrating schedule events:', error);
        throw error;
    }
}

// Migrate friends
async function migrateFriends(supabaseUserId, localUserId) {
    try {
        // Get local friends data
        const friendsKey = `friends_${localUserId}`;
        const localFriends = JSON.parse(localStorage.getItem(friendsKey) || '[]');

        if (localFriends.length === 0) {
            console.log('No friends to migrate.');
            return;
        }

        console.log(`Migrating ${localFriends.length} friends...`);

        // Check if we have already created Supabase users for these friends
        // This would require mapping local IDs to Supabase IDs
        // For simplicity, we'll assume the friends need to be re-added in Supabase

        // Just log the friends that would need to be migrated
        localFriends.forEach(friend => {
            console.log(`Friend relationship with ${friend.username} (status: ${friend.status}) would need to be re-established in Supabase.`);
        });

        console.log('Friends migration note: Friends need to be re-added in the new system.');
    } catch (error) {
        console.error('Error migrating friends:', error);
        throw error;
    }
}

// Migrate groups
async function migrateGroups(supabaseUserId, localUserId) {
    try {
        // Get local groups data
        const groupsKey = 'groups';
        const localGroups = JSON.parse(localStorage.getItem(groupsKey) || '[]');

        if (localGroups.length === 0) {
            console.log('No groups to migrate.');
            return;
        }

        // Filter groups created by the current user
        const userGroups = localGroups.filter(group => group.createdBy === localUserId);

        if (userGroups.length === 0) {
            console.log('No groups created by this user to migrate.');
            return;
        }

        console.log(`Migrating ${userGroups.length} groups...`);

        // Transform data to match Supabase structure
        for (const group of userGroups) {
            // Create the group
            const { data: groupData, error: groupError } = await SupabaseClient.supabase
                .from('groups')
                .insert([{
                    name: group.name,
                    description: group.description || '',
                    created_by: supabaseUserId,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (groupError) throw groupError;
            console.log(`Migrated group: ${group.name}`);

            // Add members (this would require mapping member IDs to Supabase IDs)
            // For simplicity, we'll just log that this would need to be done
            console.log(`Group ${group.name} members would need to be re-added in Supabase.`);
        }

        console.log('Groups migrated successfully!');
    } catch (error) {
        console.error('Error migrating groups:', error);
        throw error;
    }
}

// Migrate notifications
async function migrateNotifications(supabaseUserId, localUserId) {
    try {
        // Get local notifications data
        const notificationsKey = 'friendScheduler_notifications';
        const localNotifications = JSON.parse(localStorage.getItem(notificationsKey) || '[]');

        // Filter notifications for the current user
        const userNotifications = localNotifications.filter(notification =>
            notification.userId === localUserId);

        if (userNotifications.length === 0) {
            console.log('No notifications to migrate.');
            return;
        }

        console.log(`Migrating ${userNotifications.length} notifications...`);

        // Transform data to match Supabase structure
        const notifications = userNotifications.map(notification => ({
            user_id: supabaseUserId,
            type: notification.type || 'general',
            message: notification.message,
            is_read: notification.read || false,
            related_id: notification.relatedId || null,
            created_at: new Date(notification.timestamp || Date.now()).toISOString()
        }));

        // Insert notifications in batches to avoid rate limiting
        const batchSize = 20;
        for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            const { error } = await SupabaseClient.supabase
                .from('notifications')
                .insert(batch);

            if (error) throw error;
            console.log(`Migrated batch ${i/batchSize + 1} of ${Math.ceil(notifications.length/batchSize)}`);
        }

        console.log('Notifications migrated successfully!');
    } catch (error) {
        console.error('Error migrating notifications:', error);
        throw error;
    }
}
