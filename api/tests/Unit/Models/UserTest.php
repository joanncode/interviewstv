<?php

namespace Tests\Unit\Models;

use Tests\TestCase;
use App\Models\User;

class UserTest extends TestCase
{
    public function testCreateUser()
    {
        $userData = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123'
        ];
        
        $user = User::create($userData);
        
        $this->assertNotNull($user);
        $this->assertEquals($userData['name'], $user['name']);
        $this->assertEquals($userData['email'], $user['email']);
        $this->assertTrue(password_verify($userData['password'], $user['password']));
        $this->assertDatabaseHas('users', [
            'name' => $userData['name'],
            'email' => $userData['email']
        ]);
    }
    
    public function testCreateUserWithDuplicateEmail()
    {
        $userData = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123'
        ];
        
        // Create first user
        User::create($userData);
        
        // Try to create second user with same email
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Email already exists');
        
        User::create($userData);
    }
    
    public function testFindUserById()
    {
        $user = User::findById($this->testUser['id']);
        
        $this->assertNotNull($user);
        $this->assertEquals($this->testUser['id'], $user['id']);
        $this->assertEquals($this->testUser['email'], $user['email']);
    }
    
    public function testFindUserByIdNotFound()
    {
        $user = User::findById(99999);
        
        $this->assertNull($user);
    }
    
    public function testFindUserByEmail()
    {
        $user = User::findByEmail($this->testUser['email']);
        
        $this->assertNotNull($user);
        $this->assertEquals($this->testUser['id'], $user['id']);
        $this->assertEquals($this->testUser['email'], $user['email']);
    }
    
    public function testFindUserByEmailNotFound()
    {
        $user = User::findByEmail('nonexistent@example.com');
        
        $this->assertNull($user);
    }
    
    public function testUpdateUser()
    {
        $updateData = [
            'name' => 'Updated Name',
            'bio' => 'Updated bio'
        ];
        
        $success = User::update($this->testUser['id'], $updateData);
        
        $this->assertTrue($success);
        
        $updatedUser = User::findById($this->testUser['id']);
        $this->assertEquals($updateData['name'], $updatedUser['name']);
        $this->assertEquals($updateData['bio'], $updatedUser['bio']);
        
        $this->assertDatabaseHas('users', [
            'id' => $this->testUser['id'],
            'name' => $updateData['name'],
            'bio' => $updateData['bio']
        ]);
    }
    
    public function testDeleteUser()
    {
        $userId = $this->testUser['id'];
        
        $success = User::delete($userId);
        
        $this->assertTrue($success);
        
        $deletedUser = User::findById($userId);
        $this->assertNull($deletedUser);
        
        $this->assertDatabaseMissing('users', [
            'id' => $userId
        ]);
    }
    
    public function testVerifyPassword()
    {
        $password = 'password123';
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        $user = $this->createUser([
            'password' => $hashedPassword
        ]);
        
        $this->assertTrue(User::verifyPassword($user['id'], $password));
        $this->assertFalse(User::verifyPassword($user['id'], 'wrongpassword'));
    }
    
    public function testUpdatePassword()
    {
        $newPassword = 'newpassword123';
        
        $success = User::updatePassword($this->testUser['id'], $newPassword);
        
        $this->assertTrue($success);
        $this->assertTrue(User::verifyPassword($this->testUser['id'], $newPassword));
    }
    
    public function testGetUserStats()
    {
        $userId = $this->testUser['id'];
        
        // Create some test data
        $interviewId = $this->createInterview($userId);
        $this->createComment('interview', $interviewId, $this->adminUser['id']);
        
        $stats = User::getUserStats($userId);
        
        $this->assertIsArray($stats);
        $this->assertArrayHasKey('interviews_count', $stats);
        $this->assertArrayHasKey('followers_count', $stats);
        $this->assertArrayHasKey('following_count', $stats);
        $this->assertEquals(1, $stats['interviews_count']);
    }
    
    public function testGetUserProfile()
    {
        $profile = User::getUserProfile($this->testUser['id']);
        
        $this->assertIsArray($profile);
        $this->assertArrayHasKey('user', $profile);
        $this->assertArrayHasKey('stats', $profile);
        $this->assertArrayHasKey('recent_interviews', $profile);
        
        $this->assertEquals($this->testUser['id'], $profile['user']['id']);
    }
    
    public function testSearchUsers()
    {
        // Create additional test users
        $this->createUser([
            'name' => 'Alice Johnson',
            'email' => 'alice@example.com'
        ]);
        
        $this->createUser([
            'name' => 'Bob Smith',
            'email' => 'bob@example.com'
        ]);
        
        // Search by name
        $results = User::search('Alice');
        $this->assertCount(1, $results);
        $this->assertEquals('Alice Johnson', $results[0]['name']);
        
        // Search by partial name
        $results = User::search('Jo');
        $this->assertGreaterThanOrEqual(1, count($results));
        
        // Search with no results
        $results = User::search('NonexistentUser');
        $this->assertCount(0, $results);
    }
    
    public function testGetRecentUsers()
    {
        $recentUsers = User::getRecent(5);
        
        $this->assertIsArray($recentUsers);
        $this->assertLessThanOrEqual(5, count($recentUsers));
        
        // Check that users are ordered by creation date (newest first)
        if (count($recentUsers) > 1) {
            $firstUser = $recentUsers[0];
            $secondUser = $recentUsers[1];
            
            $this->assertGreaterThanOrEqual(
                strtotime($secondUser['created_at']),
                strtotime($firstUser['created_at'])
            );
        }
    }
    
    public function testUserEmailVerification()
    {
        $user = $this->createUser([
            'email_verified' => false
        ]);
        
        $this->assertFalse($user['email_verified']);
        
        $success = User::verifyEmail($user['id']);
        
        $this->assertTrue($success);
        
        $verifiedUser = User::findById($user['id']);
        $this->assertTrue($verifiedUser['email_verified']);
    }
    
    public function testUserRoleManagement()
    {
        $this->assertEquals('user', $this->testUser['role']);
        $this->assertEquals('admin', $this->adminUser['role']);
        
        // Test role update
        $success = User::updateRole($this->testUser['id'], 'moderator');
        
        $this->assertTrue($success);
        
        $updatedUser = User::findById($this->testUser['id']);
        $this->assertEquals('moderator', $updatedUser['role']);
    }
    
    public function testUserValidation()
    {
        // Test invalid email
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invalid email format');
        
        User::create([
            'name' => 'Test User',
            'email' => 'invalid-email',
            'password' => 'password123'
        ]);
    }
    
    public function testUserPasswordValidation()
    {
        // Test short password
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Password must be at least 8 characters');
        
        User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => '123'
        ]);
    }
    
    public function testUserNameValidation()
    {
        // Test empty name
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Name is required');
        
        User::create([
            'name' => '',
            'email' => 'test@example.com',
            'password' => 'password123'
        ]);
    }
    
    public function testGetUserFollowers()
    {
        $followerId = $this->adminUser['id'];
        $followedId = $this->testUser['id'];
        
        // Create follow relationship
        $sql = "INSERT INTO follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$followerId, $followedId, date('Y-m-d H:i:s')]);
        
        $followers = User::getFollowers($followedId);
        
        $this->assertCount(1, $followers);
        $this->assertEquals($followerId, $followers[0]['id']);
    }
    
    public function testGetUserFollowing()
    {
        $followerId = $this->testUser['id'];
        $followedId = $this->adminUser['id'];
        
        // Create follow relationship
        $sql = "INSERT INTO follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$followerId, $followedId, date('Y-m-d H:i:s')]);
        
        $following = User::getFollowing($followerId);
        
        $this->assertCount(1, $following);
        $this->assertEquals($followedId, $following[0]['id']);
    }
    
    public function testIsFollowing()
    {
        $followerId = $this->testUser['id'];
        $followedId = $this->adminUser['id'];
        
        // Initially not following
        $this->assertFalse(User::isFollowing($followerId, $followedId));
        
        // Create follow relationship
        $sql = "INSERT INTO follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$followerId, $followedId, date('Y-m-d H:i:s')]);
        
        // Now following
        $this->assertTrue(User::isFollowing($followerId, $followedId));
    }
}
