<?php
/**
 * Simple JSON Database for Development
 * Fallback when MySQL/MariaDB is not available
 */

class JsonDatabase {
    private $dataDir;
    private $users = [];
    private $businesses = [];
    private $interviews = [];
    
    public function __construct() {
        $this->dataDir = __DIR__ . '/../../data/';
        if (!file_exists($this->dataDir)) {
            mkdir($this->dataDir, 0755, true);
        }
        $this->loadData();
    }
    
    private function loadData() {
        // Load users
        $usersFile = $this->dataDir . 'users.json';
        if (file_exists($usersFile)) {
            $this->users = json_decode(file_get_contents($usersFile), true) ?: [];
        } else {
            $this->initializeDefaultData();
        }
        
        // Load businesses
        $businessesFile = $this->dataDir . 'businesses.json';
        if (file_exists($businessesFile)) {
            $this->businesses = json_decode(file_get_contents($businessesFile), true) ?: [];
        }
        
        // Load interviews
        $interviewsFile = $this->dataDir . 'interviews.json';
        if (file_exists($interviewsFile)) {
            $this->interviews = json_decode(file_get_contents($interviewsFile), true) ?: [];
        }
    }
    
    private function saveData() {
        file_put_contents($this->dataDir . 'users.json', json_encode($this->users, JSON_PRETTY_PRINT));
        file_put_contents($this->dataDir . 'businesses.json', json_encode($this->businesses, JSON_PRETTY_PRINT));
        file_put_contents($this->dataDir . 'interviews.json', json_encode($this->interviews, JSON_PRETTY_PRINT));
    }
    
