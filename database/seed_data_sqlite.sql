-- Interviews.tv SQLite Initial Data Seeding
-- Populate database with initial users, businesses, and sample content

-- Insert predefined users (passwords are hashed versions of role123)
-- Password hash for 'admin123': $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- Password hash for 'creator123': $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- Password hash for 'business123': $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- Password hash for 'user123': $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

INSERT OR REPLACE INTO users (id, email, password_hash, name, role, bio, location, website, email_verified, is_active) VALUES
(1, 'admin@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin', 'Platform Administrator with full system access', 'San Francisco, CA', 'https://interviews.tv', 1, 1),
(2, 'creator@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Content Creator', 'creator', 'Professional content creator specializing in business interviews and storytelling', 'Los Angeles, CA', 'https://contentcreator.com', 1, 1),
(3, 'business@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Business Owner', 'business', 'Business profile manager and entrepreneur', 'New York, NY', 'https://mybusiness.com', 1, 1),
(4, 'user@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Regular User', 'user', 'Platform user interested in business content and interviews', 'Chicago, IL', NULL, 1, 1);

-- Insert user permissions
INSERT OR REPLACE INTO user_permissions (user_id, permission) VALUES
-- Admin permissions
(1, 'all'),
-- Creator permissions
(2, 'create_content'),
(2, 'manage_profile'),
(2, 'conduct_interviews'),
-- Business permissions
(3, 'manage_business'),
(3, 'manage_profile'),
(3, 'respond_interviews'),
-- User permissions
(4, 'view_content'),
(4, 'manage_profile');

-- Insert sample businesses
INSERT OR REPLACE INTO businesses (id, owner_id, name, slug, description, industry, location, website, email, phone, founded_year, employee_count, rating, total_reviews, is_verified, is_active) VALUES
(1, 3, 'TechStart Inc', 'techstart-inc', 'Innovative technology startup focused on AI and machine learning solutions for businesses.', 'Technology', 'San Francisco, CA', 'https://techstart.com', 'contact@techstart.com', '+1 (555) 123-4567', 2020, '11-50', 4.8, 15, 1, 1),
(2, 3, 'Green Eats Cafe', 'green-eats-cafe', 'Sustainable restaurant chain promoting organic, locally-sourced ingredients and eco-friendly practices.', 'Food & Beverage', 'Portland, OR', 'https://greeneats.com', 'hello@greeneats.com', '+1 (555) 234-5678', 2018, '51-200', 4.6, 28, 1, 1),
(3, 3, 'Creative Design Studio', 'creative-design-studio', 'Full-service design agency specializing in branding, web design, and digital marketing solutions.', 'Design', 'Austin, TX', 'https://creativedesign.com', 'info@creativedesign.com', '+1 (555) 345-6789', 2019, '1-10', 4.9, 12, 1, 1),
(4, 3, 'HealthPlus Clinic', 'healthplus-clinic', 'Comprehensive healthcare services with a focus on preventive care and patient wellness.', 'Healthcare', 'Austin, TX', 'https://healthplus.com', 'care@healthplus.com', '+1 (555) 456-7890', 2015, '201-500', 4.7, 45, 1, 1),
(5, 3, 'EduTech Solutions', 'edutech-solutions', 'Educational technology platform revolutionizing online learning for students and professionals.', 'Education', 'Boston, MA', 'https://edutech.com', 'learn@edutech.com', '+1 (555) 567-8901', 2021, '11-50', 4.3, 8, 1, 1),
(6, 3, 'Local Market Co', 'local-market-co', 'Community marketplace supporting local artisans and sustainable products.', 'Retail', 'Denver, CO', 'https://localmarket.com', 'shop@localmarket.com', '+1 (555) 678-9012', 2017, '1-10', 4.6, 22, 1, 1);

