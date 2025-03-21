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
│   ├── calendar.js     # Calendar visualization
│   ├── schedule.js     # Schedule management
│   ├── friends.js      # Friend connection logic
│   ├── groups.js       # Group management
│   └── ...
└── assets/             # Images, icons, etc.
```

## Development

1. Clone the repository
2. Open `index.html` in your browser to start using the application
3. No server-side dependencies required as this is a client-side only application

## Data Storage

The application uses browser's localStorage for data persistence, including:
- User profiles
- Schedule data
- Friend connections
- Group configurations

## Future Improvements

- Add export/import functionality for schedules
- Implement recurring events
- Add notifications for friend requests
- Create meeting proposals with voting system