    private function initializeDefaultData() {
        $this->users = [
            [
                'id' => 1,
                'email' => 'admin@interviews.tv',
                'password_hash' => password_hash('admin123', PASSWORD_DEFAULT),
                'name' => 'Admin User',
                'role' => 'admin',
                'bio' => 'Platform Administrator with full system access',
                'location' => 'San Francisco, CA',
                'website' => 'https://interviews.tv',
                'phone' => '',
                'company' => '',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => true,
                'created_at' => '2024-01-01T00:00:00Z',
                'updated_at' => '2024-01-01T00:00:00Z',
                'last_login' => '2024-01-20T10:30:00Z',
                'permissions' => ['all']
            ],
            [
                'id' => 2,
                'email' => 'creator@interviews.tv',
                'password_hash' => password_hash('creator123', PASSWORD_DEFAULT),
                'name' => 'Content Creator',
                'role' => 'creator',
                'bio' => 'Professional content creator specializing in business interviews and storytelling',
                'location' => 'Los Angeles, CA',
                'website' => 'https://contentcreator.com',
                'phone' => '',
                'company' => '',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => true,
                'created_at' => '2024-01-02T00:00:00Z',
                'updated_at' => '2024-01-02T00:00:00Z',
                'last_login' => '2024-01-19T15:45:00Z',
                'permissions' => ['create_content', 'manage_profile', 'conduct_interviews']
            ],
            [
                'id' => 3,
                'email' => 'business@interviews.tv',
                'password_hash' => password_hash('business123', PASSWORD_DEFAULT),
                'name' => 'Business Owner',
                'role' => 'business',
                'bio' => 'Business profile manager and entrepreneur',
                'location' => 'New York, NY',
                'website' => 'https://mybusiness.com',
                'phone' => '',
                'company' => '',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => true,
                'created_at' => '2024-01-03T00:00:00Z',
                'updated_at' => '2024-01-03T00:00:00Z',
                'last_login' => '2024-01-18T09:15:00Z',
                'permissions' => ['manage_business', 'manage_profile', 'respond_interviews']
            ],
            [
                'id' => 4,
                'email' => 'user@interviews.tv',
                'password_hash' => password_hash('user123', PASSWORD_DEFAULT),
                'name' => 'Regular User',
                'role' => 'user',
                'bio' => 'Platform user interested in business content and interviews',
                'location' => 'Chicago, IL',
                'website' => '',
                'phone' => '',
                'company' => '',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => false,
                'is_active' => true,
                'created_at' => '2024-01-04T00:00:00Z',
                'updated_at' => '2024-01-04T00:00:00Z',
                'last_login' => null,
                'permissions' => ['view_content', 'manage_profile']
            ],
            [
                'id' => 5,
                'email' => 'john.doe@example.com',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'name' => 'John Doe',
                'role' => 'user',
                'bio' => 'Software developer and tech enthusiast',
                'location' => 'Seattle, WA',
                'website' => 'https://johndoe.dev',
                'phone' => '+1 (555) 123-4567',
                'company' => 'Tech Corp',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => true,
                'created_at' => '2024-01-05T00:00:00Z',
                'updated_at' => '2024-01-05T00:00:00Z',
                'last_login' => '2024-01-15T08:30:00Z',
                'permissions' => ['view_content', 'manage_profile']
            ],
            [
                'id' => 6,
                'email' => 'jane.smith@company.com',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'name' => 'Jane Smith',
                'role' => 'creator',
                'bio' => 'Marketing specialist and content strategist',
                'location' => 'Austin, TX',
                'website' => 'https://janesmith.com',
                'phone' => '+1 (555) 234-5678',
                'company' => 'Marketing Solutions',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => true,
                'created_at' => '2024-01-06T00:00:00Z',
                'updated_at' => '2024-01-06T00:00:00Z',
                'last_login' => '2024-01-17T14:20:00Z',
                'permissions' => ['create_content', 'manage_profile', 'conduct_interviews']
            ],
            [
                'id' => 7,
                'email' => 'mike.wilson@startup.io',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'name' => 'Mike Wilson',
                'role' => 'business',
                'bio' => 'Startup founder and entrepreneur',
                'location' => 'Boston, MA',
                'website' => 'https://startup.io',
                'phone' => '+1 (555) 345-6789',
                'company' => 'Startup Inc',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => true,
                'created_at' => '2024-01-07T00:00:00Z',
                'updated_at' => '2024-01-07T00:00:00Z',
                'last_login' => '2024-01-16T11:45:00Z',
                'permissions' => ['manage_business', 'manage_profile', 'respond_interviews']
            ],
            [
                'id' => 8,
                'email' => 'sarah.johnson@agency.com',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'name' => 'Sarah Johnson',
                'role' => 'creator',
                'bio' => 'Digital marketing agency owner',
                'location' => 'Miami, FL',
                'website' => 'https://agency.com',
                'phone' => '+1 (555) 456-7890',
                'company' => 'Digital Agency',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => true,
                'created_at' => '2024-01-08T00:00:00Z',
                'updated_at' => '2024-01-08T00:00:00Z',
                'last_login' => '2024-01-14T16:30:00Z',
                'permissions' => ['create_content', 'manage_profile', 'conduct_interviews']
            ],
            [
                'id' => 9,
                'email' => 'david.brown@tech.com',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'name' => 'David Brown',
                'role' => 'user',
                'bio' => 'Product manager at tech company',
                'location' => 'San Diego, CA',
                'website' => '',
                'phone' => '+1 (555) 567-8901',
                'company' => 'TechCorp',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => false,
                'is_active' => true,
                'created_at' => '2024-01-09T00:00:00Z',
                'updated_at' => '2024-01-09T00:00:00Z',
                'last_login' => null,
                'permissions' => ['view_content', 'manage_profile']
            ],
            [
                'id' => 10,
                'email' => 'lisa.davis@consulting.com',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'name' => 'Lisa Davis',
                'role' => 'business',
                'bio' => 'Business consultant and advisor',
                'location' => 'Denver, CO',
                'website' => 'https://consulting.com',
                'phone' => '+1 (555) 678-9012',
                'company' => 'Davis Consulting',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => true,
                'created_at' => '2024-01-10T00:00:00Z',
                'updated_at' => '2024-01-10T00:00:00Z',
                'last_login' => '2024-01-12T09:15:00Z',
                'permissions' => ['manage_business', 'manage_profile', 'respond_interviews']
            ],
            [
                'id' => 11,
                'email' => 'alex.garcia@freelance.com',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'name' => 'Alex Garcia',
                'role' => 'creator',
                'bio' => 'Freelance video producer',
                'location' => 'Portland, OR',
                'website' => 'https://freelance.com',
                'phone' => '+1 (555) 789-0123',
                'company' => 'Freelance Media',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => true,
                'created_at' => '2024-01-11T00:00:00Z',
                'updated_at' => '2024-01-11T00:00:00Z',
                'last_login' => '2024-01-13T13:45:00Z',
                'permissions' => ['create_content', 'manage_profile', 'conduct_interviews']
            ],
            [
                'id' => 12,
                'email' => 'emma.taylor@nonprofit.org',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'name' => 'Emma Taylor',
                'role' => 'user',
                'bio' => 'Nonprofit organization coordinator',
                'location' => 'Nashville, TN',
                'website' => 'https://nonprofit.org',
                'phone' => '+1 (555) 890-1234',
                'company' => 'Nonprofit Org',
                'avatar_url' => null,
                'hero_banner_url' => null,
                'email_verified' => true,
                'is_active' => false,
                'created_at' => '2024-01-12T00:00:00Z',
                'updated_at' => '2024-01-12T00:00:00Z',
                'last_login' => '2024-01-10T10:20:00Z',
                'permissions' => ['view_content', 'manage_profile']
            ]
        ];
        
        $this->saveData();
    }
    
