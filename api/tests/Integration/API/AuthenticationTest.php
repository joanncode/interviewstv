<?php

namespace Tests\Integration\API;

use Tests\TestCase;
use App\Controllers\AuthController;

class AuthenticationTest extends TestCase
{
    public function testUserRegistration()
    {
        $userData = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123'
        ];
        
        $request = $this->createRequest('POST', '/api/auth/register', $userData);
        $controller = new AuthController();
        $response = $controller->register($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertArrayHasKey('user', $data['data']);
        $this->assertArrayHasKey('token', $data['data']);
        $this->assertEquals($userData['name'], $data['data']['user']['name']);
        $this->assertEquals($userData['email'], $data['data']['user']['email']);
        
        $this->assertDatabaseHas('users', [
            'name' => $userData['name'],
            'email' => $userData['email']
        ]);
    }
    
    public function testUserRegistrationWithInvalidData()
    {
        $userData = [
            'name' => '',
            'email' => 'invalid-email',
            'password' => '123',
            'password_confirmation' => '456'
        ];
        
        $request = $this->createRequest('POST', '/api/auth/register', $userData);
        $controller = new AuthController();
        $response = $controller->register($request);
        
        $this->assertErrorResponse($response, 400);
    }
    
    public function testUserRegistrationWithDuplicateEmail()
    {
        $userData = [
            'name' => 'John Doe',
            'email' => $this->testUser['email'], // Use existing email
            'password' => 'password123',
            'password_confirmation' => 'password123'
        ];
        
        $request = $this->createRequest('POST', '/api/auth/register', $userData);
        $controller = new AuthController();
        $response = $controller->register($request);
        
        $this->assertErrorResponse($response, 400, 'Email already exists');
    }
    
