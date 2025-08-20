<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\User;

class AuthService
{
    protected $secretKey;
    protected $algorithm;
    
    public function __construct()
    {
        $this->secretKey = config('auth.jwt.secret') ?: env('JWT_SECRET', 'default-secret-key');
        $this->algorithm = config('auth.jwt.algo') ?: env('JWT_ALGO', 'HS256');
    }
    
    public function generateToken($user)
    {
        $payload = [
            'iss' => config('app.url'),
            'aud' => config('app.url'),
            'iat' => time(),
            'exp' => time() + (config('auth.jwt.ttl') * 60), // TTL in minutes
            'user_id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        
        return JWT::encode($payload, $this->secretKey, $this->algorithm);
    }
    
    public function validateToken($token)
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, $this->algorithm));
            $payload = (array) $decoded;
            
            // Check if token is expired
            if ($payload['exp'] < time()) {
                return false;
            }
            
            // Get fresh user data
            $user = User::findById($payload['user_id']);
            
            if (!$user) {
                return false;
            }
            
            return $user;
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    public function hashPassword($password)
    {
        $rounds = config('auth.bcrypt_rounds', 12);
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => $rounds]);
    }
    
    public function verifyPassword($password, $hash)
    {
        return password_verify($password, $hash);
    }
    
    public function generateEmailVerificationToken($userId)
    {
        $payload = [
            'type' => 'email_verification',
            'user_id' => $userId,
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60) // 24 hours
        ];
        
        return JWT::encode($payload, $this->secretKey, $this->algorithm);
    }
    
    public function verifyEmailToken($token)
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, $this->algorithm));
            $payload = (array) $decoded;
            
            if ($payload['type'] !== 'email_verification') {
                return false;
            }
            
            if ($payload['exp'] < time()) {
                return false;
            }
            
            return $payload['user_id'];
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    public function generatePasswordResetToken($userId)
    {
        $payload = [
            'type' => 'password_reset',
            'user_id' => $userId,
            'iat' => time(),
            'exp' => time() + (60 * 60) // 1 hour
        ];
        
        return JWT::encode($payload, $this->secretKey, $this->algorithm);
    }
    
    public function verifyPasswordResetToken($token)
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, $this->algorithm));
            $payload = (array) $decoded;
            
            if ($payload['type'] !== 'password_reset') {
                return false;
            }
            
            if ($payload['exp'] < time()) {
                return false;
            }
            
            return $payload['user_id'];
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    public function hasRole($user, $requiredRole)
    {
        $roleHierarchy = [
            'user' => 1,
            'interviewee' => 2,
            'interviewer' => 3,
            'promoter' => 4,
            'admin' => 5
        ];
        
        $userLevel = $roleHierarchy[$user['role']] ?? 0;
        $requiredLevel = $roleHierarchy[$requiredRole] ?? 0;
        
        return $userLevel >= $requiredLevel;
    }
    
    public function canCreateInterview($user)
    {
        return $this->hasRole($user, 'interviewer');
    }
    
    public function canCreateEvent($user)
    {
        return $this->hasRole($user, 'promoter');
    }
    
    public function canModerate($user)
    {
        return $this->hasRole($user, 'admin');
    }
}
