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

            // Check if current user can view this profile
            $viewerId = $currentUser ? $currentUser['id'] : null;
            if (!User::canViewProfile($user['id'], $viewerId)) {
                return Response::forbidden('This profile is private');
            }

            $userData = User::sanitize($user);

            // Add additional profile data
            $userData['is_following'] = false;
            $userData['is_followed_by'] = false;

            if ($currentUser) {
                $userData['is_following'] = User::isFollowing($currentUser['id'], $user['id']);
                $userData['is_followed_by'] = User::isFollowing($user['id'], $currentUser['id']);
            }

            // Add comprehensive profile statistics
            $stats = User::getProfileStats($user['id']);
            $userData = array_merge($userData, $stats);
            
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

            if (isset($data['profile_visibility'])) {
                $validator->in('profile_visibility', ['public', 'followers', 'private']);
            }

            if (isset($data['interview_visibility'])) {
                $validator->in('interview_visibility', ['public', 'followers', 'private']);
            }

            if (isset($data['activity_visibility'])) {
                $validator->in('activity_visibility', ['public', 'followers', 'private']);
            }
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Update user
            $allowedFields = ['username', 'email', 'bio', 'profile_visibility', 'interview_visibility', 'activity_visibility'];
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
            
            // Handle cascading deletes and cleanup
            $this->cleanupUserData($targetUser['id']);

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

            // Create follow notification
            \App\Models\Notification::createFollowNotification($currentUser['id'], $targetUser['id']);

            // Create follow activity
            \App\Models\Activity::createUserFollowedActivity(
                $currentUser['id'],
                $targetUser['id'],
                $targetUser
            );

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

            // Create unfollow notification (if enabled by user)
            \App\Models\Notification::createUnfollowNotification($currentUser['id'], $targetUser['id']);

            return Response::success([
                'following' => false,
                'follower_count' => User::getFollowerCount($targetUser['id'])
            ], 'Successfully unfollowed user');

        } catch (\Exception $e) {
            return Response::error('Failed to unfollow user: ' . $e->getMessage());
        }
    }

    public function interviews(Request $request)
    {
        try {
            $username = $request->route('username');
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            $status = $request->input('status', 'published');
            $currentUser = $request->user();

            $user = User::findByUsername($username);

            if (!$user) {
                return Response::notFound('User not found');
            }

            // Check if current user can view this user's interviews
            $viewerId = $currentUser ? $currentUser['id'] : null;
            if (!User::canViewInterviews($user['id'], $viewerId)) {
                return Response::forbidden('This user\'s interviews are private');
            }

            // Build filters for interviews
            $filters = [
                'interviewer_id' => $user['id']
            ];

            // Only show published interviews unless it's the user's own profile
            if (!$currentUser || $currentUser['id'] !== $user['id']) {
                $filters['status'] = 'published';
            } else {
                // User viewing their own profile can filter by status
                if ($status && in_array($status, ['draft', 'published', 'archived'])) {
                    $filters['status'] = $status;
                }
            }

            // Get interviews using Interview model
            $result = \App\Models\Interview::getAll($page, $limit, $filters);

            return Response::paginated(
                $result['interviews'],
                $result['total'],
                $page,
                $limit,
                'User interviews retrieved successfully'
            );

        } catch (\Exception $e) {
            return Response::error('Failed to retrieve user interviews: ' . $e->getMessage());
        }
    }

    public function stats(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();

            $user = User::findByUsername($username);

            if (!$user) {
                return Response::notFound('User not found');
            }

            // Get comprehensive statistics
            $stats = User::getProfileStats($user['id']);

            // Add additional computed stats
            $stats['avg_views_per_interview'] = $stats['interview_count'] > 0
                ? round($stats['total_views'] / $stats['interview_count'], 1)
                : 0;

            $stats['avg_likes_per_interview'] = $stats['interview_count'] > 0
                ? round($stats['total_likes'] / $stats['interview_count'], 1)
                : 0;

            // Calculate engagement rate (likes per view)
            $stats['engagement_rate'] = $stats['total_views'] > 0
                ? round(($stats['total_likes'] / $stats['total_views']) * 100, 2)
                : 0;

            // Get monthly stats for the last 6 months
            $stats['monthly_stats'] = $this->getMonthlyStats($user['id']);

            // Get category breakdown
            $stats['category_breakdown'] = $this->getCategoryBreakdown($user['id']);

            return Response::success($stats, 'User statistics retrieved successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to retrieve user statistics: ' . $e->getMessage());
        }
    }

    protected function getMonthlyStats($userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);

        $sql = "SELECT
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as interview_count,
                    COALESCE(SUM(view_count), 0) as total_views,
                    COALESCE(SUM(like_count), 0) as total_likes
                FROM interviews
                WHERE interviewer_id = ?
                    AND status = 'published'
                    AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    protected function getCategoryBreakdown($userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);

        $sql = "SELECT
                    COALESCE(category, 'Uncategorized') as category,
                    COUNT(*) as interview_count,
                    COALESCE(SUM(view_count), 0) as total_views,
                    COALESCE(SUM(like_count), 0) as total_likes
                FROM interviews
                WHERE interviewer_id = ? AND status = 'published'
                GROUP BY category
                ORDER BY interview_count DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteAccount(Request $request)
    {
        try {
            $currentUser = $request->user();
            $data = $request->all();

            // Validate input - require password confirmation
            $validator = Validator::make($data)
                ->required('password')
                ->required('confirmation');

            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }

            // Check confirmation text
            if ($data['confirmation'] !== 'DELETE') {
                return Response::error('Please type "DELETE" to confirm account deletion', 400);
            }

            // Get user from database to verify password
            $user = User::findById($currentUser['id']);

            if (!$user) {
                return Response::error('User not found', 404);
            }

            // Verify password
            if (!password_verify($data['password'], $user['password'])) {
                return Response::error('Incorrect password', 400);
            }

            // Prevent admin deletion through this endpoint
            if ($this->authService->hasRole($user, 'admin')) {
                return Response::error('Admin accounts cannot be deleted through this method', 403);
            }

            // Log account deletion
            error_log("Account deletion initiated for user ID: {$user['id']}, username: {$user['username']} at " . date('Y-m-d H:i:s'));

            // Handle cascading deletes and cleanup
            $this->cleanupUserData($user['id']);

            // Delete user account
            User::delete($user['id']);

            // Log successful deletion
            error_log("Account successfully deleted for user ID: {$user['id']} at " . date('Y-m-d H:i:s'));

            return Response::success(null, 'Account deleted successfully');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            error_log("Account deletion failed for user ID: {$currentUser['id']}: " . $e->getMessage());
            return Response::error('Account deletion failed: ' . $e->getMessage());
        }
    }

    protected function cleanupUserData($userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);

        try {
            $pdo->beginTransaction();

            // Delete user's interviews and related data
            $stmt = $pdo->prepare("DELETE FROM interview_media WHERE interview_id IN (SELECT id FROM interviews WHERE interviewer_id = ?)");
            $stmt->execute([$userId]);

            $stmt = $pdo->prepare("DELETE FROM likes WHERE likeable_type = 'interview' AND likeable_id IN (SELECT id FROM interviews WHERE interviewer_id = ?)");
            $stmt->execute([$userId]);

            $stmt = $pdo->prepare("DELETE FROM comments WHERE entity_type = 'interview' AND entity_id IN (SELECT id FROM interviews WHERE interviewer_id = ?)");
            $stmt->execute([$userId]);

            $stmt = $pdo->prepare("DELETE FROM interviews WHERE interviewer_id = ?");
            $stmt->execute([$userId]);

            // Delete user's comments
            $stmt = $pdo->prepare("DELETE FROM likes WHERE likeable_type = 'comment' AND likeable_id IN (SELECT id FROM comments WHERE user_id = ?)");
            $stmt->execute([$userId]);

            $stmt = $pdo->prepare("DELETE FROM comments WHERE user_id = ?");
            $stmt->execute([$userId]);

            // Delete user's likes
            $stmt = $pdo->prepare("DELETE FROM likes WHERE user_id = ?");
            $stmt->execute([$userId]);

            // Delete follower relationships
            $stmt = $pdo->prepare("DELETE FROM followers WHERE follower_id = ? OR followed_id = ?");
            $stmt->execute([$userId, $userId]);

            // Delete community memberships
            $stmt = $pdo->prepare("DELETE FROM community_members WHERE user_id = ?");
            $stmt->execute([$userId]);

            // Delete communities owned by user
            $stmt = $pdo->prepare("DELETE FROM community_members WHERE community_id IN (SELECT id FROM communities WHERE creator_id = ?)");
            $stmt->execute([$userId]);

            $stmt = $pdo->prepare("DELETE FROM communities WHERE creator_id = ?");
            $stmt->execute([$userId]);

            // Delete events created by user
            $stmt = $pdo->prepare("DELETE FROM events WHERE promoter_id = ?");
            $stmt->execute([$userId]);

            // Delete businesses owned by user
            $stmt = $pdo->prepare("DELETE FROM businesses WHERE owner_id = ?");
            $stmt->execute([$userId]);

            $pdo->commit();

        } catch (\Exception $e) {
            $pdo->rollBack();
            throw new \Exception('Failed to cleanup user data: ' . $e->getMessage());
        }
    }

    public function getPrivacySettings(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();

            $user = User::findByUsername($username);

            if (!$user) {
                return Response::notFound('User not found');
            }

            // Only allow users to view their own privacy settings
            if (!$currentUser || $currentUser['username'] !== $username) {
                return Response::forbidden('You can only view your own privacy settings');
            }

            $privacySettings = User::getPrivacySettings($user['id']);

            return Response::success($privacySettings, 'Privacy settings retrieved successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to retrieve privacy settings: ' . $e->getMessage());
        }
    }

    public function updatePrivacySettings(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();
            $data = $request->all();

            $user = User::findByUsername($username);

            if (!$user) {
                return Response::notFound('User not found');
            }

            // Only allow users to update their own privacy settings
            if (!$currentUser || $currentUser['username'] !== $username) {
                return Response::forbidden('You can only update your own privacy settings');
            }

            // Validate privacy settings
            $validator = Validator::make($data);

            if (isset($data['profile_visibility'])) {
                $validator->in('profile_visibility', ['public', 'followers', 'private']);
            }

            if (isset($data['interview_visibility'])) {
                $validator->in('interview_visibility', ['public', 'followers', 'private']);
            }

            if (isset($data['activity_visibility'])) {
                $validator->in('activity_visibility', ['public', 'followers', 'private']);
            }

            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }

            // Update privacy settings
            $updateData = [];
            $privacyFields = ['profile_visibility', 'interview_visibility', 'activity_visibility'];

            foreach ($privacyFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = $data[$field];
                }
            }

            if (empty($updateData)) {
                return Response::error('No privacy settings to update', 400);
            }

            User::update($user['id'], $updateData);

            // Get updated privacy settings
            $updatedSettings = User::getPrivacySettings($user['id']);

            return Response::success($updatedSettings, 'Privacy settings updated successfully');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to update privacy settings: ' . $e->getMessage());
        }
    }

    public function search(Request $request)
    {
        try {
            $query = $request->input('q', '');
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            $role = $request->input('role');
            $verified = $request->input('verified');
            $currentUser = $request->user();

            // Build search conditions
            $conditions = [];
            $params = [];

            // Search by username, email, or bio
            if (!empty($query)) {
                $conditions[] = "(username LIKE ? OR email LIKE ? OR bio LIKE ?)";
                $searchTerm = "%{$query}%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            // Filter by role
            if ($role && in_array($role, ['user', 'interviewer', 'interviewee', 'promoter'])) {
                $conditions[] = "role = ?";
                $params[] = $role;
            }

            // Filter by verified status
            if ($verified !== null) {
                $conditions[] = "verified = ?";
                $params[] = $verified ? 1 : 0;
            }

            // Only show public profiles or profiles the user can view
            if (!$currentUser) {
                $conditions[] = "profile_visibility = 'public'";
            } else {
                // For authenticated users, show public profiles and profiles they can view
                $conditions[] = "(profile_visibility = 'public' OR id = ?)";
                $params[] = $currentUser['id'];
            }

            $result = User::searchUsers($conditions, $params, $page, $limit);

            // Add relationship info for authenticated users
            if ($currentUser) {
                foreach ($result['users'] as &$user) {
                    $user['is_following'] = User::isFollowing($currentUser['id'], $user['id']);
                    $user['is_followed_by'] = User::isFollowing($user['id'], $currentUser['id']);
                }
            }

            return Response::paginated(
                $result['users'],
                $result['total'],
                $page,
                $limit,
                'User search completed successfully'
            );

        } catch (\Exception $e) {
            return Response::error('User search failed: ' . $e->getMessage());
        }
    }

    public function discover(Request $request)
    {
        try {
            $currentUser = $request->user();
            $type = $request->input('type', 'recommended');
            $limit = min((int) $request->input('limit', 20), 50);

            switch ($type) {
                case 'recommended':
                    $users = $this->getRecommendedUsers($currentUser, $limit);
                    break;
                case 'popular':
                    $users = $this->getPopularUsers($limit);
                    break;
                case 'new':
                    $users = $this->getNewUsers($limit);
                    break;
                case 'active':
                    $users = $this->getActiveUsers($limit);
                    break;
                default:
                    $users = $this->getRecommendedUsers($currentUser, $limit);
            }

            // Add relationship info for authenticated users
            if ($currentUser) {
                foreach ($users as &$user) {
                    $user['is_following'] = User::isFollowing($currentUser['id'], $user['id']);
                    $user['is_followed_by'] = User::isFollowing($user['id'], $currentUser['id']);
                }
            }

            return Response::success($users, 'User discovery completed successfully');

        } catch (\Exception $e) {
            return Response::error('User discovery failed: ' . $e->getMessage());
        }
    }

    protected function getRecommendedUsers($currentUser, $limit)
    {
        if (!$currentUser) {
            return $this->getPopularUsers($limit);
        }

        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);

        // Get users followed by people the current user follows (friends of friends)
        $sql = "SELECT DISTINCT u.*,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT f2.follower_id) as mutual_followers
                FROM users u
                LEFT JOIN interviews i ON u.id = i.interviewer_id AND i.status = 'published'
                LEFT JOIN followers f1 ON u.id = f1.followed_id
                LEFT JOIN followers f2 ON f1.follower_id = f2.followed_id AND f2.follower_id = ?
                WHERE u.id != ?
                    AND u.profile_visibility IN ('public', 'followers')
                    AND u.id NOT IN (
                        SELECT followed_id FROM followers WHERE follower_id = ?
                    )
                GROUP BY u.id
                ORDER BY mutual_followers DESC, interview_count DESC, u.created_at DESC
                LIMIT ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$currentUser['id'], $currentUser['id'], $currentUser['id'], $limit]);

        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // If not enough recommendations, fill with popular users
        if (count($users) < $limit) {
            $remaining = $limit - count($users);
            $excludeIds = array_column($users, 'id');
            $excludeIds[] = $currentUser['id'];

            $popularUsers = $this->getPopularUsers($remaining, $excludeIds);
            $users = array_merge($users, $popularUsers);
        }

        return array_map([User::class, 'sanitize'], $users);
    }

    protected function getPopularUsers($limit, $excludeIds = [])
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);

        $excludeClause = '';
        $params = [];

        if (!empty($excludeIds)) {
            $placeholders = str_repeat('?,', count($excludeIds) - 1) . '?';
            $excludeClause = "AND u.id NOT IN ({$placeholders})";
            $params = $excludeIds;
        }

        $sql = "SELECT u.*,
                       COUNT(DISTINCT f.follower_id) as follower_count,
                       COUNT(DISTINCT i.id) as interview_count,
                       COALESCE(SUM(i.view_count), 0) as total_views
                FROM users u
                LEFT JOIN followers f ON u.id = f.followed_id
                LEFT JOIN interviews i ON u.id = i.interviewer_id AND i.status = 'published'
                WHERE u.profile_visibility = 'public' {$excludeClause}
                GROUP BY u.id
                ORDER BY follower_count DESC, total_views DESC, interview_count DESC
                LIMIT ?";

        $params[] = $limit;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return array_map([User::class, 'sanitize'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    protected function getNewUsers($limit)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);

        $sql = "SELECT u.*,
                       COUNT(DISTINCT i.id) as interview_count
                FROM users u
                LEFT JOIN interviews i ON u.id = i.interviewer_id AND i.status = 'published'
                WHERE u.profile_visibility = 'public'
                    AND u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY u.id
                ORDER BY u.created_at DESC
                LIMIT ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit]);

        return array_map([User::class, 'sanitize'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    protected function getActiveUsers($limit)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);

        $sql = "SELECT u.*,
                       COUNT(DISTINCT i.id) as recent_interviews,
                       COUNT(DISTINCT c.id) as recent_comments,
                       MAX(GREATEST(
                           COALESCE(i.created_at, '1970-01-01'),
                           COALESCE(c.created_at, '1970-01-01')
                       )) as last_activity
                FROM users u
                LEFT JOIN interviews i ON u.id = i.interviewer_id
                    AND i.status = 'published'
                    AND i.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                LEFT JOIN comments c ON u.id = c.user_id
                    AND c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                WHERE u.profile_visibility = 'public'
                GROUP BY u.id
                HAVING (recent_interviews > 0 OR recent_comments > 0)
                ORDER BY last_activity DESC, recent_interviews DESC, recent_comments DESC
                LIMIT ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit]);

        return array_map([User::class, 'sanitize'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function trackProfileShare(Request $request)
    {
        try {
            $username = $request->route('username');
            $platform = $request->input('platform');
            $currentUser = $request->user();

            if (!$username) {
                return Response::error('Username is required', 400);
            }

            if (!$platform) {
                return Response::error('Platform is required', 400);
            }

            $targetUser = User::findByUsername($username);
            if (!$targetUser) {
                return Response::error('User not found', 404);
            }

            // Track the share event (could be stored in analytics table)
            $shareData = [
                'shared_user_id' => $targetUser['id'],
                'sharer_user_id' => $currentUser ? $currentUser['id'] : null,
                'platform' => $platform,
                'shared_at' => date('Y-m-d H:i:s'),
                'ip_address' => $request->getClientIp(),
                'user_agent' => $request->header('User-Agent')
            ];

            // For now, just log the share event
            error_log('Profile share tracked: ' . json_encode($shareData));

            return Response::success([
                'tracked' => true,
                'platform' => $platform
            ], 'Profile share tracked successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to track profile share: ' . $e->getMessage());
        }
    }

    public function getProfileShareStats(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();

            if (!$username) {
                return Response::error('Username is required', 400);
            }

            $targetUser = User::findByUsername($username);
            if (!$targetUser) {
                return Response::error('User not found', 404);
            }

            // Only allow users to see their own share stats
            if (!$currentUser || $currentUser['id'] !== $targetUser['id']) {
                return Response::error('Access denied', 403);
            }

            // Mock data for now - in a real implementation, this would query analytics tables
            $stats = [
                'shares_today' => 0,
                'total_shares' => 0,
                'profile_views' => $targetUser['profile_views'] ?? 0,
                'popular_platforms' => [
                    'twitter' => 0,
                    'facebook' => 0,
                    'linkedin' => 0,
                    'whatsapp' => 0
                ]
            ];

            return Response::success($stats, 'Profile share stats retrieved successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to get profile share stats: ' . $e->getMessage());
        }
    }
}