-- Insert sample interviews
INSERT OR REPLACE INTO interviews (id, creator_id, business_id, title, slug, description, category, thumbnail_url, duration_seconds, view_count, like_count, comment_count, is_featured, is_published, published_at) VALUES
(1, 2, 1, 'Tech CEO on AI Revolution', 'tech-ceo-ai-revolution', 'An insightful conversation about the future of artificial intelligence and its impact on business transformation.', 'Technology', 'https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Tech+CEO+Interview', 1800, 2100, 89, 12, 1, 1, '2024-01-15 10:00:00'),
(2, 2, 2, 'Local Artist Journey', 'local-artist-journey', 'From street art to gallery exhibitions - a compelling story of artistic growth and community impact.', 'Arts & Culture', 'https://via.placeholder.com/300x200/000000/FFFFFF?text=Artist+Story', 1500, 1500, 67, 8, 0, 1, '2024-01-10 14:30:00'),
(3, 2, 3, 'Startup Success Stories', 'startup-success-stories', 'Three entrepreneurs share their journey from idea to successful business, including failures and lessons learned.', 'Business', 'https://via.placeholder.com/300x200/28a745/FFFFFF?text=Entrepreneur+Tips', 2400, 3200, 124, 18, 1, 1, '2024-01-08 09:15:00'),
(4, 2, 4, 'Behind the Beats', 'behind-the-beats', 'Grammy-winning producer discusses the creative process and evolution of modern music production.', 'Music', 'https://via.placeholder.com/300x200/6f42c1/FFFFFF?text=Music+Producer', 2100, 4700, 203, 25, 0, 1, '2024-01-12 16:45:00'),
(5, 2, 5, 'Community Leadership', 'community-leadership', 'Local community leader shares insights on grassroots organizing and creating positive change.', 'Politics', 'https://via.placeholder.com/300x200/dc3545/FFFFFF?text=Community+Leader', 1650, 1800, 95, 14, 0, 1, '2024-01-11 11:20:00'),
(6, 2, 6, 'Culinary Adventures', 'culinary-adventures', 'Award-winning chef talks about culinary innovation, sustainability, and the future of dining.', 'Lifestyle', 'https://via.placeholder.com/300x200/fd7e14/FFFFFF?text=Chef+Stories', 1950, 2900, 156, 21, 0, 1, '2024-01-09 13:00:00');

-- Insert sample comments
INSERT OR REPLACE INTO comments (id, interview_id, user_id, content, like_count) VALUES
(1, 1, 4, 'Great insights on AI! Really helped me understand the business implications.', 5),
(2, 1, 3, 'As a business owner, this interview was incredibly valuable. Thank you!', 8),
(3, 2, 4, 'Inspiring story! Love seeing local artists succeed.', 3),
(4, 3, 4, 'The failure stories were just as valuable as the success ones. Real talk!', 12),
(5, 3, 1, 'Excellent content. We need more honest entrepreneurship discussions like this.', 7),
(6, 4, 4, 'The production techniques discussed here are game-changing!', 9),
(7, 5, 4, 'Community organizing is so important. Thanks for highlighting this work.', 4),
(8, 6, 4, 'Made me hungry and inspired to cook! Great interview.', 6);

-- Insert sample follows
INSERT OR REPLACE INTO follows (follower_id, following_id, following_type) VALUES
(4, 2, 'user'),  -- User follows Creator
(4, 1, 'business'),  -- User follows TechStart Inc
(4, 2, 'business'),  -- User follows Green Eats Cafe
(3, 2, 'user'),  -- Business owner follows Creator
(1, 2, 'user');  -- Admin follows Creator

-- Insert sample likes
INSERT OR REPLACE INTO likes (user_id, likeable_id, likeable_type) VALUES
(4, 1, 'interview'),  -- User likes interview 1
(4, 3, 'interview'),  -- User likes interview 3
(4, 4, 'interview'),  -- User likes interview 4
(3, 1, 'interview'),  -- Business owner likes interview 1
(3, 3, 'interview'),  -- Business owner likes interview 3
(1, 1, 'interview'),  -- Admin likes interview 1
(4, 1, 'comment'),    -- User likes comment 1
(3, 4, 'comment');    -- Business owner likes comment 4

-- Insert sample business reviews
INSERT OR REPLACE INTO business_reviews (business_id, user_id, rating, review_text) VALUES
(1, 4, 5, 'Excellent technology solutions and great customer service!'),
(2, 4, 5, 'Amazing food and commitment to sustainability. Highly recommended!'),
(3, 4, 5, 'Outstanding design work. They really understood our vision.'),
(4, 4, 5, 'Professional healthcare with a personal touch. Great experience.'),
(5, 4, 4, 'Good educational platform, still improving but very promising.'),
(6, 4, 5, 'Love supporting local artisans through this marketplace!');

-- Insert sample user settings
INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value) VALUES
(1, 'email_notifications', 'true'),
(1, 'push_notifications', 'true'),
(1, 'profile_visibility', 'public'),
(2, 'email_notifications', 'true'),
(2, 'push_notifications', 'false'),
(2, 'profile_visibility', 'public'),
(3, 'email_notifications', 'true'),
(3, 'push_notifications', 'true'),
(3, 'profile_visibility', 'public'),
(4, 'email_notifications', 'false'),
(4, 'push_notifications', 'false'),
(4, 'profile_visibility', 'public');

-- Insert sample interview requests
INSERT OR REPLACE INTO interview_requests (creator_id, business_id, subject, message, status, proposed_date) VALUES
(2, 1, 'Follow-up AI Interview', 'Would love to do a follow-up interview about your latest AI developments and market expansion plans.', 'pending', '2024-02-15 14:00:00'),
(2, 3, 'Design Process Deep Dive', 'Interested in exploring your creative process and how you work with clients to bring their visions to life.', 'accepted', '2024-02-20 10:30:00'),
(2, 5, 'EdTech Innovation', 'Would like to discuss the future of educational technology and your platform''s impact on learning outcomes.', 'pending', '2024-02-25 16:00:00');
