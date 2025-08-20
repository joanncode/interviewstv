<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\User;
use App\Services\AuthService;
use App\Services\Validator;
use App\Exceptions\ValidationException;

class UserController
{
    protected $authService;
    
    public function __construct()
    {
        $this->authService = new AuthService();
    }
    
    public function index(Request $request)
    {
        try {
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50); // Max 50 per page
            $search = $request->input('search');
            $role = $request->input('role');
            
            $result = User::getAll($page, $limit, $search, $role);
            
            return Response::paginated(
                $result['users'],
                $result['total'],
                $page,
                $limit,
                'Users retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve users: ' . $e->getMessage());
        }
    }
    
    public function show(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();
            
            $user = User::findByUsername($username);
            
            if (!$user) {
                return Response::notFound('User not found');
            }
            
            $userData = User::sanitize($user);
            
            // Add additional profile data
            $userData['is_following'] = false;
            $userData['is_followed_by'] = false;
            
            if ($currentUser) {
                $userData['is_following'] = User::isFollowing($currentUser['id'], $user['id']);
                $userData['is_followed_by'] = User::isFollowing($user['id'], $currentUser['id']);
            }
            
            // Get recent activity (interviews, etc.)
            // TODO: Add interview count and recent interviews
            
            return Response::success($userData, 'User profile retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve user profile: ' . $e->getMessage());
        }
    }
    
    public function update(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();
            
            // Check if user can update this profile
            if (!$currentUser || $currentUser['username'] !== $username) {
                return Response::forbidden('You can only update your own profile');
            }
            
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data);
            
            if (isset($data['username'])) {
                $validator->username('username')
                         ->unique('username', 'users', 'username', $currentUser['id']);
            }
            
            if (isset($data['email'])) {
                $validator->email('email')
                         ->unique('email', 'users', 'email', $currentUser['id']);
            }
            
            if (isset($data['bio'])) {
                $validator->max('bio', 500);
            }
            
            if (isset($data['role'])) {
                // Only admins can change roles
                if (!$this->authService->hasRole($currentUser, 'admin')) {
                    return Response::forbidden('You cannot change your role');
                }
                $validator->in('role', ['user', 'interviewer', 'interviewee', 'promoter', 'admin']);
            }
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Update user
            $allowedFields = ['username', 'email', 'bio'];
            if ($this->authService->hasRole($currentUser, 'admin')) {
                $allowedFields[] = 'role';
            }
            
            $updateData = [];
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = $data[$field];
                }
            }
            
            if (empty($updateData)) {
                return Response::error('No valid fields to update', 400);
            }
            
            $updatedUser = User::update($currentUser['id'], $updateData);
            
            return Response::success(
                User::sanitize($updatedUser),
                'Profile updated successfully'
            );
            
        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to update profile: ' . $e->getMessage());
        }
    }
    
    public function delete(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();
            
            $targetUser = User::findByUsername($username);
            
            if (!$targetUser) {
                return Response::notFound('User not found');
            }
            
            // Check permissions
            $canDelete = false;
            
            if ($currentUser['username'] === $username) {
                // User deleting their own account
                $canDelete = true;
            } elseif ($this->authService->hasRole($currentUser, 'admin')) {
                // Admin deleting another user
                $canDelete = true;
            }
            
            if (!$canDelete) {
                return Response::forbidden('You cannot delete this user account');
            }
            
            // TODO: Handle cascading deletes (interviews, comments, etc.)
            User::delete($targetUser['id']);
            
            return Response::success(null, 'User account deleted successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to delete user account: ' . $e->getMessage());
        }
    }
    
    public function followers(Request $request)
    {
        try {
            $username = $request->route('username');
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            
            $user = User::findByUsername($username);
            
            if (!$user) {
                return Response::notFound('User not found');
            }
            
            $result = User::getFollowers($user['id'], $page, $limit);
            
            return Response::paginated(
                $result['followers'],
                $result['total'],
                $page,
                $limit,
                'Followers retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve followers: ' . $e->getMessage());
        }
    }
    
    public function following(Request $request)
    {
        try {
            $username = $request->route('username');
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            
            $user = User::findByUsername($username);
            
            if (!$user) {
                return Response::notFound('User not found');
            }
            
            $result = User::getFollowing($user['id'], $page, $limit);
            
            return Response::paginated(
                $result['following'],
                $result['total'],
                $page,
                $limit,
                'Following retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve following: ' . $e->getMessage());
        }
    }
    
    public function follow(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();
            
            $targetUser = User::findByUsername($username);
            
            if (!$targetUser) {
                return Response::notFound('User not found');
            }
            
            if ($currentUser['id'] == $targetUser['id']) {
                return Response::error('You cannot follow yourself', 400);
            }
            
            // Check if already following
            if (User::isFollowing($currentUser['id'], $targetUser['id'])) {
                return Response::error('You are already following this user', 400);
            }
            
            User::follow($currentUser['id'], $targetUser['id']);
            
            // TODO: Create notification for the followed user
            
            return Response::success([
                'following' => true,
                'follower_count' => User::getFollowerCount($targetUser['id'])
            ], 'Successfully followed user');
            
        } catch (\Exception $e) {
            return Response::error('Failed to follow user: ' . $e->getMessage());
        }
    }
    
    public function unfollow(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();
            
            $targetUser = User::findByUsername($username);
            
            if (!$targetUser) {
                return Response::notFound('User not found');
            }
            
            // Check if actually following
            if (!User::isFollowing($currentUser['id'], $targetUser['id'])) {
                return Response::error('You are not following this user', 400);
            }
            
            User::unfollow($currentUser['id'], $targetUser['id']);
            
            return Response::success([
                'following' => false,
                'follower_count' => User::getFollowerCount($targetUser['id'])
            ], 'Successfully unfollowed user');
            
        } catch (\Exception $e) {
            return Response::error('Failed to unfollow user: ' . $e->getMessage());
        }
    }
}
