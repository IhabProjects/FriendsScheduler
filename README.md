# Friends Scheduler

A web application that helps friends find common free time slots in their schedules to meet up and plan activities together.

## Problem

It's challenging to coordinate meetups when everyone has different academic or work schedules. This app solves this problem by:
1. Allowing users to input their personal schedules
2. Connecting with friends through friend requests
3. Creating groups of friends
4. Visualizing overlapping free time slots for easy meetup planning

## Features

- User registration and authentication
- Personal schedule management
- Friend connection system
- Group creation and management
- Calendar visualization with highlighted common free time
- Responsive design for mobile and desktop

## Project Structure

```
/
├── index.html          # Entry point
├── css/                # Stylesheets
│   ├── main.css        # Main styles
│   ├── auth.css        # Authentication styles
│   ├── calendar.css    # Calendar visualization styles
│   └── ...
├── js/                 # JavaScript files
│   ├── app.js          # Main application logic
│   ├── auth.js         # Authentication logic
│   ├── schedule.js     # Schedule management
│   ├── friends.js      # Friend connection logic
│   ├── groups.js       # Group management
│   ├── lib/            # Libraries and utilities
│   │   ├── supabase.js # Supabase client
│   │   ├── config.js   # Configuration
│   │   └── migration.js# Data migration utilities
│   └── ...
└── assets/             # Images, icons, etc.
```

## Supabase Integration

This application now uses Supabase for data storage and authentication. Follow these steps to set up:

1. Create a Supabase account at [supabase.com](https://supabase.com) if you don't have one
2. Create a new project in Supabase
3. Set up the required database tables using SQL:
   - Run the SQL commands in the Supabase SQL Editor to create the tables
   - Make sure all tables have proper relationships and constraints
4. Configure Row Level Security (RLS) policies to control access to your data
5. Get your Supabase URL and anon key from the project settings
6. Update the configuration in `js/lib/config.js` with your Supabase details:

```javascript
// Supabase configuration
export const SUPABASE_CONFIG = {
    URL: 'YOUR_SUPABASE_URL',
    ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
};
```

## Migration from localStorage

The application provides functionality to migrate existing user data from localStorage to Supabase. This happens automatically when a user logs in and has existing data in localStorage.

## Development

1. Clone the repository
2. Configure the Supabase integration as mentioned above
3. Open `index.html` in your browser to start using the application

## Data Storage

The application now uses Supabase for data storage, providing:
- User authentication and management
- Schedule data storage
- Friend connections
- Group configurations
- Real-time notifications

## Future Improvements

- Add export/import functionality for schedules
- Implement recurring events
- Add email notifications for friend requests
- Create meeting proposals with voting system
- Add multi-device synchronization
