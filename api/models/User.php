<?php
/**
 * User Model for Interviews.tv
 * Handles user data operations and authentication
 */

class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $email;
    public $password_hash;
    public $name;
    public $role;
    public $avatar_url;
    public $hero_banner_url;
    public $bio;
    public $location;
    public $website;
    public $phone;
    public $company;
    public $email_verified;
    public $is_active;
    public $created_at;
    public $updated_at;
    public $last_login;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create a new user
     */
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET email=:email, password_hash=:password_hash, name=:name, 
                      role=:role, bio=:bio, location=:location, website=:website, 
                      phone=:phone, company=:company, email_verified=:email_verified";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->role = htmlspecialchars(strip_tags($this->role));
        $this->bio = htmlspecialchars(strip_tags($this->bio));
        $this->location = htmlspecialchars(strip_tags($this->location));
        $this->website = htmlspecialchars(strip_tags($this->website));
        $this->phone = htmlspecialchars(strip_tags($this->phone));
        $this->company = htmlspecialchars(strip_tags($this->company));

        // Bind values
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":password_hash", $this->password_hash);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":role", $this->role);
        $stmt->bindParam(":bio", $this->bio);
        $stmt->bindParam(":location", $this->location);
        $stmt->bindParam(":website", $this->website);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":company", $this->company);
        $stmt->bindParam(":email_verified", $this->email_verified);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    /**
     * Find user by email
     */
    public function findByEmail($email) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE email = :email AND is_active = 1 LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->mapFromArray($row);
            return true;
        }

        return false;
    }

    /**
     * Find user by ID
     */
    public function findById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id AND is_active = 1 LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->mapFromArray($row);
            return true;
        }

        return false;
    }

    /**
     * Find user by ID (static version that returns user data)
     */
    public static function findByIdStatic($id) {
        $database = new Database();
        $db = $database->getConnection();

        $query = "SELECT * FROM users WHERE id = :id AND is_active = 1 LIMIT 1";

        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }

        return false;
    }

    /**
     * Update user profile
     */
    public function update() {
        $query = "UPDATE " . $this->table_name . " 
                  SET name=:name, bio=:bio, location=:location, website=:website, 
                      phone=:phone, company=:company, avatar_url=:avatar_url, 
                      hero_banner_url=:hero_banner_url, updated_at=CURRENT_TIMESTAMP 
                  WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->bio = htmlspecialchars(strip_tags($this->bio));
        $this->location = htmlspecialchars(strip_tags($this->location));
        $this->website = htmlspecialchars(strip_tags($this->website));
        $this->phone = htmlspecialchars(strip_tags($this->phone));
        $this->company = htmlspecialchars(strip_tags($this->company));

        // Bind values
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":bio", $this->bio);
        $stmt->bindParam(":location", $this->location);
        $stmt->bindParam(":website", $this->website);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":company", $this->company);
        $stmt->bindParam(":avatar_url", $this->avatar_url);
        $stmt->bindParam(":hero_banner_url", $this->hero_banner_url);
        $stmt->bindParam(":id", $this->id);

        return $stmt->execute();
    }

    /**
     * Update last login timestamp
     */
    public function updateLastLogin() {
        $query = "UPDATE " . $this->table_name . " SET last_login=CURRENT_TIMESTAMP WHERE id=:id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $this->id);

        return $stmt->execute();
    }

    /**
     * Update user avatar URL
     */
    public static function updateAvatar($userId, $avatarUrl) {
        $database = new Database();
        $db = $database->getConnection();

        $query = "UPDATE users SET avatar_url=:avatar_url, updated_at=CURRENT_TIMESTAMP WHERE id=:id";

        $stmt = $db->prepare($query);
        $stmt->bindParam(":avatar_url", $avatarUrl);
        $stmt->bindParam(":id", $userId);

        if ($stmt->execute()) {
            return self::findByIdStatic($userId);
        }

        return false;
    }

    /**
     * Update user hero banner URL
     */
    public static function updateHeroBanner($userId, $heroBannerUrl) {
        $database = new Database();
        $db = $database->getConnection();

        $query = "UPDATE users SET hero_banner_url=:hero_banner_url, updated_at=CURRENT_TIMESTAMP WHERE id=:id";

        $stmt = $db->prepare($query);
        $stmt->bindParam(":hero_banner_url", $heroBannerUrl);
        $stmt->bindParam(":id", $userId);

        if ($stmt->execute()) {
            return self::findByIdStatic($userId);
        }

        return false;
    }

    /**
     * Verify password
     */
    public function verifyPassword($password) {
        return password_verify($password, $this->password_hash);
    }

    /**
     * Hash password
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    /**
     * Get user permissions
     */
    public function getPermissions() {
        $query = "SELECT permission FROM user_permissions WHERE user_id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->id);
        $stmt->execute();

        $permissions = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $permissions[] = $row['permission'];
        }

        return $permissions;
    }

    /**
     * Check if user has specific permission
     */
    public function hasPermission($permission) {
        if ($this->role === 'admin') {
            return true; // Admin has all permissions
        }

        $query = "SELECT COUNT(*) as count FROM user_permissions 
                  WHERE user_id = :user_id AND permission = :permission";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->id);
        $stmt->bindParam(":permission", $permission);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] > 0;
    }

    /**
     * Get user's public profile data
     */
    public function getPublicProfile() {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'avatar_url' => $this->avatar_url,
            'hero_banner_url' => $this->hero_banner_url,
            'bio' => $this->bio,
            'location' => $this->location,
            'website' => $this->website,
            'company' => $this->company,
            'created_at' => $this->created_at
        ];
    }

    /**
     * Get user's private profile data (for authenticated user)
     */
    public function getPrivateProfile() {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'name' => $this->name,
            'role' => $this->role,
            'avatar_url' => $this->avatar_url,
            'hero_banner_url' => $this->hero_banner_url,
            'bio' => $this->bio,
            'location' => $this->location,
            'website' => $this->website,
            'phone' => $this->phone,
            'company' => $this->company,
            'email_verified' => $this->email_verified,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'last_login' => $this->last_login,
            'permissions' => $this->getPermissions()
        ];
    }

    /**
     * Map array data to object properties
     */
    private function mapFromArray($data) {
        $this->id = $data['id'];
        $this->email = $data['email'];
        $this->password_hash = $data['password_hash'];
        $this->name = $data['name'];
        $this->role = $data['role'];
        $this->avatar_url = $data['avatar_url'];
        $this->hero_banner_url = $data['hero_banner_url'];
        $this->bio = $data['bio'];
        $this->location = $data['location'];
        $this->website = $data['website'];
        $this->phone = $data['phone'];
        $this->company = $data['company'];
        $this->email_verified = $data['email_verified'];
        $this->is_active = $data['is_active'];
        $this->created_at = $data['created_at'];
        $this->updated_at = $data['updated_at'];
        $this->last_login = $data['last_login'];
    }

    /**
     * Check if email already exists
     */
    public function emailExists($email) {
        $query = "SELECT id FROM " . $this->table_name . " WHERE email = :email LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }
}

