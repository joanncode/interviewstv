-- Migration: Add privacy settings to users table
-- Date: 2025-08-20
-- Description: Add profile visibility, interview visibility, and activity visibility settings

-- Add privacy columns to users table
ALTER TABLE users 
ADD COLUMN profile_visibility ENUM('public', 'followers', 'private') DEFAULT 'public' COMMENT 'Profile visibility setting',
ADD COLUMN interview_visibility ENUM('public', 'followers', 'private') DEFAULT 'public' COMMENT 'Interview visibility setting',
ADD COLUMN activity_visibility ENUM('public', 'followers', 'private') DEFAULT 'followers' COMMENT 'Activity visibility setting';

-- Add index for privacy queries
ALTER TABLE users ADD INDEX idx_profile_visibility (profile_visibility);
ALTER TABLE users ADD INDEX idx_interview_visibility (interview_visibility);

-- Update existing users to have default privacy settings
UPDATE users SET 
    profile_visibility = 'public',
    interview_visibility = 'public', 
    activity_visibility = 'followers'
WHERE profile_visibility IS NULL 
   OR interview_visibility IS NULL 
   OR activity_visibility IS NULL;
