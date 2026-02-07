-- Create a table for players (e.g. for ranking)
CREATE TABLE players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL
  -- add other columns as needed
);

-- RLS: allow anyone to read players (public ranking)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
-- Add INSERT/UPDATE/DELETE policies if needed (e.g. only authenticated users).

-- Create a table for the games
CREATE TABLE games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  text TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Add Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own items
CREATE POLICY "Users can see their own items" ON games
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to create their own items
CREATE POLICY "Users can create their own items" ON games
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own items
CREATE POLICY "Users can update their own items" ON games
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own items
CREATE POLICY "Users can delete their own items" ON games
  FOR DELETE USING (auth.uid() = user_id);