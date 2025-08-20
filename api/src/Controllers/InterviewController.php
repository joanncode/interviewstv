<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\Interview;
use App\Models\User;
use App\Services\AuthService;
use App\Services\Validator;
use App\Exceptions\ValidationException;

class InterviewController
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
            $limit = min((int) $request->input('limit', 20), 50);
            
            $filters = [
                'category' => $request->input('category'),
                'type' => $request->input('type'),
                'search' => $request->input('search'),
                'sort' => $request->input('sort', 'recent'),
                'featured' => $request->input('featured') ? true : null,
                'interviewer_id' => $request->input('interviewer_id')
            ];
            
            // Remove null filters
            $filters = array_filter($filters, function($value) {
                return $value !== null && $value !== '';
            });
            
            $result = Interview::getAll($page, $limit, $filters);
            
            return Response::paginated(
                $result['interviews'],
                $result['total'],
                $page,
                $limit,
                'Interviews retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve interviews: ' . $e->getMessage());
        }
    }
    
    public function show(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $interview = Interview::findById($id);
            
            if (!$interview) {
                return Response::notFound('Interview not found');
            }
            
            // Check if user can view this interview
            if ($interview['status'] !== 'published') {
                if (!$currentUser || $currentUser['id'] !== $interview['interviewer_id']) {
                    return Response::forbidden('You cannot view this interview');
                }
            }
            
            // Increment view count (only for published interviews)
            if ($interview['status'] === 'published') {
                Interview::incrementViewCount($id);
                $interview['view_count']++;
            }
            
            // Get media files
            $interview['media'] = Interview::getMedia($id);
            
            // Check if current user liked this interview
            $interview['is_liked'] = false;
            if ($currentUser) {
                $interview['is_liked'] = $this->isLikedByUser($id, $currentUser['id']);
            }
            
            return Response::success($interview, 'Interview retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve interview: ' . $e->getMessage());
        }
    }
    
    public function create(Request $request)
    {
        try {
            $currentUser = $request->user();
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('title')
                ->required('type')
                ->max('title', 255)
                ->max('description', 2000)
                ->in('type', ['video', 'audio', 'text'])
                ->in('status', ['draft', 'published', 'private']);
            
            if (isset($data['interviewee_id'])) {
                $validator->numeric('interviewee_id');
            }
            
            if (isset($data['interviewee_name'])) {
                $validator->max('interviewee_name', 255);
            }
            
            if (isset($data['category'])) {
                $validator->max('category', 100);
            }
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Check if user can create interviews
            if (!$this->authService->hasRole($currentUser, 'interviewer')) {
                return Response::forbidden('You need interviewer role to create interviews');
            }
            
            // Validate interviewee
            if (!empty($data['interviewee_id'])) {
                $interviewee = User::findById($data['interviewee_id']);
                if (!$interviewee) {
                    return Response::error('Interviewee not found', 400);
                }
            } elseif (empty($data['interviewee_name'])) {
                return Response::error('Either interviewee_id or interviewee_name is required', 400);
            }
            
            // Create interview
            $interviewData = [
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'interviewer_id' => $currentUser['id'],
                'interviewee_id' => $data['interviewee_id'] ?? null,
                'interviewee_name' => $data['interviewee_name'] ?? null,
                'interviewee_bio' => $data['interviewee_bio'] ?? null,
                'type' => $data['type'],
                'status' => $data['status'] ?? 'draft',
                'category' => $data['category'] ?? null,
                'tags' => $data['tags'] ?? []
            ];
            
            $interview = Interview::create($interviewData);
            
            return Response::success($interview, 'Interview created successfully', 201);
            
        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to create interview: ' . $e->getMessage());
        }
    }
    
    public function update(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            $data = $request->all();
            
            $interview = Interview::findById($id);
            
            if (!$interview) {
                return Response::notFound('Interview not found');
            }
            
            // Check permissions
            if ($currentUser['id'] !== $interview['interviewer_id'] && 
                !$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('You can only edit your own interviews');
            }
            
            // Validate input
            $validator = Validator::make($data);
            
            if (isset($data['title'])) {
                $validator->required('title')->max('title', 255);
            }
            
            if (isset($data['description'])) {
                $validator->max('description', 2000);
            }
            
            if (isset($data['type'])) {
                $validator->in('type', ['video', 'audio', 'text']);
            }
            
            if (isset($data['status'])) {
                $validator->in('status', ['draft', 'published', 'private', 'archived']);
            }
            
            if (isset($data['category'])) {
                $validator->max('category', 100);
            }
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Update interview
            $updatedInterview = Interview::update($id, $data);
            
            return Response::success($updatedInterview, 'Interview updated successfully');
            
        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to update interview: ' . $e->getMessage());
        }
    }
    
    public function delete(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $interview = Interview::findById($id);
            
            if (!$interview) {
                return Response::notFound('Interview not found');
            }
            
            // Check permissions
            if ($currentUser['id'] !== $interview['interviewer_id'] && 
                !$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('You can only delete your own interviews');
            }
            
            Interview::delete($id);
            
            return Response::success(null, 'Interview deleted successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to delete interview: ' . $e->getMessage());
        }
    }
    
    public function getMedia(Request $request)
    {
        try {
            $id = $request->route('id');
            
            $interview = Interview::findById($id);
            
            if (!$interview) {
                return Response::notFound('Interview not found');
            }
            
            $media = Interview::getMedia($id);
            
            return Response::success($media, 'Interview media retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve interview media: ' . $e->getMessage());
        }
    }
    
    public function addMedia(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $interview = Interview::findById($id);
            
            if (!$interview) {
                return Response::notFound('Interview not found');
            }
            
            // Check permissions
            if ($currentUser['id'] !== $interview['interviewer_id']) {
                return Response::forbidden('You can only add media to your own interviews');
            }
            
            if (!$request->hasFile('media')) {
                return Response::error('No media file provided', 400);
            }
            
            $file = $request->file('media');
            
            // Upload file using FileUploadService
            $uploadService = new \App\Services\FileUploadService();
            $uploadResult = $uploadService->uploadMedia($file, $currentUser['id'], 'interview');
            
            if (!$uploadResult['success']) {
                return Response::error($uploadResult['error'], 500);
            }
            
            // Add media record
            $mediaData = [
                'type' => $uploadResult['type'],
                'url' => $uploadResult['url'],
                'filename' => $uploadResult['filename'],
                'mime_type' => $file['type'],
                'file_size' => $uploadResult['size'],
                'duration' => $uploadResult['duration'] ?? null,
                'is_primary' => $request->input('is_primary', false),
                'sort_order' => $request->input('sort_order', 0)
            ];
            
            $mediaId = Interview::addMedia($id, $mediaData);
            
            return Response::success([
                'media_id' => $mediaId,
                'url' => $uploadResult['url']
            ], 'Media added successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to add media: ' . $e->getMessage());
        }
    }
    
    public function like(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $interview = Interview::findById($id);
            
            if (!$interview) {
                return Response::notFound('Interview not found');
            }
            
            if ($interview['status'] !== 'published') {
                return Response::error('You can only like published interviews', 400);
            }
            
            // Check if already liked
            if ($this->isLikedByUser($id, $currentUser['id'])) {
                return Response::error('You have already liked this interview', 400);
            }
            
            // Add like
            $this->addLike($id, $currentUser['id']);
            
            // Update like count
            Interview::updateLikeCount($id);
            
            return Response::success([
                'liked' => true,
                'like_count' => $interview['like_count'] + 1
            ], 'Interview liked successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to like interview: ' . $e->getMessage());
        }
    }
    
    public function unlike(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $interview = Interview::findById($id);
            
            if (!$interview) {
                return Response::notFound('Interview not found');
            }
            
            // Check if actually liked
            if (!$this->isLikedByUser($id, $currentUser['id'])) {
                return Response::error('You have not liked this interview', 400);
            }
            
            // Remove like
            $this->removeLike($id, $currentUser['id']);
            
            // Update like count
            Interview::updateLikeCount($id);
            
            return Response::success([
                'liked' => false,
                'like_count' => max(0, $interview['like_count'] - 1)
            ], 'Interview unliked successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to unlike interview: ' . $e->getMessage());
        }
    }
    
    protected function isLikedByUser($interviewId, $userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "SELECT COUNT(*) FROM likes WHERE likeable_type = 'interview' AND likeable_id = ? AND user_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$interviewId, $userId]);
        
        return $stmt->fetchColumn() > 0;
    }
    
    protected function addLike($interviewId, $userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "INSERT INTO likes (user_id, likeable_type, likeable_id, created_at) VALUES (?, 'interview', ?, NOW())";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$userId, $interviewId]);
    }
    
    protected function removeLike($interviewId, $userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "DELETE FROM likes WHERE user_id = ? AND likeable_type = 'interview' AND likeable_id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$userId, $interviewId]);
    }
}
