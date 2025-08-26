-- Default categories for Interviews.tv
-- Insert default interview categories

INSERT INTO categories (name, slug, description, type, color, icon, sort_order, is_active, meta_title, meta_description) VALUES
-- Main Interview Categories
('Technology', 'technology', 'Interviews about technology, software development, AI, and digital innovation', 'interview', '#007bff', 'fas fa-laptop-code', 1, TRUE, 'Technology Interviews', 'Discover insights from tech leaders, developers, and innovators in the technology industry'),

('Business', 'business', 'Entrepreneurship, startups, leadership, and business strategy interviews', 'interview', '#28a745', 'fas fa-briefcase', 2, TRUE, 'Business Interviews', 'Learn from successful entrepreneurs, CEOs, and business leaders about strategy and growth'),

('Health & Wellness', 'health-wellness', 'Medical professionals, fitness experts, and wellness coaches sharing insights', 'interview', '#dc3545', 'fas fa-heartbeat', 3, TRUE, 'Health & Wellness Interviews', 'Expert advice on health, fitness, mental wellness, and medical breakthroughs'),

('Education', 'education', 'Teachers, researchers, and educational leaders discussing learning and development', 'interview', '#ffc107', 'fas fa-graduation-cap', 4, TRUE, 'Education Interviews', 'Insights from educators, researchers, and thought leaders in learning and development'),

('Arts & Culture', 'arts-culture', 'Artists, musicians, writers, and cultural figures sharing their creative journey', 'interview', '#6f42c1', 'fas fa-palette', 5, TRUE, 'Arts & Culture Interviews', 'Creative insights from artists, musicians, writers, and cultural innovators'),

('Science', 'science', 'Scientists, researchers, and academics discussing discoveries and innovations', 'interview', '#17a2b8', 'fas fa-microscope', 6, TRUE, 'Science Interviews', 'Cutting-edge research and discoveries from leading scientists and researchers'),

('Sports', 'sports', 'Athletes, coaches, and sports professionals sharing their experiences', 'interview', '#fd7e14', 'fas fa-running', 7, TRUE, 'Sports Interviews', 'Stories and insights from professional athletes, coaches, and sports industry leaders'),

('Politics & Society', 'politics-society', 'Political leaders, activists, and social commentators on current affairs', 'interview', '#6c757d', 'fas fa-balance-scale', 8, TRUE, 'Politics & Society Interviews', 'Discussions on politics, social issues, and current affairs with thought leaders'),

('Finance', 'finance', 'Financial experts, investors, and economists discussing markets and money', 'interview', '#20c997', 'fas fa-chart-line', 9, TRUE, 'Finance Interviews', 'Financial insights from investors, economists, and market experts'),

('Lifestyle', 'lifestyle', 'Personal development, travel, food, and lifestyle content creators', 'interview', '#e83e8c', 'fas fa-heart', 10, TRUE, 'Lifestyle Interviews', 'Personal stories and advice on lifestyle, travel, food, and personal development'),

-- Subcategories for Technology
('Web Development', 'web-development', 'Frontend, backend, and full-stack web development', 'interview', '#007bff', 'fas fa-code', 11, TRUE, 'Web Development Interviews', 'Insights from web developers on modern frameworks, tools, and best practices'),

('Artificial Intelligence', 'artificial-intelligence', 'AI researchers, machine learning engineers, and data scientists', 'interview', '#007bff', 'fas fa-robot', 12, TRUE, 'AI Interviews', 'Cutting-edge discussions on artificial intelligence, machine learning, and data science'),

('Cybersecurity', 'cybersecurity', 'Security experts, ethical hackers, and privacy advocates', 'interview', '#007bff', 'fas fa-shield-alt', 13, TRUE, 'Cybersecurity Interviews', 'Security insights from experts in cybersecurity, privacy, and digital protection'),