    public function testUserLogin()
    {
        $loginData = [
            'email' => $this->testUser['email'],
            'password' => 'password123'
        ];
        
        $request = $this->createRequest('POST', '/api/auth/login', $loginData);
        $controller = new AuthController();
        $response = $controller->login($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertArrayHasKey('user', $data['data']);
        $this->assertArrayHasKey('token', $data['data']);
        $this->assertEquals($this->testUser['id'], $data['data']['user']['id']);
        $this->assertEquals($this->testUser['email'], $data['data']['user']['email']);
        
        // Check that session was created
        $this->assertDatabaseHas('user_sessions', [
            'user_id' => $this->testUser['id']
        ]);
    }
    
    public function testUserLoginWithInvalidCredentials()
    {
        $loginData = [
            'email' => $this->testUser['email'],
            'password' => 'wrongpassword'
        ];
        
        $request = $this->createRequest('POST', '/api/auth/login', $loginData);
        $controller = new AuthController();
        $response = $controller->login($request);
        
        $this->assertErrorResponse($response, 401, 'Invalid credentials');
    }
    
    public function testUserLoginWithNonexistentEmail()
    {
        $loginData = [
            'email' => 'nonexistent@example.com',
            'password' => 'password123'
        ];
        
        $request = $this->createRequest('POST', '/api/auth/login', $loginData);
        $controller = new AuthController();
        $response = $controller->login($request);
        
        $this->assertErrorResponse($response, 401, 'Invalid credentials');
    }
    
    public function testGetCurrentUser()
    {
        $request = $this->createAuthenticatedRequest('GET', '/api/auth/user');
        $controller = new AuthController();
        $response = $controller->user($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertArrayHasKey('user', $data['data']);
        $this->assertEquals($this->testUser['id'], $data['data']['user']['id']);
        $this->assertEquals($this->testUser['email'], $data['data']['user']['email']);
    }
    
    public function testGetCurrentUserUnauthenticated()
    {
        $request = $this->createRequest('GET', '/api/auth/user');
        $controller = new AuthController();
        $response = $controller->user($request);
        
        $this->assertErrorResponse($response, 401, 'Authentication required');
    }
    
    public function testUserLogout()
    {
        $request = $this->createAuthenticatedRequest('POST', '/api/auth/logout');
        $controller = new AuthController();
        $response = $controller->logout($request);
        
        $this->assertSuccessResponse($response, 'Logged out successfully');
        
        // Check that session was deleted
        $this->assertDatabaseMissing('user_sessions', [
            'user_id' => $this->testUser['id']
        ]);
    }
    
    public function testPasswordReset()
    {
        $resetData = [
            'email' => $this->testUser['email']
        ];
        
        $request = $this->createRequest('POST', '/api/auth/password/reset', $resetData);
        $controller = new AuthController();
        $response = $controller->requestPasswordReset($request);
        
        $this->assertSuccessResponse($response, 'Password reset email sent');
        
        // In a real implementation, this would check for password reset token creation
        // For now, we just verify the response
    }
    
    public function testPasswordResetWithInvalidEmail()
    {
        $resetData = [
            'email' => 'nonexistent@example.com'
        ];
        
        $request = $this->createRequest('POST', '/api/auth/password/reset', $resetData);
        $controller = new AuthController();
        $response = $controller->requestPasswordReset($request);
        
        $this->assertErrorResponse($response, 404, 'User not found');
    }
    
    public function testUpdateProfile()
    {
        $updateData = [
            'name' => 'Updated Name',
            'bio' => 'Updated bio',
            'location' => 'New York'
        ];
        
        $request = $this->createAuthenticatedRequest('PUT', '/api/auth/profile', $updateData);
        $controller = new AuthController();
        $response = $controller->updateProfile($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertEquals($updateData['name'], $data['data']['user']['name']);
        $this->assertEquals($updateData['bio'], $data['data']['user']['bio']);
        $this->assertEquals($updateData['location'], $data['data']['user']['location']);
        
        $this->assertDatabaseHas('users', [
            'id' => $this->testUser['id'],
            'name' => $updateData['name'],
            'bio' => $updateData['bio'],
            'location' => $updateData['location']
        ]);
    }
    
    public function testChangePassword()
    {
        $passwordData = [
            'current_password' => 'password123',
            'new_password' => 'newpassword123',
            'new_password_confirmation' => 'newpassword123'
        ];
        
        $request = $this->createAuthenticatedRequest('PUT', '/api/auth/password', $passwordData);
        $controller = new AuthController();
        $response = $controller->changePassword($request);
        
        $this->assertSuccessResponse($response, 'Password updated successfully');
        
        // Verify new password works
        $loginData = [
            'email' => $this->testUser['email'],
            'password' => 'newpassword123'
        ];
        
        $loginRequest = $this->createRequest('POST', '/api/auth/login', $loginData);
        $loginResponse = $controller->login($loginRequest);
        
        $this->assertSuccessResponse($loginResponse);
    }
    
    public function testChangePasswordWithWrongCurrentPassword()
    {
        $passwordData = [
            'current_password' => 'wrongpassword',
            'new_password' => 'newpassword123',
            'new_password_confirmation' => 'newpassword123'
        ];
        
        $request = $this->createAuthenticatedRequest('PUT', '/api/auth/password', $passwordData);
        $controller = new AuthController();
        $response = $controller->changePassword($request);
        
        $this->assertErrorResponse($response, 400, 'Current password is incorrect');
    }
    
    public function testChangePasswordWithMismatchedConfirmation()
    {
        $passwordData = [
            'current_password' => 'password123',
            'new_password' => 'newpassword123',
            'new_password_confirmation' => 'differentpassword'
        ];
        
        $request = $this->createAuthenticatedRequest('PUT', '/api/auth/password', $passwordData);
        $controller = new AuthController();
        $response = $controller->changePassword($request);
        
        $this->assertErrorResponse($response, 400, 'Password confirmation does not match');
    }
    
    public function testSessionExpiration()
    {
        // Create expired session
        $expiredSessionId = bin2hex(random_bytes(32));
        $expiredTime = date('Y-m-d H:i:s', time() - 3600); // Expired 1 hour ago
        
        $sql = "INSERT INTO user_sessions (id, user_id, expires_at, created_at) 
                VALUES (?, ?, ?, ?)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $expiredSessionId,
            $this->testUser['id'],
            $expiredTime,
            date('Y-m-d H:i:s')
        ]);
        
        // Try to use expired session
        $headers = ['Authorization' => 'Bearer ' . $expiredSessionId];
        $request = $this->createRequest('GET', '/api/auth/user', [], $headers);
        $controller = new AuthController();
        $response = $controller->user($request);
        
        $this->assertErrorResponse($response, 401, 'Session expired');
    }
    
    public function testEmailVerification()
    {
        // Create unverified user
        $user = $this->createUser([
            'email_verified' => false
        ]);
        
        $verificationToken = bin2hex(random_bytes(32));
        
        $request = $this->createRequest('GET', '/api/auth/verify-email', [
            'token' => $verificationToken,
            'user_id' => $user['id']
        ]);
        
        $controller = new AuthController();
        $response = $controller->verifyEmail($request);
        
        $this->assertSuccessResponse($response, 'Email verified successfully');
        
        $this->assertDatabaseHas('users', [
            'id' => $user['id'],
            'email_verified' => true
        ]);
    }
}
