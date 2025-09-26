-- Add cocktail system tables and columns for US-focused book-themed drinks

-- Add cocktail-related columns to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'zip_code') THEN
        ALTER TABLE profiles ADD COLUMN zip_code VARCHAR(10);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age_verified') THEN
        ALTER TABLE profiles ADD COLUMN age_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age_verification_date') THEN
        ALTER TABLE profiles ADD COLUMN age_verification_date TIMESTAMP;
    END IF;
END $$;

-- Create cocktails table to store generated cocktail recipes
CREATE TABLE IF NOT EXISTS cocktails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('alcoholic', 'non_alcoholic')),
    description TEXT,
    theme_explanation TEXT NOT NULL, -- Why this cocktail fits the book
    theme_aspect VARCHAR(50) NOT NULL CHECK (theme_aspect IN ('title', 'characters', 'plot', 'setting', 'mood')),
    ingredients JSONB NOT NULL, -- Array of ingredient objects
    instructions TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    prep_time_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW(),
    refresh_session_id UUID, -- Track which refresh session this belongs to
    is_favorited BOOLEAN DEFAULT FALSE
);

-- Create indexes for cocktails table
CREATE INDEX IF NOT EXISTS idx_cocktails_book_user ON cocktails(book_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cocktails_refresh_session ON cocktails(refresh_session_id);
CREATE INDEX IF NOT EXISTS idx_cocktails_created_at ON cocktails(created_at);
CREATE INDEX IF NOT EXISTS idx_cocktails_favorited ON cocktails(user_id, is_favorited) WHERE is_favorited = TRUE;

-- Create US stores table for store locator functionality
CREATE TABLE IF NOT EXISTS us_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    chain VARCHAR(100) NOT NULL, -- 'target', 'walmart', 'kroger', 'bevmo', etc.
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL, -- US state abbreviation
    zip_code VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    website_url TEXT,
    supports_alcohol BOOLEAN DEFAULT TRUE,
    supports_delivery BOOLEAN DEFAULT FALSE,
    supports_pickup BOOLEAN DEFAULT TRUE,
    api_integration BOOLEAN DEFAULT FALSE, -- Whether we can populate cart via API
    cart_base_url TEXT, -- Base URL for cart population
    hours JSONB, -- Store hours by day of week
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for us_stores table
CREATE INDEX IF NOT EXISTS idx_us_stores_location ON us_stores(state, zip_code);
CREATE INDEX IF NOT EXISTS idx_us_stores_chain ON us_stores(chain);
CREATE INDEX IF NOT EXISTS idx_us_stores_coordinates ON us_stores(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_us_stores_alcohol ON us_stores(supports_alcohol) WHERE supports_alcohol = TRUE;

-- Create cocktail refresh sessions table to track user refresh history
CREATE TABLE IF NOT EXISTS cocktail_refresh_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    session_start TIMESTAMP DEFAULT NOW(),
    refresh_count INTEGER DEFAULT 0,
    last_theme_aspect VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for refresh sessions
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_book ON cocktail_refresh_sessions(user_id, book_id);

-- Create cocktail ingredients table for ingredient management
CREATE TABLE IF NOT EXISTS cocktail_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL, -- 'spirit', 'liqueur', 'mixer', 'garnish', 'tool'
    alcohol_content DECIMAL(5,2), -- ABV percentage for alcoholic ingredients
    common_brands JSONB, -- Array of common brand names
    substitutes JSONB, -- Array of possible substitutes
    average_price_usd DECIMAL(8,2), -- Average price in USD
    is_alcoholic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for ingredients
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON cocktail_ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_alcoholic ON cocktail_ingredients(is_alcoholic);

-- Insert some common cocktail ingredients
INSERT INTO cocktail_ingredients (name, category, alcohol_content, is_alcoholic, common_brands, average_price_usd) VALUES
('Vodka', 'spirit', 40.0, TRUE, '["Tito''s", "Grey Goose", "Absolut", "Smirnoff"]', 25.00),
('Gin', 'spirit', 40.0, TRUE, '["Tanqueray", "Bombay Sapphire", "Hendrick''s", "Beefeater"]', 28.00),
('Whiskey', 'spirit', 40.0, TRUE, '["Jack Daniel''s", "Jameson", "Bulleit", "Maker''s Mark"]', 30.00),
('Rum', 'spirit', 40.0, TRUE, '["Bacardi", "Captain Morgan", "Mount Gay", "Appleton Estate"]', 22.00),
('Tequila', 'spirit', 40.0, TRUE, '["Jose Cuervo", "Patron", "Don Julio", "Herradura"]', 35.00),
('Triple Sec', 'liqueur', 30.0, TRUE, '["Cointreau", "Grand Marnier", "Bols", "DeKuyper"]', 18.00),
('Simple Syrup', 'mixer', 0.0, FALSE, '["Homemade", "Monin", "Torani"]', 8.00),
('Lime Juice', 'mixer', 0.0, FALSE, '["Fresh", "Rose''s", "ReaLime"]', 3.00),
('Lemon Juice', 'mixer', 0.0, FALSE, '["Fresh", "ReaLemon"]', 3.00),
('Club Soda', 'mixer', 0.0, FALSE, '["Schweppes", "Canada Dry", "LaCroix"]', 5.00),
('Ginger Beer', 'mixer', 0.0, FALSE, '["Fever-Tree", "Bundaberg", "Reed''s"]', 8.00),
('Angostura Bitters', 'mixer', 44.7, TRUE, '["Angostura", "Fee Brothers"]', 12.00),
('Orange Peel', 'garnish', 0.0, FALSE, '["Fresh"]', 2.00),
('Lime Wedge', 'garnish', 0.0, FALSE, '["Fresh"]', 2.00),
('Maraschino Cherry', 'garnish', 0.0, FALSE, '["Luxardo", "Maraschino"]', 15.00)
ON CONFLICT (name) DO NOTHING;

-- Insert some major US store chains
INSERT INTO us_stores (name, chain, address, city, state, zip_code, supports_alcohol, supports_delivery, supports_pickup, website_url) VALUES
('Target Store', 'target', '123 Main St', 'Los Angeles', 'CA', '90210', TRUE, TRUE, TRUE, 'https://www.target.com'),
('Walmart Supercenter', 'walmart', '456 Oak Ave', 'Houston', 'TX', '77001', TRUE, TRUE, TRUE, 'https://www.walmart.com'),
('Kroger', 'kroger', '789 Pine St', 'Atlanta', 'GA', '30309', TRUE, TRUE, TRUE, 'https://www.kroger.com'),
('BevMo!', 'bevmo', '321 Elm St', 'San Francisco', 'CA', '94102', TRUE, TRUE, TRUE, 'https://www.bevmo.com'),
('Total Wine & More', 'total_wine', '654 Cedar Rd', 'Miami', 'FL', '33101', TRUE, FALSE, TRUE, 'https://www.totalwine.com')
ON CONFLICT DO NOTHING;

-- Create RLS policies for cocktails table
ALTER TABLE cocktails ENABLE ROW LEVEL SECURITY;

-- Users can view their own cocktails
CREATE POLICY "Users can view their own cocktails" ON cocktails
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own cocktails
CREATE POLICY "Users can insert their own cocktails" ON cocktails
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own cocktails (for favoriting)
CREATE POLICY "Users can update their own cocktails" ON cocktails
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own cocktails
CREATE POLICY "Users can delete their own cocktails" ON cocktails
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for refresh sessions
ALTER TABLE cocktail_refresh_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own refresh sessions" ON cocktail_refresh_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Public read access for stores and ingredients (no RLS needed)
-- us_stores and cocktail_ingredients are public reference data

-- Create function to clean up old cocktail data (optional cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_cocktails()
RETURNS void AS $$
BEGIN
    -- Delete cocktails older than 30 days that aren't favorited
    DELETE FROM cocktails 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND is_favorited = FALSE;
    
    -- Delete old refresh sessions older than 7 days
    DELETE FROM cocktail_refresh_sessions 
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON cocktails TO authenticated;
GRANT ALL ON cocktail_refresh_sessions TO authenticated;
GRANT SELECT ON us_stores TO authenticated;
GRANT SELECT ON cocktail_ingredients TO authenticated;
