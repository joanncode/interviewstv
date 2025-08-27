-- Sample data for testing admin management features
-- This will populate the database with users, interviews, and content for testing

-- Insert sample users with different roles
INSERT INTO users (name, email, password, role, email_verified, created_at, updated_at) VALUES
('Admin User', 'admin@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1, NOW(), NOW()),
('John Creator', 'john@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'creator', 1, NOW(), NOW()),
('Sarah Interviewer', 'sarah@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1, NOW(), NOW()),
('Mike Business', 'mike@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1, NOW(), NOW()),
('Lisa Tech', 'lisa@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1, NOW(), NOW()),
('David Sports', 'david@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 0, NOW(), NOW()),
('Emma Artist', 'emma@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1, NOW(), NOW()),
('Tom Politician', 'tom@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1, NOW(), NOW()),
('Anna Health', 'anna@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1, NOW(), NOW()),
('Chris Education', 'chris@interviews.tv', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1, NOW(), NOW());

-- Insert sample interviews with various statuses and types
INSERT INTO interviews (title, description, type, status, category, interviewer_id, featured, moderation_status, views, likes, created_at, updated_at) VALUES
('Building a Tech Startup from Scratch', 'An in-depth conversation about the challenges and rewards of starting a technology company in today''s competitive market.', 'video', 'published', 'technology', 2, 1, 'approved', 1250, 89, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW()),
('The Future of Sustainable Business', 'Exploring how businesses can adapt to environmental challenges while maintaining profitability.', 'video', 'published', 'business', 3, 1, 'approved', 2100, 156, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW()),
('Mental Health in the Workplace', 'A candid discussion about mental health awareness and support systems in modern workplaces.', 'audio', 'published', 'health', 4, 0, 'approved', 890, 67, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW()),
('Olympic Training Secrets', 'Behind the scenes look at what it takes to train for the Olympics and compete at the highest level.', 'video', 'published', 'sports', 5, 1, 'approved', 3200, 245, DATE_SUB(NOW(), INTERVAL 7 DAY), NOW()),
('Digital Art Revolution', 'How digital tools are transforming the art world and creating new opportunities for artists.', 'video', 'draft', 'entertainment', 6, 0, 'pending', 0, 0, DATE_SUB(NOW(), INTERVAL 1 HOUR), NOW()),
('Climate Policy and Politics', 'A deep dive into environmental policy making and the political challenges of climate action.', 'audio', 'published', 'politics', 7, 0, 'flagged', 1500, 78, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW()),
('Nutrition Myths Debunked', 'Separating fact from fiction in the world of nutrition and healthy eating.', 'text', 'published', 'health', 8, 0, 'approved', 750, 45, DATE_SUB(NOW(), INTERVAL 4 DAY), NOW()),
('Teaching in the Digital Age', 'How educators are adapting to technology and remote learning challenges.', 'video', 'private', 'education', 9, 0, 'pending', 120, 8, DATE_SUB(NOW(), INTERVAL 6 HOUR), NOW()),
('Entrepreneurship Journey', 'From idea to IPO: A complete guide to building a successful business.', 'video', 'published', 'business', 3, 0, 'approved', 1800, 134, DATE_SUB(NOW(), INTERVAL 8 DAY), NOW()),
('AI and the Future of Work', 'Exploring how artificial intelligence will reshape jobs and industries.', 'audio', 'published', 'technology', 2, 1, 'approved', 2800, 198, DATE_SUB(NOW(), INTERVAL 10 DAY), NOW()),
('Fitness for Busy Professionals', 'Quick and effective workout routines for people with demanding schedules.', 'video', 'draft', 'health', 8, 0, 'pending', 0, 0, DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW()),
('Modern Art Movements', 'Understanding contemporary art trends and their cultural significance.', 'text', 'published', 'entertainment', 6, 0, 'approved', 650, 42, DATE_SUB(NOW(), INTERVAL 12 DAY), NOW()),
('Local Politics Matter', 'Why community involvement in local government is crucial for democracy.', 'audio', 'published', 'politics', 7, 0, 'approved', 920, 56, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW()),
('Startup Funding Strategies', 'Different approaches to raising capital for your business venture.', 'video', 'published', 'business', 4, 0, 'rejected', 450, 23, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW()),
('Gaming Industry Insights', 'Behind the scenes of game development and the entertainment industry.', 'video', 'archived', 'entertainment', 5, 0, 'approved', 1100, 87, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW());

-- Insert sample content flags for testing moderation
INSERT INTO content_flags (content_id, content_type, reporter_id, reason, description, status, created_at) VALUES
(6, 'interview', 5, 'inappropriate_content', 'Contains controversial political statements that may violate community guidelines.', 'pending', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(6, 'interview', 8, 'misinformation', 'Some claims made in this interview appear to be factually incorrect.', 'pending', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(14, 'interview', 3, 'spam', 'This content appears to be promotional rather than educational.', 'resolved', DATE_SUB(NOW(), INTERVAL 10 DAY));

-- Insert sample comments for testing
INSERT INTO comments (interview_id, user_id, content, status, created_at) VALUES
(1, 3, 'Great insights on startup challenges! Really helpful for aspiring entrepreneurs.', 'approved', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, 4, 'Would love to see a follow-up interview about scaling strategies.', 'approved', DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(2, 5, 'Sustainability is so important. Thanks for covering this topic!', 'approved', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 6, 'This changed my perspective on business responsibility.', 'approved', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, 7, 'Amazing to see what Olympic athletes go through. Incredible dedication!', 'approved', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(4, 8, 'The training regimen described here is intense but inspiring.', 'approved', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(10, 2, 'AI is definitely going to change everything. Great discussion!', 'approved', DATE_SUB(NOW(), INTERVAL 9 DAY)),
(10, 9, 'I''m both excited and worried about AI''s impact on jobs.', 'pending', DATE_SUB(NOW(), INTERVAL 8 DAY));

-- Insert sample businesses for testing business management
INSERT INTO businesses (name, description, category, website_url, owner_id, status, featured, created_at, updated_at) VALUES
('TechStart Solutions', 'Innovative software development company specializing in AI and machine learning solutions.', 'technology', 'https://techstart.example.com', 2, 'active', 1, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW()),
('Green Future Consulting', 'Environmental consulting firm helping businesses transition to sustainable practices.', 'consulting', 'https://greenfuture.example.com', 3, 'active', 1, DATE_SUB(NOW(), INTERVAL 45 DAY), NOW()),
('Wellness Works', 'Corporate wellness programs and mental health support services.', 'health', 'https://wellnessworks.example.com', 8, 'active', 0, DATE_SUB(NOW(), INTERVAL 20 DAY), NOW()),
('Elite Sports Training', 'Professional athletic training and performance optimization center.', 'sports', 'https://elitesports.example.com', 5, 'pending', 0, DATE_SUB(NOW(), INTERVAL 10 DAY), NOW()),
('Creative Digital Studio', 'Full-service digital art and design studio for modern brands.', 'creative', 'https://creativedigital.example.com', 6, 'active', 0, DATE_SUB(NOW(), INTERVAL 25 DAY), NOW());

-- Insert sample security events for testing security dashboard
INSERT INTO security_events (event_type, severity, description, ip_address, user_id, created_at) VALUES
('failed_login', 'medium', 'Multiple failed login attempts detected', '192.168.1.100', NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('suspicious_activity', 'high', 'Unusual access pattern detected for user account', '10.0.0.50', 6, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
('content_flag', 'low', 'Content flagged by community member', '172.16.0.25', 5, DATE_SUB(NOW(), INTERVAL 1 DAY)),
('admin_action', 'medium', 'Admin user performed bulk content moderation', '192.168.1.10', 1, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('failed_login', 'medium', 'Failed admin login attempt', '203.0.113.15', NULL, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
('data_export', 'high', 'Large data export performed by admin user', '192.168.1.10', 1, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Insert sample moderation history
INSERT INTO moderation_history (content_id, content_type, moderator_id, action, reason, notes, created_at) VALUES
(1, 'interview', 1, 'approve', 'quality_content', 'High-quality educational content that meets community standards.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'interview', 1, 'approve', 'quality_content', 'Excellent discussion on important business topic.', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(6, 'interview', 1, 'flag', 'review_needed', 'Flagged for review due to controversial political content.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(14, 'interview', 1, 'reject', 'promotional_content', 'Content appears to be primarily promotional rather than educational.', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(15, 'interview', 1, 'archive', 'outdated_content', 'Content is outdated and no longer relevant.', DATE_SUB(NOW(), INTERVAL 30 DAY));

-- Update user profiles with additional information
UPDATE users SET 
    bio = CASE 
        WHEN id = 1 THEN 'Platform administrator with extensive experience in content management and community building.'
        WHEN id = 2 THEN 'Tech entrepreneur and startup founder passionate about innovation and technology.'
        WHEN id = 3 THEN 'Business consultant specializing in sustainable practices and environmental responsibility.'
        WHEN id = 4 THEN 'Business development professional with expertise in corporate wellness and mental health.'
        WHEN id = 5 THEN 'Former Olympic athlete turned sports performance coach and trainer.'
        WHEN id = 6 THEN 'Digital artist and creative director exploring the intersection of technology and art.'
        WHEN id = 7 THEN 'Political analyst and policy researcher focused on environmental and social issues.'
        WHEN id = 8 THEN 'Registered dietitian and nutrition educator debunking health myths.'
        WHEN id = 9 THEN 'Educator and technology integration specialist helping teachers adapt to digital learning.'
        WHEN id = 10 THEN 'Education technology researcher studying the impact of digital tools on learning.'
    END,
    location = CASE 
        WHEN id = 1 THEN 'San Francisco, CA'
        WHEN id = 2 THEN 'Austin, TX'
        WHEN id = 3 THEN 'Portland, OR'
        WHEN id = 4 THEN 'New York, NY'
        WHEN id = 5 THEN 'Denver, CO'
        WHEN id = 6 THEN 'Los Angeles, CA'
        WHEN id = 7 THEN 'Washington, DC'
        WHEN id = 8 THEN 'Boston, MA'
        WHEN id = 9 THEN 'Chicago, IL'
        WHEN id = 10 THEN 'Seattle, WA'
    END
WHERE id BETWEEN 1 AND 10;
