<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\User;
use App\Services\AuthService;
use App\Services\Validator;
use App\Exceptions\ValidationException;

class AuthController
{
    protected $authService;
    
    public function __construct()
    {
        $this->authService = new AuthService();
    }
    
    public function register(Request $request)
    {
        try {
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('username')
                ->required('email')
                ->required('password')
                ->username('username')
                ->email('email')
                ->min('password', 8)
                ->password('password')
                ->unique('username', 'users')
                ->unique('email', 'users')
                ->in('role', ['user', 'interviewer', 'interviewee', 'promoter']);
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Create user
            $userData = [
                'username' => $data['username'],
                'email' => $data['email'],
                'password' => $this->authService->hashPassword($data['password']),
                'role' => $data['role'] ?? 'user',
                'bio' => $data['bio'] ?? null,
                'verified' => false
            ];
            
            $user = User::create($userData);
            
            // Generate email verification token
            $verificationToken = $this->authService->generateEmailVerificationToken($user['id']);
            
            // TODO: Send verification email
            
            return Response::success([
                'user' => User::sanitize($user),
                'verification_token' => $verificationToken
            ], 'User registered successfully. Please verify your email.');
            
        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Registration failed: ' . $e->getMessage());
        }
    }
    
    public function login(Request $request)
    {
        try {
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('email')
                ->required('password')
                ->email('email');
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Find user
            $user = User::findByEmail($data['email']);
            
            if (!$user || !$this->authService->verifyPassword($data['password'], $user['password'])) {
                return Response::error('Invalid credentials', 401);
            }
            
            // Check if email is verified (optional for development)
            if (!$user['verified'] && config('auth.require_email_verification', false)) {
                return Response::error('Please verify your email address before logging in', 401);
            }
            
            // Generate JWT token
            $token = $this->authService->generateToken($user);
            
            return Response::success([
                'user' => User::sanitize($user),
                'token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => config('auth.jwt.ttl', 60) * 60 // Convert minutes to seconds
            ], 'Login successful');
            
        } catch (\Exception $e) {
            return Response::error('Login failed: ' . $e->getMessage());
        }
    }
    
    public function logout(Request $request)
    {
        // For JWT, logout is handled client-side by removing the token
        // In a more complex setup, you might maintain a blacklist
        return Response::success(null, 'Logout successful');
    }
    
    public function me(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return Response::unauthorized('User not authenticated');
            }
            
            return Response::success(User::sanitize($user));
            
        } catch (\Exception $e) {
            return Response::error('Failed to get user data: ' . $e->getMessage());
        }
    }
    
    public function verifyEmail(Request $request)
    {
        try {
            $data = $request->all();
            
            $validator = Validator::make($data)
                ->required('token');
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            $userId = $this->authService->verifyEmailToken($data['token']);
            
            if (!$userId) {
                return Response::error('Invalid or expired verification token', 400);
            }
            
            User::update($userId, ['verified' => true]);
            
            return Response::success(null, 'Email verified successfully');
            
        } catch (\Exception $e) {
            return Response::error('Email verification failed: ' . $e->getMessage());
        }
    }
    
    public function resendVerification(Request $request)
    {
        try {
            $data = $request->all();
            
            $validator = Validator::make($data)
                ->required('email')
                ->email('email');
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            $user = User::findByEmail($data['email']);
            
            if (!$user) {
                return Response::error('User not found', 404);
            }
            
            if ($user['verified']) {
                return Response::error('Email already verified', 400);
            }
            
            $verificationToken = $this->authService->generateEmailVerificationToken($user['id']);
            
            // TODO: Send verification email
            
            return Response::success([
                'verification_token' => $verificationToken
            ], 'Verification email sent');
            
        } catch (\Exception $e) {
            return Response::error('Failed to resend verification: ' . $e->getMessage());
        }
    }
    
    public function forgotPassword(Request $request)
    {
        try {
            $data = $request->all();
            
            $validator = Validator::make($data)
                ->required('email')
                ->email('email');
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            $user = User::findByEmail($data['email']);
            
            if (!$user) {
                // Don't reveal if email exists
                return Response::success(null, 'If the email exists, a reset link has been sent');
            }
            
            $resetToken = $this->authService->generatePasswordResetToken($user['id']);
            
            // TODO: Send password reset email
            
            return Response::success([
                'reset_token' => $resetToken // Remove this in production
            ], 'If the email exists, a reset link has been sent');
            
        } catch (\Exception $e) {
            return Response::error('Failed to process password reset: ' . $e->getMessage());
        }
    }
    
    public function resetPassword(Request $request)
    {
        try {
            $data = $request->all();
            
            $validator = Validator::make($data)
                ->required('token')
                ->required('password')
                ->min('password', 8)
                ->password('password');
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            $userId = $this->authService->verifyPasswordResetToken($data['token']);
            
            if (!$userId) {
                return Response::error('Invalid or expired reset token', 400);
            }
            
            $hashedPassword = $this->authService->hashPassword($data['password']);
            User::update($userId, ['password' => $hashedPassword]);
            
            return Response::success(null, 'Password reset successfully');
            
        } catch (\Exception $e) {
            return Response::error('Password reset failed: ' . $e->getMessage());
        }
    }
    
    public function refresh(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return Response::unauthorized('User not authenticated');
            }
            
            // Generate new token
            $token = $this->authService->generateToken($user);
            
            return Response::success([
                'token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => config('auth.jwt.ttl', 60) * 60
            ], 'Token refreshed successfully');
            
        } catch (\Exception $e) {
            return Response::error('Token refresh failed: ' . $e->getMessage());
        }
    }
}