    // User methods
    public function getUsers($page = 1, $limit = 20, $search = null, $role = null, $status = null) {
        $users = $this->users;
        
        // Apply filters
        if ($search) {
            $users = array_filter($users, function($user) use ($search) {
                return stripos($user['name'], $search) !== false || 
                       stripos($user['email'], $search) !== false;
            });
        }
        
        if ($role) {
            $users = array_filter($users, function($user) use ($role) {
                return $user['role'] === $role;
            });
        }
        
        if ($status === 'active') {
            $users = array_filter($users, function($user) {
                return $user['is_active'];
            });
        } elseif ($status === 'inactive') {
            $users = array_filter($users, function($user) {
                return !$user['is_active'];
            });
        }
        
        $total = count($users);
        $offset = ($page - 1) * $limit;
        $users = array_slice($users, $offset, $limit);
        
        return [
            'users' => array_values($users),
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ];
    }
    
    public function getUserStats() {
        $total = count($this->users);
        $active = count(array_filter($this->users, function($u) { return $u['is_active']; }));
        $verified = count(array_filter($this->users, function($u) { return $u['email_verified']; }));
        $active30 = count(array_filter($this->users, function($u) { 
            return $u['last_login'] && strtotime($u['last_login']) > strtotime('-30 days'); 
        }));
        
        return [
            'total_users' => $total,
            'active_users' => $active,
            'verified_users' => $verified,
            'active_30_days' => $active30,
            'admin_count' => count(array_filter($this->users, function($u) { return $u['role'] === 'admin'; })),
            'creator_count' => count(array_filter($this->users, function($u) { return $u['role'] === 'creator'; })),
            'business_count' => count(array_filter($this->users, function($u) { return $u['role'] === 'business'; })),
            'user_count' => count(array_filter($this->users, function($u) { return $u['role'] === 'user'; }))
        ];
    }
    
    public function findUserByEmail($email) {
        foreach ($this->users as $user) {
            if ($user['email'] === $email) {
                return $user;
            }
        }
        return null;
    }
    
    public function findUserById($id) {
        foreach ($this->users as $user) {
            if ($user['id'] == $id) {
                return $user;
            }
        }
        return null;
    }
    
    public function createUser($userData) {
        $newId = max(array_column($this->users, 'id')) + 1;
        $userData['id'] = $newId;
        $userData['created_at'] = date('c');
        $userData['updated_at'] = date('c');
        
        $this->users[] = $userData;
        $this->saveData();
        
        return $userData;
    }
    
    public function updateUser($id, $userData) {
        foreach ($this->users as &$user) {
            if ($user['id'] == $id) {
                $user = array_merge($user, $userData);
                $user['updated_at'] = date('c');
                $this->saveData();
                return $user;
            }
        }
        return null;
    }
    
    public function emailExists($email) {
        return $this->findUserByEmail($email) !== null;
    }

    // Database connection compatibility methods
    public function getConnection() {
        return $this;
    }

    public function getAllUsers() {
        return $this->users;
    }

    public function getAllInterviews() {
        return $this->interviews;
    }

    public function getAllBusinesses() {
        return $this->businesses;
    }
}
?>
