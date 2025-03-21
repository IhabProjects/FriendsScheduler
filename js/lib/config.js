// Configuration for Friends Scheduler app
// Replace these values with your own Supabase project details

// Supabase configuration
export const SUPABASE_CONFIG = {
    URL: 'https://tsoazihjgvywdavtnkda.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzb2F6aWhqZ3Z5d2RhdnRua2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MjI4MzksImV4cCI6MjA1ODA5ODgzOX0.g-W0BxLmb0tEgdPEsqDAAT2Mx_1q1YK9UZiB2LhpU_U',
};

// App configuration
export const APP_CONFIG = {
    APP_NAME: 'Friends Scheduler',
    VERSION: '1.0.0',
    // Set to true to enable data migration from localStorage to Supabase
    ENABLE_DATA_MIGRATION: true,
    // Set to true to enable console logs for debugging
    DEBUG_MODE: true,
};
