-- Business tables migration
-- This file creates the necessary tables for the business module

-- Update businesses table with additional fields
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS hours JSON,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Create index for business search
CREATE FULLTEXT INDEX IF NOT EXISTS idx_business_search ON businesses(name, description);

-- Create business_interviews junction table
CREATE TABLE IF NOT EXISTS business_interviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    interview_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
    UNIQUE KEY unique_business_interview (business_id, interview_id)
);

-- Create business_reviews table for ratings and reviews
CREATE TABLE IF NOT EXISTS business_reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_business_review (user_id, business_id)
);

-- Create business_events table for business-hosted events
CREATE TABLE IF NOT EXISTS business_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    event_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE KEY unique_business_event (business_id, event_id)
);

-- Create business_promotions table for promotional content
CREATE TABLE IF NOT EXISTS business_promotions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    promotion_type ENUM('discount', 'event', 'announcement', 'special_offer') NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Create business_followers table for users following businesses
CREATE TABLE IF NOT EXISTS business_followers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_business_follower (business_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_industry ON businesses(industry);
CREATE INDEX IF NOT EXISTS idx_business_verified ON businesses(verified);
CREATE INDEX IF NOT EXISTS idx_business_owner ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_interviews_business ON business_interviews(business_id);
CREATE INDEX IF NOT EXISTS idx_business_interviews_interview ON business_interviews(interview_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_business ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_rating ON business_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_business_events_business ON business_events(business_id);
CREATE INDEX IF NOT EXISTS idx_business_promotions_business ON business_promotions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_promotions_active ON business_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_business_followers_business ON business_followers(business_id);
CREATE INDEX IF NOT EXISTS idx_business_followers_user ON business_followers(user_id);