/**
 * Business Model for Interviews.tv
 * Handles business directory operations
 */
class Business {
    private $conn;
    private $table_name = "businesses";

    public $id;
    public $owner_id;
    public $name;
    public $slug;
    public $description;
    public $industry;
    public $location;
    public $website;
    public $email;
    public $phone;
    public $founded_year;
    public $employee_count;
    public $logo_url;
    public $banner_url;
    public $rating;
    public $total_reviews;
    public $is_verified;
    public $is_active;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Get all active businesses with pagination
     */
    public function getAll($page = 1, $limit = 12, $industry = null, $search = null) {
        $offset = ($page - 1) * $limit;

        $where_conditions = ["is_active = 1"];
        $params = [];

        if ($industry) {
            $where_conditions[] = "industry = :industry";
            $params[':industry'] = $industry;
        }

        if ($search) {
            $where_conditions[] = "(name LIKE :search OR description LIKE :search OR location LIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }

        $where_clause = implode(' AND ', $where_conditions);

        $query = "SELECT * FROM " . $this->table_name . "
                  WHERE " . $where_clause . "
                  ORDER BY is_verified DESC, rating DESC, created_at DESC
                  LIMIT :limit OFFSET :offset";

        $stmt = $this->conn->prepare($query);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get business by slug
     */
    public function findBySlug($slug) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE slug = :slug AND is_active = 1 LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":slug", $slug);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->mapFromArray($row);
            return true;
        }

