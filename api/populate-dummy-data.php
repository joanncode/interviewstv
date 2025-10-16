<?php
/**
 * Populate Database with Comprehensive Dummy Data
 */

header('Content-Type: application/json');

try {
    // Connect to MySQL
    $dsn = "mysql:host=localhost;dbname=interviews_tv;charset=utf8mb4";
    $pdo = new PDO($dsn, 'interviews_user', 'interviews_pass');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $results = [];
    
    // 1. Create Users (matching existing schema)
    $users = [
        [
            'email' => 'john@example.com',
            'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
            'name' => 'John Smith',
            'role' => 'admin',
            'bio' => 'Professional interviewer and podcast host with 10+ years experience.',
            'location' => 'New York, NY',
            'website' => 'https://johnsmith.com',
            'company' => 'Smith Media Group',
            'email_verified' => 1
        ],
        [
            'email' => 'sarah@example.com',
            'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
            'name' => 'Sarah Johnson',
            'role' => 'creator',
            'bio' => 'Tech entrepreneur and startup founder.',
            'location' => 'San Francisco, CA',
            'website' => 'https://sarahjohnson.com',
            'company' => 'TechStart Inc.',
            'email_verified' => 1
        ],
        [
            'email' => 'mike@example.com',
            'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
            'name' => 'Mike Chen',
            'role' => 'creator',
            'bio' => 'AI researcher and machine learning expert.',
            'location' => 'Seattle, WA',
            'website' => 'https://mikechen.ai',
            'company' => 'AI Research Labs',
            'email_verified' => 1
        ],
        [
            'email' => 'lisa@example.com',
            'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
            'name' => 'Lisa Rodriguez',
            'role' => 'business',
            'bio' => 'CEO of innovative fintech startup.',
            'location' => 'Austin, TX',
            'website' => 'https://lisarodriguez.com',
            'company' => 'FinTech Solutions',
            'email_verified' => 1
        ],
        [
            'email' => 'david@example.com',
            'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
            'name' => 'David Williams',
            'role' => 'creator',
            'bio' => 'Bestselling author and thought leader.',
            'location' => 'London, UK',
            'website' => 'https://davidwilliams.com',
            'company' => 'Williams Publishing',
            'email_verified' => 1
        ]
    ];
    
    $userIds = [];
    foreach ($users as $user) {
        $stmt = $pdo->prepare("
            INSERT INTO users (email, password_hash, name, role, bio, location, website, company, email_verified)
            VALUES (:email, :password_hash, :name, :role, :bio, :location, :website, :company, :email_verified)
            ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->execute($user);
        $userIds[] = $pdo->lastInsertId() ?: $pdo->query("SELECT id FROM users WHERE email = '{$user['email']}'")->fetchColumn();
    }
    $results[] = "✅ Created " . count($users) . " users";
    
    // 2. Create Interview Templates
    $templates = [
        [
            'name' => 'Tech Startup Interview',
            'description' => 'Standard template for interviewing tech startup founders',
            'category' => 'Business',
            'questions' => json_encode([
                'Tell us about your startup journey',
                'What problem are you solving?',
                'How did you validate your idea?',
                'What challenges have you faced?',
                'What advice would you give to aspiring entrepreneurs?'
            ]),
            'settings' => json_encode(['duration' => 45, 'allow_audience_questions' => true]),
            'is_public' => 1,
            'created_by' => $userIds[0]
        ],
        [
            'name' => 'Author Interview',
            'description' => 'Template for interviewing authors and writers',
            'category' => 'Literature',
            'questions' => json_encode([
                'What inspired you to write your latest book?',
                'Describe your writing process',
                'Who are your literary influences?',
                'What message do you hope readers take away?',
                'What are you working on next?'
            ]),
            'settings' => json_encode(['duration' => 30, 'allow_audience_questions' => false]),
            'is_public' => 1,
            'created_by' => $userIds[0]
        ],
        [
            'name' => 'AI Expert Interview',
            'description' => 'Template for interviewing AI and ML experts',
            'category' => 'Technology',
            'questions' => json_encode([
                'How did you get started in AI?',
                'What are the most exciting developments in AI?',
                'What are the biggest challenges in AI today?',
                'How do you see AI impacting society?',
                'What advice for those entering the AI field?'
            ]),
            'settings' => json_encode(['duration' => 60, 'allow_audience_questions' => true]),
            'is_public' => 1,
            'created_by' => $userIds[0]
        ]
    ];
    
    foreach ($templates as $template) {
        $stmt = $pdo->prepare("
            INSERT INTO interview_templates (name, description, category, questions, settings, is_public, created_by)
            VALUES (:name, :description, :category, :questions, :settings, :is_public, :created_by)
        ");
        $stmt->execute($template);
    }
    $results[] = "✅ Created " . count($templates) . " interview templates";
    
    echo json_encode([
        'success' => true,
        'message' => 'Dummy data population in progress...',
        'results' => $results,
        'user_ids' => $userIds,
        'next' => 'Continue with interviews and analytics data'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Dummy data population failed: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
