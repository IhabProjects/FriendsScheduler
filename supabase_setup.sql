-- Supabase SQL setup for Friends Scheduler

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a profiles table that extends the auth.users table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  type TEXT DEFAULT 'busy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
  CONSTRAINT not_self_friend CHECK (user_id <> friend_id)
);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_group_member UNIQUE (group_id, user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_id UUID, -- Can reference various entities like friend requests, schedules, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Add policies for profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Add policies for schedules
CREATE POLICY "Users can view their own schedules" ON public.schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own schedules" ON public.schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own schedules" ON public.schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own schedules" ON public.schedules FOR DELETE USING (auth.uid() = user_id);

-- Add policies for friends
CREATE POLICY "Users can view their friend connections" ON public.friends FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);
CREATE POLICY "Users can create friend requests" ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their friend status" ON public.friends FOR UPDATE USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);
CREATE POLICY "Users can delete their friend connections" ON public.friends FOR DELETE USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- Add policies for groups
CREATE POLICY "Users can view groups they belong to" ON public.groups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members WHERE group_id = public.groups.id AND user_id = auth.uid()
  ) OR created_by = auth.uid()
);
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update groups" ON public.groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Group creators can delete groups" ON public.groups FOR DELETE USING (auth.uid() = created_by);

-- Add policies for group_members
CREATE POLICY "Users can view groups they belong to" ON public.group_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.groups WHERE id = public.group_members.group_id AND created_by = auth.uid()
  )
);
CREATE POLICY "Group creators can manage members" ON public.group_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups WHERE id = public.group_members.group_id AND created_by = auth.uid()
  ) OR auth.uid() = user_id -- Allow users to add themselves if group is public
);
CREATE POLICY "Group creators can remove members" ON public.group_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.groups WHERE id = public.group_members.group_id AND created_by = auth.uid()
  ) OR auth.uid() = user_id -- Allow users to remove themselves
);

-- Add policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark their notifications as read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true); -- May need refinement

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to find available time slots for a group
CREATE OR REPLACE FUNCTION public.find_available_time_slots(
  group_id UUID,
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  date DATE,
  start_time TIME,
  end_time TIME
) AS $$
DECLARE
  day_start TIME := '08:00:00'::TIME; -- Configurable
  day_end TIME := '22:00:00'::TIME;   -- Configurable
  slot_duration INTERVAL := '30 minutes'::INTERVAL; -- Configurable
BEGIN
  RETURN QUERY
  WITH group_members AS (
    SELECT user_id FROM public.group_members WHERE group_id = $1
  ),
  busy_times AS (
    SELECT
      s.date,
      s.start_time,
      s.end_time
    FROM
      public.schedules s
    JOIN
      group_members g ON s.user_id = g.user_id
    WHERE
      s.date BETWEEN $2 AND $3
  ),
  all_slots AS (
    SELECT
      d::DATE as date,
      generate_series(
        day_start::TIME,
        day_end::TIME - slot_duration::INTERVAL,
        slot_duration::INTERVAL
      )::TIME as start_time,
      (generate_series(
        day_start::TIME,
        day_end::TIME - slot_duration::INTERVAL,
        slot_duration::INTERVAL
      ) + slot_duration::INTERVAL)::TIME as end_time
    FROM
      generate_series($2, $3, '1 day'::INTERVAL) d
  ),
  available_slots AS (
    SELECT
      a.date,
      a.start_time,
      a.end_time
    FROM
      all_slots a
    WHERE
      NOT EXISTS (
        SELECT 1
        FROM busy_times b
        WHERE
          b.date = a.date AND
          (
            (b.start_time <= a.start_time AND b.end_time > a.start_time) OR
            (b.start_time < a.end_time AND b.end_time >= a.end_time) OR
            (b.start_time >= a.start_time AND b.end_time <= a.end_time)
          )
      )
  ),
  consolidated_slots AS (
    SELECT
      date,
      start_time,
      LEAD(start_time, 1, end_time) OVER (PARTITION BY date ORDER BY start_time) AS end_time,
      CASE
        WHEN LEAD(start_time, 1) OVER (PARTITION BY date ORDER BY start_time) = end_time
        THEN 0
        ELSE 1
      END AS slot_break
    FROM
      available_slots
  ),
  grouped_slots AS (
    SELECT
      date,
      start_time,
      end_time,
      SUM(slot_break) OVER (PARTITION BY date ORDER BY start_time) AS slot_group
    FROM
      consolidated_slots
  )
  SELECT
    date,
    MIN(start_time) AS start_time,
    MAX(end_time) AS end_time
  FROM
    grouped_slots
  GROUP BY
    date, slot_group
  ORDER BY
    date, start_time;
END;
$$ LANGUAGE plpgsql;