        return false;
    }

    /**
     * Create new business
     */
    public function create() {
        $query = "INSERT INTO " . $this->table_name . "
                  SET owner_id=:owner_id, name=:name, slug=:slug, description=:description,
                      industry=:industry, location=:location, website=:website, email=:email,
                      phone=:phone, founded_year=:founded_year, employee_count=:employee_count";

        $stmt = $this->conn->prepare($query);

        // Generate slug from name
        $this->slug = $this->generateSlug($this->name);

        // Sanitize inputs
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->industry = htmlspecialchars(strip_tags($this->industry));
        $this->location = htmlspecialchars(strip_tags($this->location));
        $this->website = htmlspecialchars(strip_tags($this->website));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->phone = htmlspecialchars(strip_tags($this->phone));

        // Bind values
        $stmt->bindParam(":owner_id", $this->owner_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":slug", $this->slug);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":industry", $this->industry);
        $stmt->bindParam(":location", $this->location);
        $stmt->bindParam(":website", $this->website);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":founded_year", $this->founded_year);
        $stmt->bindParam(":employee_count", $this->employee_count);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    /**
     * Generate URL-friendly slug
     */
    private function generateSlug($name) {
        $slug = strtolower(trim($name));
        $slug = preg_replace('/[^a-z0-9-]/', '-', $slug);
        $slug = preg_replace('/-+/', '-', $slug);
        $slug = trim($slug, '-');

        // Ensure uniqueness
        $original_slug = $slug;
        $counter = 1;

        while ($this->slugExists($slug)) {
            $slug = $original_slug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Check if slug exists
     */
    private function slugExists($slug) {
        $query = "SELECT id FROM " . $this->table_name . " WHERE slug = :slug LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":slug", $slug);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * Map array data to object properties
     */
    private function mapFromArray($data) {
        $this->id = $data['id'];
        $this->owner_id = $data['owner_id'];
        $this->name = $data['name'];
        $this->slug = $data['slug'];
        $this->description = $data['description'];
        $this->industry = $data['industry'];
        $this->location = $data['location'];
        $this->website = $data['website'];
        $this->email = $data['email'];
        $this->phone = $data['phone'];
        $this->founded_year = $data['founded_year'];
        $this->employee_count = $data['employee_count'];
        $this->logo_url = $data['logo_url'];
        $this->banner_url = $data['banner_url'];
        $this->rating = $data['rating'];
        $this->total_reviews = $data['total_reviews'];
        $this->is_verified = $data['is_verified'];
        $this->is_active = $data['is_active'];
        $this->created_at = $data['created_at'];
        $this->updated_at = $data['updated_at'];
    }

    /**
     * Validate JWT token and return user data
     */
    public static function validateToken($token) {
        // Use the JWTHelper from cors.php
        $decoded = JWTHelper::validateToken($token);

        if (!$decoded) {
            return false;
        }

        // Get fresh user data from database
        if (isset($decoded['user_id'])) {
            return self::findByIdStatic($decoded['user_id']);
        }

        return false;
    }

    /**
     * Sanitize user data by removing sensitive fields
     */
    public static function sanitize($user) {
        if (!$user) return null;

        // Remove sensitive fields
        unset($user['password']);
        unset($user['password_hash']);
        unset($user['email_verification_token']);
        unset($user['password_reset_token']);
        unset($user['password_reset_expires']);

        return $user;
    }
}
?>
