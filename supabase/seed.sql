-- Seed: 001_sample_data
-- Description: Sample data for Score Squad application
-- Created: 2024-01-15

-- Insert sample games
INSERT INTO public.games (name, description, min_players, max_players, created_by) VALUES
('Chess', 'Classic strategy board game', 2, 2, (SELECT id FROM public.profiles LIMIT 1)),
('Poker', 'Card game with betting', 2, 10, (SELECT id FROM public.profiles LIMIT 1)),
('Scrabble', 'Word formation board game', 2, 4, (SELECT id FROM public.profiles LIMIT 1)),
('Uno', 'Popular card game', 2, 10, (SELECT id FROM public.profiles LIMIT 1)),
('Risk', 'Strategy board game of world domination', 2, 6, (SELECT id FROM public.profiles LIMIT 1)),
('Monopoly', 'Real estate board game', 2, 8, (SELECT id FROM public.profiles LIMIT 1)),
('Catan', 'Resource management and trading game', 3, 4, (SELECT id FROM public.profiles LIMIT 1)),
('Ticket to Ride', 'Railway-themed board game', 2, 5, (SELECT id FROM public.profiles LIMIT 1))
ON CONFLICT DO NOTHING;

-- Note: User-specific data will be inserted after users register
-- This is because we need actual user IDs from auth.users table