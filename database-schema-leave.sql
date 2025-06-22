-- Add leave table to existing database without deleting any data
-- This script is safe to run on existing databases

-- Create leave table
CREATE TABLE IF NOT EXISTS leave (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Ensure end_date is not before start_date
    CONSTRAINT leave_date_order CHECK (end_date >= start_date)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leave_person_id ON leave(person_id);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON leave(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_created_at ON leave(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE leave ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
-- (You might want to make this more restrictive based on your auth setup)
CREATE POLICY "Allow all operations for authenticated users" ON leave
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leave_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leave_updated_at
    BEFORE UPDATE ON leave
    FOR EACH ROW
    EXECUTE FUNCTION update_leave_updated_at(); 