-- Subcategories for Business
('Startups', 'startups', 'Startup founders, venture capitalists, and early-stage entrepreneurs', 'interview', '#28a745', 'fas fa-rocket', 14, TRUE, 'Startup Interviews', 'Stories and advice from startup founders and entrepreneurs building the future'),

('Marketing', 'marketing', 'Marketing professionals, brand strategists, and growth hackers', 'interview', '#28a745', 'fas fa-bullhorn', 15, TRUE, 'Marketing Interviews', 'Marketing strategies and insights from industry professionals and thought leaders'),

('Leadership', 'leadership', 'CEOs, managers, and leadership coaches on effective management', 'interview', '#28a745', 'fas fa-users', 16, TRUE, 'Leadership Interviews', 'Leadership wisdom from executives, managers, and organizational development experts'),

-- Gallery Categories
('Behind the Scenes', 'behind-scenes', 'Behind the scenes photos and videos from interviews', 'gallery', '#6c757d', 'fas fa-camera', 1, TRUE, 'Behind the Scenes Gallery', 'Exclusive behind-the-scenes content from our interview productions'),

('Event Photos', 'event-photos', 'Photos from live events, conferences, and meetups', 'gallery', '#6c757d', 'fas fa-images', 2, TRUE, 'Event Photos', 'Photo galleries from live events, conferences, and special occasions'),

('Studio Sessions', 'studio-sessions', 'Professional photos from studio interview sessions', 'gallery', '#6c757d', 'fas fa-video', 3, TRUE, 'Studio Sessions', 'Professional photography from our studio interview sessions'),

-- Event Categories
('Conferences', 'conferences', 'Industry conferences and professional gatherings', 'event', '#17a2b8', 'fas fa-users', 1, TRUE, 'Conferences', 'Industry conferences, summits, and professional networking events'),

('Workshops', 'workshops', 'Educational workshops and training sessions', 'event', '#17a2b8', 'fas fa-chalkboard-teacher', 2, TRUE, 'Workshops', 'Hands-on workshops and educational training sessions'),

('Networking', 'networking', 'Networking events and community meetups', 'event', '#17a2b8', 'fas fa-handshake', 3, TRUE, 'Networking Events', 'Professional networking events and community meetups'),

('Webinars', 'webinars', 'Online webinars and virtual events', 'event', '#17a2b8', 'fas fa-desktop', 4, TRUE, 'Webinars', 'Online webinars, virtual events, and digital conferences'),

-- Business Categories
('Consulting', 'consulting', 'Professional consulting and advisory services', 'business', '#28a745', 'fas fa-handshake', 1, TRUE, 'Consulting Services', 'Professional consulting and advisory services across various industries'),

('Software', 'software', 'Software development companies and tech services', 'business', '#28a745', 'fas fa-laptop-code', 2, TRUE, 'Software Companies', 'Software development companies and technology service providers'),

('Healthcare', 'healthcare', 'Healthcare providers, clinics, and medical services', 'business', '#28a745', 'fas fa-hospital', 3, TRUE, 'Healthcare Providers', 'Healthcare providers, medical clinics, and health service organizations'),

('Education Services', 'education-services', 'Educational institutions and training providers', 'business', '#28a745', 'fas fa-school', 4, TRUE, 'Education Services', 'Educational institutions, training providers, and learning organizations'),

('Creative Services', 'creative-services', 'Design agencies, marketing firms, and creative studios', 'business', '#28a745', 'fas fa-paint-brush', 5, TRUE, 'Creative Services', 'Design agencies, marketing firms, and creative service providers');

-- Update parent relationships for subcategories
UPDATE categories SET parent_id = (SELECT id FROM categories c2 WHERE c2.slug = 'technology' LIMIT 1) 
WHERE slug IN ('web-development', 'artificial-intelligence', 'cybersecurity');

UPDATE categories SET parent_id = (SELECT id FROM categories c2 WHERE c2.slug = 'business' LIMIT 1) 
WHERE slug IN ('startups', 'marketing', 'leadership');
