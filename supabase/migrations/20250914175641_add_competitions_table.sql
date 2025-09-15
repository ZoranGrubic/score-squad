-- Migration: add_competitions_table
-- Description: Create competitions table with external ID, name, code, type, emblem, and plan fields
-- Created: 2024-09-14

-- Create competitions table
CREATE TABLE public.competitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id TEXT UNIQUE,
    name TEXT NOT NULL,
    code TEXT,
    type TEXT,
    emblem TEXT,
    plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitions
CREATE POLICY "Anyone can view competitions" ON public.competitions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create competitions" ON public.competitions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update competitions" ON public.competitions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_competitions_external_id ON public.competitions(external_id);
CREATE INDEX idx_competitions_name ON public.competitions(name);
CREATE INDEX idx_competitions_code ON public.competitions(code);
CREATE INDEX idx_competitions_type ON public.competitions(type);

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON public.competitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.competitions IS 'Table for storing competition information';
COMMENT ON COLUMN public.competitions.id IS 'Unique Supabase UUID identifier';
COMMENT ON COLUMN public.competitions.external_id IS 'External system identifier';
COMMENT ON COLUMN public.competitions.name IS 'Competition name';
COMMENT ON COLUMN public.competitions.code IS 'Competition code';
COMMENT ON COLUMN public.competitions.type IS 'Competition type';
COMMENT ON COLUMN public.competitions.emblem IS 'Competition emblem/logo';
COMMENT ON COLUMN public.competitions.plan IS 'Competition plan/structure';