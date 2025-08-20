<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\Comment;
use App\Models\Interview;
use App\Models\Gallery;
use App\Services\AuthService;
use App\Services\Validator;
use App\Exceptions\ValidationException;

class CommentController
{
    protected $authService;
    
    public function __construct()
    {
        $this->authService = new AuthService();
    }
    
    public function index(Request $request)
    {
        try {
            $entityType = $request->route('entityType');
            $entityId = $request->route('entityId');
            
            // Validate entity type
            if (!in_array($entityType, ['interview', 'gallery'])) {
                return Response::error('Invalid entity type', 400);
            }
            
            // Check if entity exists
            if (!$this->entityExists($entityType, $entityId)) {
                return Response::notFound('Entity not found');
            }
            
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            $sort = $request->input('sort', 'newest');
            
            $result = Comment::getForEntity($entityType, $entityId, $page, $limit, $sort);
            
            return Response::paginated(
                $result['comments'],
                $result['total'],
                $page,
                $limit,
                'Comments retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve comments: ' . $e->getMessage());
        }
    }
    
    public function create(Request $request)
    {
        try {
            $currentUser = $request->user();
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('commentable_type')
                ->required('commentable_id')
                ->required('content')
                ->in('commentable_type', ['interview', 'gallery'])
                ->numeric('commentable_id')
                ->min('content', 1)
                ->max('content', 2000);
            
            if (isset($data['parent_id'])) {
                $validator->numeric('parent_id');
            }
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Check if entity exists
            if (!$this->entityExists($data['commentable_type'], $data['commentable_id'])) {
                return Response::notFound('Entity not found');
            }
            
            // Check if parent comment exists (for replies)
            if (!empty($data['parent_id'])) {
                $parentComment = Comment::findById($data['parent_id']);
                if (!$parentComment) {
                    return Response::error('Parent comment not found', 400);
                }
                
                // Ensure parent comment belongs to the same entity
                if ($parentComment['commentable_type'] !== $data['commentable_type'] ||
                    $parentComment['commentable_id'] != $data['commentable_id']) {
                    return Response::error('Invalid parent comment', 400);
                }
            }
            
            // Create comment
            $commentData = [
                'user_id' => $currentUser['id'],
                'commentable_type' => $data['commentable_type'],
                'commentable_id' => $data['commentable_id'],
                'parent_id' => $data['parent_id'] ?? null,
                'content' => trim($data['content']),
                'ip_address' => $request->getClientIp(),
                'user_agent' => $request->header('User-Agent')
            ];
            
            $comment = Comment::create($commentData);
            
            return Response::success($comment, 'Comment posted successfully', 201);
            
        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to create comment: ' . $e->getMessage());
        }
    }
    
    public function update(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            $data = $request->all();
            
            $comment = Comment::findById($id);
            
            if (!$comment) {
                return Response::notFound('Comment not found');
            }
            
            // Check permissions
            if ($currentUser['id'] !== $comment['user_id'] && 
                !$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('You can only edit your own comments');
            }
            
            // Validate input
            $validator = Validator::make($data);
            
            if (isset($data['content'])) {
                $validator->required('content')->min('content', 1)->max('content', 2000);
            }
            
            if (isset($data['status']) && $this->authService->hasRole($currentUser, 'admin')) {
                $validator->in('status', ['published', 'pending', 'approved', 'rejected', 'hidden']);
            }
            
            if (isset($data['is_pinned']) && $this->authService->hasRole($currentUser, 'admin')) {
                $validator->boolean('is_pinned');
            }
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Regular users can only edit content
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                $data = ['content' => $data['content']];
            }
            
            $updatedComment = Comment::update($id, $data);
            
            return Response::success($updatedComment, 'Comment updated successfully');
            
        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to update comment: ' . $e->getMessage());
        }
    }
    
    public function delete(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $comment = Comment::findById($id);
            
            if (!$comment) {
                return Response::notFound('Comment not found');
            }
            
            // Check permissions
            if ($currentUser['id'] !== $comment['user_id'] && 
                !$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('You can only delete your own comments');
            }
            
            Comment::delete($id);
            
            return Response::success(null, 'Comment deleted successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to delete comment: ' . $e->getMessage());
        }
    }
    
    public function like(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $comment = Comment::findById($id);
            
            if (!$comment) {
                return Response::notFound('Comment not found');
            }
            
            // Check if already liked
            if ($this->isLikedByUser($id, $currentUser['id'])) {
                return Response::error('You have already liked this comment', 400);
            }
            
            // Add like
            $this->addLike($id, $currentUser['id']);
            
            // Update like count
            Comment::updateLikeCount($id);
            
            return Response::success([
                'liked' => true,
                'like_count' => $comment['like_count'] + 1
            ], 'Comment liked successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to like comment: ' . $e->getMessage());
        }
    }
    
    public function unlike(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $comment = Comment::findById($id);
            
            if (!$comment) {
                return Response::notFound('Comment not found');
            }
            
            // Check if actually liked
            if (!$this->isLikedByUser($id, $currentUser['id'])) {
                return Response::error('You have not liked this comment', 400);
            }
            
            // Remove like
            $this->removeLike($id, $currentUser['id']);
            
            // Update like count
            Comment::updateLikeCount($id);
            
            return Response::success([
                'liked' => false,
                'like_count' => max(0, $comment['like_count'] - 1)
            ], 'Comment unliked successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to unlike comment: ' . $e->getMessage());
        }
    }
    
    public function report(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            $data = $request->all();
            
            $comment = Comment::findById($id);
            
            if (!$comment) {
                return Response::notFound('Comment not found');
            }
            
            // Validate input
            $validator = Validator::make($data)
                ->required('reason')
                ->in('reason', ['spam', 'harassment', 'inappropriate', 'misinformation', 'copyright', 'other'])
                ->max('description', 500);
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Create report
            $reportId = Comment::reportComment(
                $id,
                $currentUser['id'],
                $data['reason'],
                $data['description'] ?? null
            );
            
            return Response::success([
                'report_id' => $reportId
            ], 'Comment reported successfully');
            
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'already reported') !== false) {
                return Response::error($e->getMessage(), 400);
            }
            return Response::error('Failed to report comment: ' . $e->getMessage());
        }
    }
    
    public function getReplies(Request $request)
    {
        try {
            $id = $request->route('id');
            $limit = min((int) $request->input('limit', 10), 50);
            
            $comment = Comment::findById($id);
            
            if (!$comment) {
                return Response::notFound('Comment not found');
            }
            
            $replies = Comment::getReplies($id, $limit);
            
            return Response::success($replies, 'Replies retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve replies: ' . $e->getMessage());
        }
    }
    
    protected function entityExists($type, $id)
    {
        switch ($type) {
            case 'interview':
                return Interview::findById($id) !== null;
            case 'gallery':
                return Gallery::findById($id) !== null;
            default:
                return false;
        }
    }
    
    protected function isLikedByUser($commentId, $userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "SELECT COUNT(*) FROM likes WHERE likeable_type = 'comment' AND likeable_id = ? AND user_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$commentId, $userId]);
        
        return $stmt->fetchColumn() > 0;
    }
    
    protected function addLike($commentId, $userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "INSERT INTO likes (user_id, likeable_type, likeable_id, created_at) VALUES (?, 'comment', ?, NOW())";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$userId, $commentId]);
    }
    
    protected function removeLike($commentId, $userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "DELETE FROM likes WHERE user_id = ? AND likeable_type = 'comment' AND likeable_id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$userId, $commentId]);
    }
}
