<?php

/**
 * Sample Content Seeder
 * 
 * Creates high-quality sample data to demonstrate platform capabilities
 * including users, interviews, businesses, and social interactions
 */

class SampleContentSeeder
{
    private $pdo;
    private $sampleUsers = [];
    private $sampleBusinesses = [];
    private $sampleInterviews = [];

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Run the complete sample data seeding process
     */
    public function run()
    {
        echo "🌱 Starting Sample Content Seeding...\n";
        
        $this->createSampleUsers();
        $this->createSampleBusinesses();
        $this->createSampleInterviews();
        $this->createSampleComments();
        $this->createSampleLikes();
        $this->createSampleFollows();
        $this->createSampleEvents();
        
        echo "✅ Sample Content Seeding Complete!\n";
        $this->printSummary();
    }

    /**
     * Create diverse sample users representing different personas
     */
    private function createSampleUsers()
    {
        echo "👥 Creating sample users...\n";

        $users = [
            [
                'name' => 'Sarah Chen',
                'email' => 'sarah.chen@example.com',
                'role' => 'creator',
                'bio' => 'Tech entrepreneur and startup advisor. Former VP of Engineering at TechCorp. Passionate about helping founders build scalable teams and products.',
                'location' => 'San Francisco, CA',
                'company' => 'Chen Ventures',
                'website' => 'https://sarahchen.com',
                'phone' => '+1-555-0101',
                'avatar_url' => 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'
            ],
            [
                'name' => 'Marcus Johnson',
                'email' => 'marcus.johnson@example.com',
                'role' => 'creator',
                'bio' => 'Award-winning documentary filmmaker and storyteller. 15+ years capturing human stories that matter. Emmy nominee for "Voices of Change" series.',
                'location' => 'New York, NY',
                'company' => 'Johnson Films',
                'website' => 'https://marcusjohnsonfilms.com',
                'phone' => '+1-555-0102',
                'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
            ],
            [
                'name' => 'Dr. Elena Rodriguez',
                'email' => 'elena.rodriguez@example.com',
                'role' => 'creator',
                'bio' => 'Clinical psychologist and bestselling author. Specializes in workplace mental health and leadership psychology. TEDx speaker with 2M+ views.',
                'location' => 'Austin, TX',
                'company' => 'MindWell Institute',
                'website' => 'https://drrodriguez.com',
                'phone' => '+1-555-0103',
                'avatar_url' => 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face'
            ],
            [
                'name' => 'James Mitchell',
                'email' => 'james.mitchell@example.com',
                'role' => 'business',
                'bio' => 'Serial entrepreneur and angel investor. Founded 3 successful startups, 2 exits. Now helping the next generation of entrepreneurs through mentorship.',
                'location' => 'Seattle, WA',
                'company' => 'Mitchell Capital',
                'website' => 'https://mitchellcapital.com',
                'phone' => '+1-555-0104',
                'avatar_url' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
            ],
            [
                'name' => 'Priya Patel',
                'email' => 'priya.patel@example.com',
                'role' => 'creator',
                'bio' => 'AI researcher and ethics advocate. PhD in Computer Science from MIT. Leading voice in responsible AI development and algorithmic fairness.',
                'location' => 'Boston, MA',
                'company' => 'AI Ethics Lab',
                'website' => 'https://priyapatel.ai',
                'phone' => '+1-555-0105',
                'avatar_url' => 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face'
            ],
            [
                'name' => 'David Kim',
                'email' => 'david.kim@example.com',
                'role' => 'creator',
                'bio' => 'Sustainable business consultant and climate activist. Helping Fortune 500 companies transition to carbon-neutral operations. Author of "Green Business Revolution".',
                'location' => 'Portland, OR',
                'company' => 'EcoStrategy Group',
                'website' => 'https://davidkim.eco',
                'phone' => '+1-555-0106',
                'avatar_url' => 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=face'
            ],
            [
                'name' => 'Lisa Thompson',
                'email' => 'lisa.thompson@example.com',
                'role' => 'user',
                'bio' => 'Marketing professional and podcast enthusiast. Always learning from industry leaders and sharing insights with my network.',
                'location' => 'Chicago, IL',
                'company' => 'BrandForward Agency',
                'website' => 'https://lisathompson.marketing',
                'phone' => '+1-555-0107',
                'avatar_url' => 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
            ],
            [
                'name' => 'Robert Anderson',
                'email' => 'robert.anderson@example.com',
                'role' => 'business',
                'bio' => 'Venture capitalist and startup mentor. 20+ years in tech investing. Partner at Anderson Ventures, focused on early-stage B2B SaaS companies.',
                'location' => 'Palo Alto, CA',
                'company' => 'Anderson Ventures',
                'website' => 'https://andersonvc.com',
                'phone' => '+1-555-0108',
                'avatar_url' => 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face'
            ]
        ];

        foreach ($users as $userData) {
            $hashedPassword = password_hash('demo123', PASSWORD_DEFAULT);
            
            $stmt = $this->pdo->prepare("
                INSERT INTO users (name, email, password, role, bio, location, company, website, phone, avatar_url, email_verified_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $stmt->execute([
                $userData['name'],
                $userData['email'],
                $hashedPassword,
                $userData['role'],
                $userData['bio'],
                $userData['location'],
                $userData['company'],
                $userData['website'],
                $userData['phone'],
                $userData['avatar_url']
            ]);

            $userId = $this->pdo->lastInsertId();
            $this->sampleUsers[] = array_merge($userData, ['id' => $userId]);
        }

        echo "   ✓ Created " . count($users) . " sample users\n";
    }

    /**
     * Create sample businesses across different industries
     */
    private function createSampleBusinesses()
    {
        echo "🏢 Creating sample businesses...\n";

        $businesses = [
            [
                'name' => 'TechFlow Solutions',
                'description' => 'Leading provider of cloud infrastructure and DevOps consulting services. Helping companies scale their technology operations efficiently.',
                'industry' => 'Technology',
                'website' => 'https://techflowsolutions.com',
                'email' => 'contact@techflowsolutions.com',
                'phone' => '+1-555-0201',
                'address' => '123 Innovation Drive, San Francisco, CA 94105',
                'logo_url' => 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
                'banner_url' => 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop'
            ],
            [
                'name' => 'Green Earth Consulting',
                'description' => 'Environmental consulting firm specializing in sustainability strategies and carbon footprint reduction for businesses of all sizes.',
                'industry' => 'Environmental',
                'website' => 'https://greenearthconsulting.com',
                'email' => 'info@greenearthconsulting.com',
                'phone' => '+1-555-0202',
                'address' => '456 Eco Boulevard, Portland, OR 97201',
                'logo_url' => 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop',
                'banner_url' => 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=400&fit=crop'
            ],
            [
                'name' => 'MindWell Therapy Center',
                'description' => 'Comprehensive mental health services including individual therapy, group sessions, and corporate wellness programs.',
                'industry' => 'Healthcare',
                'website' => 'https://mindwelltherapy.com',
                'email' => 'appointments@mindwelltherapy.com',
                'phone' => '+1-555-0203',
                'address' => '789 Wellness Way, Austin, TX 78701',
                'logo_url' => 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop',
                'banner_url' => 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&h=400&fit=crop'
            ],
            [
                'name' => 'Creative Studios NYC',
                'description' => 'Full-service creative agency specializing in brand development, digital marketing, and content creation for modern businesses.',
                'industry' => 'Marketing',
                'website' => 'https://creativestudiosnyc.com',
                'email' => 'hello@creativestudiosnyc.com',
                'phone' => '+1-555-0204',
                'address' => '321 Creative Lane, New York, NY 10001',
                'logo_url' => 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=400&fit=crop',
                'banner_url' => 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=400&fit=crop'
            ],
            [
                'name' => 'Future Finance Group',
                'description' => 'Investment advisory firm focused on emerging technologies and sustainable investing. Helping clients build wealth responsibly.',
                'industry' => 'Finance',
                'website' => 'https://futurefinancegroup.com',
                'email' => 'advisors@futurefinancegroup.com',
                'phone' => '+1-555-0205',
                'address' => '654 Wall Street, New York, NY 10005',
                'logo_url' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop',
                'banner_url' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=400&fit=crop'
            ]
        ];

        foreach ($businesses as $businessData) {
            // Find a business owner from our sample users
            $owner = array_filter($this->sampleUsers, function($user) {
                return $user['role'] === 'business';
            });
            $ownerId = !empty($owner) ? array_values($owner)[0]['id'] : $this->sampleUsers[0]['id'];

            $stmt = $this->pdo->prepare("
                INSERT INTO businesses (name, description, industry, website, email, phone, address, logo_url, banner_url, owner_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $businessData['name'],
                $businessData['description'],
                $businessData['industry'],
                $businessData['website'],
                $businessData['email'],
                $businessData['phone'],
                $businessData['address'],
                $businessData['logo_url'],
                $businessData['banner_url'],
                $ownerId
            ]);

            $businessId = $this->pdo->lastInsertId();
            $this->sampleBusinesses[] = array_merge($businessData, ['id' => $businessId, 'owner_id' => $ownerId]);
        }

        echo "   ✓ Created " . count($businesses) . " sample businesses\n";
    }

    /**
     * Create high-quality sample interviews
     */
    private function createSampleInterviews()
    {
        echo "🎤 Creating sample interviews...\n";

        $interviews = [
            [
                'title' => 'Building Scalable Startups: Lessons from Silicon Valley',
                'description' => 'Sarah Chen shares her journey from engineer to VP of Engineering, discussing the challenges of scaling teams, building product culture, and the mistakes that taught her the most valuable lessons.',
                'type' => 'video',
                'category' => 'Technology',
                'tags' => 'startup,leadership,engineering,scaling,silicon-valley',
                'duration' => 2340, // 39 minutes
                'video_url' => 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop',
                'transcript' => 'Welcome everyone. Today we\'re talking about building scalable startups and the lessons I\'ve learned throughout my journey in Silicon Valley...',
                'creator_id' => 1 // Sarah Chen
            ],
            [
                'title' => 'The Art of Documentary Storytelling',
                'description' => 'Emmy-nominated filmmaker Marcus Johnson discusses his approach to capturing authentic human stories, the evolution of documentary filmmaking, and his latest project "Voices of Change".',
                'type' => 'video',
                'category' => 'Arts & Media',
                'tags' => 'documentary,filmmaking,storytelling,emmy,voices-of-change',
                'duration' => 1980, // 33 minutes
                'video_url' => 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800&h=450&fit=crop',
                'transcript' => 'Storytelling is at the heart of everything we do as documentary filmmakers. It\'s about finding the human truth in every story...',
                'creator_id' => 2 // Marcus Johnson
            ],
            [
                'title' => 'Mental Health in the Modern Workplace',
                'description' => 'Dr. Elena Rodriguez explores the growing mental health crisis in corporate environments, practical strategies for leaders, and how to build psychologically safe workplaces.',
                'type' => 'audio',
                'category' => 'Health & Wellness',
                'tags' => 'mental-health,workplace,psychology,leadership,wellness',
                'duration' => 2760, // 46 minutes
                'audio_url' => 'https://sample-audio.com/mental-health-workplace.mp3',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=450&fit=crop',
                'transcript' => 'Mental health in the workplace is no longer a nice-to-have, it\'s a business imperative. Let me share what the research tells us...',
                'creator_id' => 3 // Dr. Elena Rodriguez
            ],
            [
                'title' => 'From Startup to Exit: An Entrepreneur\'s Journey',
                'description' => 'Serial entrepreneur James Mitchell shares the complete story of building and selling two successful startups, including the failures, pivots, and key decisions that made the difference.',
                'type' => 'video',
                'category' => 'Business',
                'tags' => 'entrepreneurship,startup,exit,venture-capital,business-strategy',
                'duration' => 3120, // 52 minutes
                'video_url' => 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_3mb.mp4',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=450&fit=crop',
                'transcript' => 'Building a startup is like jumping off a cliff and assembling a parachute on the way down. Let me tell you about my journey...',
                'creator_id' => 4 // James Mitchell
            ],
            [
                'title' => 'The Future of AI: Ethics and Responsibility',
                'description' => 'AI researcher Priya Patel discusses the current state of artificial intelligence, the critical importance of ethical AI development, and what the future holds for human-AI collaboration.',
                'type' => 'video',
                'category' => 'Technology',
                'tags' => 'artificial-intelligence,ethics,research,future-tech,responsible-ai',
                'duration' => 2580, // 43 minutes
                'video_url' => 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_4mb.mp4',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=450&fit=crop',
                'transcript' => 'As AI becomes more powerful, our responsibility to develop it ethically becomes even more critical. Here\'s what we need to consider...',
                'creator_id' => 5 // Priya Patel
            ],
            [
                'title' => 'Sustainable Business: Profit with Purpose',
                'description' => 'Climate consultant David Kim explains how businesses can transition to sustainable operations while maintaining profitability, featuring real case studies and actionable strategies.',
                'type' => 'audio',
                'category' => 'Environment',
                'tags' => 'sustainability,climate,business-strategy,carbon-neutral,green-business',
                'duration' => 2220, // 37 minutes
                'audio_url' => 'https://sample-audio.com/sustainable-business.mp3',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=450&fit=crop',
                'transcript' => 'Sustainability isn\'t just good for the planet, it\'s good for business. Let me show you how companies are proving this every day...',
                'creator_id' => 6 // David Kim
            ]
        ];

        foreach ($interviews as $interviewData) {
            $stmt = $this->pdo->prepare("
                INSERT INTO interviews (title, description, type, category, tags, duration, video_url, audio_url, thumbnail_url, transcript, creator_id, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NOW())
            ");
            
            $stmt->execute([
                $interviewData['title'],
                $interviewData['description'],
                $interviewData['type'],
                $interviewData['category'],
                $interviewData['tags'],
                $interviewData['duration'],
                $interviewData['video_url'] ?? null,
                $interviewData['audio_url'] ?? null,
                $interviewData['thumbnail_url'],
                $interviewData['transcript'],
                $interviewData['creator_id']
            ]);

            $interviewId = $this->pdo->lastInsertId();
            $this->sampleInterviews[] = array_merge($interviewData, ['id' => $interviewId]);
        }

        echo "   ✓ Created " . count($interviews) . " sample interviews\n";
    }

    /**
     * Create sample comments to demonstrate engagement
     */
    private function createSampleComments()
    {
        echo "💬 Creating sample comments...\n";

        $comments = [
            [
                'content' => 'This is incredibly insightful! The part about scaling engineering teams really resonated with my experience. Thank you for sharing these lessons.',
                'interview_id' => 1,
                'user_id' => 7 // Lisa Thompson
            ],
            [
                'content' => 'As someone who\'s been through a similar journey, I can confirm everything Sarah says here is spot on. The culture piece is especially critical.',
                'interview_id' => 1,
                'user_id' => 4 // James Mitchell
            ],
            [
                'content' => 'Your storytelling approach is masterful. The way you capture authentic emotions in your documentaries is truly inspiring for aspiring filmmakers.',
                'interview_id' => 2,
                'user_id' => 1 // Sarah Chen
            ],
            [
                'content' => 'This should be required viewing for every manager. The practical strategies you provide are immediately actionable. Brilliant work, Dr. Rodriguez!',
                'interview_id' => 3,
                'user_id' => 8 // Robert Anderson
            ],
            [
                'content' => 'The transparency about failures and pivots is refreshing. Too many entrepreneurs only share the success stories. This is real and valuable.',
                'interview_id' => 4,
                'user_id' => 5 // Priya Patel
            ],
            [
                'content' => 'The ethical considerations you raise are crucial as AI becomes more prevalent. We need more researchers like you leading these conversations.',
                'interview_id' => 5,
                'user_id' => 6 // David Kim
            ]
        ];

        foreach ($comments as $commentData) {
            $stmt = $this->pdo->prepare("
                INSERT INTO comments (content, interview_id, user_id, created_at)
                VALUES (?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $commentData['content'],
                $commentData['interview_id'],
                $commentData['user_id']
            ]);
        }

        echo "   ✓ Created " . count($comments) . " sample comments\n";
    }

    /**
     * Create sample likes to show engagement
     */
    private function createSampleLikes()
    {
        echo "❤️ Creating sample likes...\n";

        $likesCount = 0;
        
        // Create likes for interviews (multiple users liking each interview)
        foreach ($this->sampleInterviews as $interview) {
            $likers = array_rand($this->sampleUsers, rand(3, 6));
            if (!is_array($likers)) $likers = [$likers];
            
            foreach ($likers as $likerIndex) {
                $stmt = $this->pdo->prepare("
                    INSERT IGNORE INTO likes (user_id, interview_id, created_at)
                    VALUES (?, ?, NOW())
                ");
                
                $stmt->execute([
                    $this->sampleUsers[$likerIndex]['id'],
                    $interview['id']
                ]);
                $likesCount++;
            }
        }

        echo "   ✓ Created $likesCount sample likes\n";
    }

    /**
     * Create sample follow relationships
     */
    private function createSampleFollows()
    {
        echo "👥 Creating sample follows...\n";

        $followsCount = 0;
        
        // Create realistic follow relationships
        foreach ($this->sampleUsers as $user) {
            $followees = array_rand($this->sampleUsers, rand(2, 4));
            if (!is_array($followees)) $followees = [$followees];
            
            foreach ($followees as $followeeIndex) {
                if ($this->sampleUsers[$followeeIndex]['id'] !== $user['id']) {
                    $stmt = $this->pdo->prepare("
                        INSERT IGNORE INTO followers (follower_id, following_id, created_at)
                        VALUES (?, ?, NOW())
                    ");
                    
                    $stmt->execute([
                        $user['id'],
                        $this->sampleUsers[$followeeIndex]['id']
                    ]);
                    $followsCount++;
                }
            }
        }

        echo "   ✓ Created $followsCount sample follows\n";
    }

    /**
     * Create sample events
     */
    private function createSampleEvents()
    {
        echo "📅 Creating sample events...\n";

        $events = [
            [
                'title' => 'Tech Leadership Summit 2025',
                'description' => 'Join industry leaders for a day of insights on building and scaling technology teams in the modern era.',
                'type' => 'virtual',
                'date' => date('Y-m-d H:i:s', strtotime('+30 days')),
                'location' => 'Virtual Event',
                'organizer_id' => 1 // Sarah Chen
            ],
            [
                'title' => 'Documentary Filmmaking Workshop',
                'description' => 'Hands-on workshop covering the fundamentals of documentary storytelling, from concept to distribution.',
                'type' => 'in_person',
                'date' => date('Y-m-d H:i:s', strtotime('+45 days')),
                'location' => 'New York Film Academy, NY',
                'organizer_id' => 2 // Marcus Johnson
            ],
            [
                'title' => 'Mental Health in Tech Roundtable',
                'description' => 'Open discussion about mental health challenges in the technology industry and practical solutions.',
                'type' => 'hybrid',
                'date' => date('Y-m-d H:i:s', strtotime('+60 days')),
                'location' => 'Austin Convention Center, TX',
                'organizer_id' => 3 // Dr. Elena Rodriguez
            ]
        ];

        foreach ($events as $eventData) {
            $stmt = $this->pdo->prepare("
                INSERT INTO events (title, description, type, date, location, organizer_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $eventData['title'],
                $eventData['description'],
                $eventData['type'],
                $eventData['date'],
                $eventData['location'],
                $eventData['organizer_id']
            ]);
        }

        echo "   ✓ Created " . count($events) . " sample events\n";
    }

    /**
     * Print summary of created content
     */
    private function printSummary()
    {
        echo "\n📊 Sample Content Summary:\n";
        echo "   👥 Users: " . count($this->sampleUsers) . "\n";
        echo "   🏢 Businesses: " . count($this->sampleBusinesses) . "\n";
        echo "   🎤 Interviews: " . count($this->sampleInterviews) . "\n";
        echo "   💬 Comments: Generated\n";
        echo "   ❤️ Likes: Generated\n";
        echo "   👥 Follows: Generated\n";
        echo "   📅 Events: 3\n";
        echo "\n🎯 Demo Accounts Created:\n";
        echo "   📧 All users: password 'demo123'\n";
        echo "   🌟 Featured creators: Sarah Chen, Marcus Johnson, Dr. Elena Rodriguez\n";
        echo "   🏢 Business owners: James Mitchell, Robert Anderson\n";
        echo "\n✨ Ready for user onboarding and demonstrations!\n";
    }
}

// Usage example:
// $seeder = new SampleContentSeeder($pdo);
// $seeder->run();
