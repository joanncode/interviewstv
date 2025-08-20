-- Events tables migration
-- This file creates the necessary tables for the events module

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    promoter_id BIGINT UNSIGNED NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    location VARCHAR(255),
    is_virtual BOOLEAN DEFAULT FALSE,
    event_type ENUM('conference', 'workshop', 'webinar', 'meetup', 'festival', 'interview', 'general') DEFAULT 'general',
    max_attendees INT UNSIGNED,
    registration_required BOOLEAN DEFAULT FALSE,
    registration_deadline DATETIME,
    ticket_price DECIMAL(10,2),
    event_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    tags JSON,
    status ENUM('draft', 'active', 'cancelled', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (promoter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create event_attendees table for RSVP functionality
CREATE TABLE IF NOT EXISTS event_attendees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'waitlist') DEFAULT 'pending',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_attendee (event_id, user_id)
);

-- Create event_sessions table for multi-session events
CREATE TABLE IF NOT EXISTS event_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    speaker_name VARCHAR(255),
    speaker_bio TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    location VARCHAR(255),
    is_virtual BOOLEAN DEFAULT FALSE,
    session_url VARCHAR(500),
    max_attendees INT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Create event_session_attendees table for session-specific attendance
CREATE TABLE IF NOT EXISTS event_session_attendees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('registered', 'attended', 'no_show') DEFAULT 'registered',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES event_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_attendee (session_id, user_id)
);

-- Create event_sponsors table for event sponsorship
CREATE TABLE IF NOT EXISTS event_sponsors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT UNSIGNED NOT NULL,
    business_id BIGINT UNSIGNED,
    sponsor_name VARCHAR(255) NOT NULL,
    sponsor_logo_url VARCHAR(500),
    sponsor_website VARCHAR(500),
    sponsor_level ENUM('title', 'platinum', 'gold', 'silver', 'bronze', 'supporter') DEFAULT 'supporter',
    sponsor_description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
);

-- Create event_media table for event photos/videos
CREATE TABLE IF NOT EXISTS event_media (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT UNSIGNED NOT NULL,
    media_type ENUM('image', 'video') NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    title VARCHAR(255),
    description TEXT,
    uploaded_by BIGINT UNSIGNED,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create event_notifications table for event-related notifications
CREATE TABLE IF NOT EXISTS event_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT UNSIGNED NOT NULL,
    notification_type ENUM('reminder', 'update', 'cancellation', 'start', 'end') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    send_at DATETIME NOT NULL,
    sent_at DATETIME,
    recipient_type ENUM('all_attendees', 'confirmed_attendees', 'waitlist', 'specific_users') DEFAULT 'confirmed_attendees',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Create event_feedback table for post-event feedback
CREATE TABLE IF NOT EXISTS event_feedback (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    would_recommend BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_feedback (event_id, user_id)
);

-- Add event_id column to interviews table if it doesn't exist
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS event_id BIGINT UNSIGNED,
ADD FOREIGN KEY IF NOT EXISTS fk_interview_event (event_id) REFERENCES events(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE FULLTEXT INDEX IF NOT EXISTS idx_event_search ON events(title, description);
CREATE INDEX IF NOT EXISTS idx_events_promoter ON events(promoter_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_virtual ON events(is_virtual);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(status);

CREATE INDEX IF NOT EXISTS idx_event_sessions_event ON event_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sessions_start_time ON event_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_event_session_attendees_session ON event_session_attendees(session_id);
CREATE INDEX IF NOT EXISTS idx_event_session_attendees_user ON event_session_attendees(user_id);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event ON event_sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_business ON event_sponsors(business_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_level ON event_sponsors(sponsor_level);

CREATE INDEX IF NOT EXISTS idx_event_media_event ON event_media(event_id);
CREATE INDEX IF NOT EXISTS idx_event_media_type ON event_media(media_type);

CREATE INDEX IF NOT EXISTS idx_event_notifications_event ON event_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_send_at ON event_notifications(send_at);

CREATE INDEX IF NOT EXISTS idx_event_feedback_event ON event_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_rating ON event_feedback(rating);

CREATE INDEX IF NOT EXISTS idx_interviews_event ON interviews(event_id);
