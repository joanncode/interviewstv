<?php

namespace App\Services;

class SecureAuthService
{
    private $pdo;
    private $sessionLifetime = 3600; // 1 hour
    private $maxLoginAttempts = 5;
    private $lockoutDuration = 900; // 15 minutes
    private $passwordMinLength = 8;
    private $requireStrongPassword = true;
    
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->startSecureSession();
    }
    
    /**
     * Authenticate user with enhanced security
     */
    public function authenticate($email, $password, $rememberMe = false)
    {
        // Check for rate limiting
        if ($this->isRateLimited($email)) {
            return [
                'success' => false,
                'message' => 'Too many login attempts. Please try again later.',
                'locked_until' => $this->getLockoutTime($email)
            ];
        }
        
        // Validate input
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->recordFailedAttempt($email);
            return [
                'success' => false,
                'message' => 'Invalid email format'
            ];
        }
        
        // Find user
        $user = $this->findUserByEmail($email);
        if (!$user) {
            $this->recordFailedAttempt($email);
            return [
                'success' => false,
                'message' => 'Invalid credentials'
            ];
        }
        
        // Check if account is locked
        if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
            return [
                'success' => false,
                'message' => 'Account is temporarily locked',
                'locked_until' => $user['locked_until']
            ];
        }
        
        // Verify password
        if (!password_verify($password, $user['password'])) {
            $this->recordFailedAttempt($email, $user['id']);
            return [
                'success' => false,
                'message' => 'Invalid credentials'
            ];
        }
        
        // Check if account is active
        if (!$user['is_active']) {
            return [
                'success' => false,
                'message' => 'Account is deactivated'
            ];
        }
        
        // Check if email is verified
        if (!$user['email_verified']) {
            return [
                'success' => false,
                'message' => 'Please verify your email address',
                'requires_verification' => true
            ];
        }
        
        // Clear failed attempts
        $this->clearFailedAttempts($email);
        
        // Update password hash if needed (rehashing)
        if (password_needs_rehash($user['password'], PASSWORD_DEFAULT)) {
            $this->updatePasswordHash($user['id'], $password);
        }
        
        // Create session
        $sessionData = $this->createSession($user['id'], $rememberMe);
        
        // Update last login
        $this->updateLastLogin($user['id']);
        
        // Log successful login
        $this->logSecurityEvent('login_success', $user['id'], [
            'ip' => $this->getClientIp(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
        
        return [
            'success' => true,
            'user' => $this->sanitizeUserData($user),
            'session' => $sessionData
        ];
    }
    
    /**
     * Register new user with security checks
     */
    public function register($userData)
    {
        // Validate required fields
        $required = ['name', 'email', 'password'];
        foreach ($required as $field) {
            if (empty($userData[$field])) {
                return [
                    'success' => false,
                    'message' => "The {$field} field is required"
                ];
            }
        }
        
        // Validate email
        if (!filter_var($userData['email'], FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'message' => 'Invalid email format'
            ];
        }
        
        // Check if email already exists
        if ($this->emailExists($userData['email'])) {
            return [
                'success' => false,
                'message' => 'Email address is already registered'
            ];
        }
        
        // Validate password strength
        $passwordValidation = $this->validatePasswordStrength($userData['password']);
        if (!$passwordValidation['valid']) {
            return [
                'success' => false,
                'message' => $passwordValidation['message']
            ];
        }
        
        // Hash password
        $hashedPassword = password_hash($userData['password'], PASSWORD_DEFAULT);
        
        // Generate verification token
        $verificationToken = bin2hex(random_bytes(32));
        
        try {
            // Create user
            $sql = "INSERT INTO users (name, email, password, email_verification_token, created_at, updated_at) 
                    VALUES (?, ?, ?, ?, NOW(), NOW())";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $userData['name'],
                $userData['email'],
                $hashedPassword,
                $verificationToken
            ]);
            
            $userId = $this->pdo->lastInsertId();
            
            // Log registration
            $this->logSecurityEvent('user_registered', $userId, [
                'ip' => $this->getClientIp(),
                'email' => $userData['email']
            ]);
            
            return [
                'success' => true,
                'user_id' => $userId,
                'verification_token' => $verificationToken,
                'message' => 'Registration successful. Please verify your email.'
            ];
            
        } catch (\PDOException $e) {
            return [
                'success' => false,
                'message' => 'Registration failed. Please try again.'
            ];
        }
    }
    
    /**
     * Verify email address
     */
    public function verifyEmail($token)
    {
        $sql = "SELECT id, email FROM users WHERE email_verification_token = ? AND email_verified = 0";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$token]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if (!$user) {
            return [
                'success' => false,
                'message' => 'Invalid or expired verification token'
            ];
        }
        
        // Update user as verified
        $sql = "UPDATE users SET email_verified = 1, email_verification_token = NULL, updated_at = NOW() WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$user['id']]);
        
        // Log verification
        $this->logSecurityEvent('email_verified', $user['id'], [
            'ip' => $this->getClientIp()
        ]);
        
        return [
            'success' => true,
            'message' => 'Email verified successfully'
        ];
    }
    
    /**
     * Change password with security checks
     */
    public function changePassword($userId, $currentPassword, $newPassword)
    {
        // Get current user
        $user = $this->findUserById($userId);
        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found'
            ];
        }
        
        // Verify current password
        if (!password_verify($currentPassword, $user['password'])) {
            $this->logSecurityEvent('password_change_failed', $userId, [
                'reason' => 'invalid_current_password',
                'ip' => $this->getClientIp()
            ]);
            
            return [
                'success' => false,
                'message' => 'Current password is incorrect'
            ];
        }
        
        // Validate new password strength
        $passwordValidation = $this->validatePasswordStrength($newPassword);
        if (!$passwordValidation['valid']) {
            return [
                'success' => false,
                'message' => $passwordValidation['message']
            ];
        }
        
        // Check if new password is different from current
        if (password_verify($newPassword, $user['password'])) {
            return [
                'success' => false,
                'message' => 'New password must be different from current password'
            ];
        }
        
        // Hash new password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // Update password
        $sql = "UPDATE users SET password = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$hashedPassword, $userId]);
        
        // Invalidate all existing sessions
        $this->invalidateAllUserSessions($userId);
        
        // Log password change
        $this->logSecurityEvent('password_changed', $userId, [
            'ip' => $this->getClientIp()
        ]);
        
        return [
            'success' => true,
            'message' => 'Password changed successfully'
        ];
    }
    
    /**
     * Reset password request
     */
    public function requestPasswordReset($email)
    {
        $user = $this->findUserByEmail($email);
        if (!$user) {
            // Don't reveal if email exists
            return [
                'success' => true,
                'message' => 'If the email exists, a reset link has been sent'
            ];
        }
        
        // Generate reset token
        $resetToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour
        
        // Store reset token
        $sql = "UPDATE users SET password_reset_token = ?, password_reset_expires = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$resetToken, $expiresAt, $user['id']]);
        
        // Log reset request
        $this->logSecurityEvent('password_reset_requested', $user['id'], [
            'ip' => $this->getClientIp()
        ]);
        
        return [
            'success' => true,
            'reset_token' => $resetToken,
            'message' => 'Password reset link has been sent'
        ];
    }
    
    /**
     * Reset password with token
     */
    public function resetPassword($token, $newPassword)
    {
        // Find user with valid token
        $sql = "SELECT id, email FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$token]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if (!$user) {
            return [
                'success' => false,
                'message' => 'Invalid or expired reset token'
            ];
        }
        
        // Validate new password
        $passwordValidation = $this->validatePasswordStrength($newPassword);
        if (!$passwordValidation['valid']) {
            return [
                'success' => false,
                'message' => $passwordValidation['message']
            ];
        }
        
        // Hash new password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // Update password and clear reset token
        $sql = "UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL, 
                password_changed_at = NOW(), updated_at = NOW() WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$hashedPassword, $user['id']]);
        
        // Invalidate all existing sessions
        $this->invalidateAllUserSessions($user['id']);
        
        // Log password reset
        $this->logSecurityEvent('password_reset_completed', $user['id'], [
            'ip' => $this->getClientIp()
        ]);
        
        return [
            'success' => true,
            'message' => 'Password reset successfully'
        ];
    }
    
    /**
     * Logout user
     */
    public function logout($sessionId = null)
    {
        $sessionId = $sessionId ?: session_id();
        
        if ($sessionId) {
            // Get user ID before destroying session
            $userId = $this->getUserIdFromSession($sessionId);
            
            // Destroy session
            $this->destroySession($sessionId);
            
            // Log logout
            if ($userId) {
                $this->logSecurityEvent('logout', $userId, [
                    'ip' => $this->getClientIp()
                ]);
            }
        }
        
        return [
            'success' => true,
            'message' => 'Logged out successfully'
        ];
    }
    
    /**
     * Validate current session
     */
    public function validateSession($sessionId = null)
    {
        $sessionId = $sessionId ?: session_id();
        
        if (!$sessionId) {
            return false;
        }
        
        $sql = "SELECT s.*, u.id as user_id, u.email, u.name, u.role, u.is_active 
                FROM user_sessions s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.id = ? AND s.expires_at > NOW() AND u.is_active = 1";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if (!$session) {
            return false;
        }
        
        // Update last activity
        $this->updateSessionActivity($sessionId);
        
        return $this->sanitizeUserData($session);
    }
    
    /**
     * Private helper methods
     */
    private function startSecureSession()
    {
        if (session_status() === PHP_SESSION_NONE) {
            // Secure session configuration
            ini_set('session.cookie_httponly', 1);
            ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
            ini_set('session.use_strict_mode', 1);
            ini_set('session.cookie_samesite', 'Strict');
            
            session_start();
            
            // Regenerate session ID periodically
            if (!isset($_SESSION['last_regeneration'])) {
                session_regenerate_id(true);
                $_SESSION['last_regeneration'] = time();
            } elseif (time() - $_SESSION['last_regeneration'] > 300) { // 5 minutes
                session_regenerate_id(true);
                $_SESSION['last_regeneration'] = time();
            }
        }
    }
    
    private function isRateLimited($email)
    {
        $sql = "SELECT COUNT(*) as attempts, MAX(attempted_at) as last_attempt 
                FROM login_attempts 
                WHERE email = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL ? SECOND)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$email, $this->lockoutDuration]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        return $result['attempts'] >= $this->maxLoginAttempts;
    }
    
    private function recordFailedAttempt($email, $userId = null)
    {
        $sql = "INSERT INTO login_attempts (email, user_id, ip_address, user_agent, attempted_at) 
                VALUES (?, ?, ?, ?, NOW())";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $email,
            $userId,
            $this->getClientIp(),
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
        
        // Lock account if too many attempts
        if ($userId && $this->getFailedAttemptCount($email) >= $this->maxLoginAttempts) {
            $this->lockAccount($userId);
        }
    }
    
    private function clearFailedAttempts($email)
    {
        $sql = "DELETE FROM login_attempts WHERE email = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$email]);
    }
    
    private function validatePasswordStrength($password)
    {
        if (strlen($password) < $this->passwordMinLength) {
            return [
                'valid' => false,
                'message' => "Password must be at least {$this->passwordMinLength} characters long"
            ];
        }
        
        if ($this->requireStrongPassword) {
            if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/', $password)) {
                return [
                    'valid' => false,
                    'message' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                ];
            }
        }
        
        return ['valid' => true];
    }
    
    private function createSession($userId, $rememberMe = false)
    {
        $sessionId = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + ($rememberMe ? 2592000 : $this->sessionLifetime)); // 30 days or 1 hour
        
        $sql = "INSERT INTO user_sessions (id, user_id, expires_at, created_at, last_activity) 
                VALUES (?, ?, ?, NOW(), NOW())";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$sessionId, $userId, $expiresAt]);
        
        return [
            'session_id' => $sessionId,
            'expires_at' => $expiresAt
        ];
    }
    
    private function findUserByEmail($email)
    {
        $sql = "SELECT * FROM users WHERE email = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$email]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
    
    private function findUserById($id)
    {
        $sql = "SELECT * FROM users WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
    
    private function sanitizeUserData($user)
    {
        unset($user['password'], $user['password_reset_token'], $user['email_verification_token']);
        return $user;
    }
    
    private function getClientIp()
    {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (isset($_SERVER[$key]) && !empty($_SERVER[$key])) {
                $ips = explode(',', $_SERVER[$key]);
                return trim($ips[0]);
            }
        }
        
        return 'unknown';
    }
    
    private function logSecurityEvent($event, $userId, $data = [])
    {
        $sql = "INSERT INTO security_logs (user_id, event_type, event_data, ip_address, user_agent, created_at) 
                VALUES (?, ?, ?, ?, ?, NOW())";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $userId,
            $event,
            json_encode($data),
            $this->getClientIp(),
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    }

    private function emailExists($email)
    {
        $sql = "SELECT COUNT(*) FROM users WHERE email = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$email]);
        return $stmt->fetchColumn() > 0;
    }

    private function updatePasswordHash($userId, $password)
    {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $sql = "UPDATE users SET password = ? WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$hashedPassword, $userId]);
    }

    private function updateLastLogin($userId)
    {
        $sql = "UPDATE users SET last_login_at = NOW() WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
    }

    private function getLockoutTime($email)
    {
        $sql = "SELECT DATE_ADD(MAX(attempted_at), INTERVAL ? SECOND) as lockout_until
                FROM login_attempts WHERE email = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$this->lockoutDuration, $email]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $result['lockout_until'];
    }

    private function getFailedAttemptCount($email)
    {
        $sql = "SELECT COUNT(*) FROM login_attempts
                WHERE email = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL ? SECOND)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$email, $this->lockoutDuration]);
        return $stmt->fetchColumn();
    }

    private function lockAccount($userId)
    {
        $lockUntil = date('Y-m-d H:i:s', time() + $this->lockoutDuration);
        $sql = "UPDATE users SET locked_until = ? WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$lockUntil, $userId]);
    }

    private function invalidateAllUserSessions($userId)
    {
        $sql = "DELETE FROM user_sessions WHERE user_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
    }

    private function destroySession($sessionId)
    {
        $sql = "DELETE FROM user_sessions WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$sessionId]);
    }

    private function getUserIdFromSession($sessionId)
    {
        $sql = "SELECT user_id FROM user_sessions WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$sessionId]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $result ? $result['user_id'] : null;
    }

    private function updateSessionActivity($sessionId)
    {
        $sql = "UPDATE user_sessions SET last_activity = NOW() WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$sessionId]);
    }
}
