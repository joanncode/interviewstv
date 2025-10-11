<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\Gallery;
use App\Services\AuthService;
use App\Services\Validator;
use App\Services\FileUploadService;
use App\Exceptions\ValidationException;

class GalleryController
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
                'type' => $request->input('type'),
                'search' => $request->input('search'),
                'sort' => $request->input('sort', 'recent'),
                'featured' => $request->input('featured') ? true : null,
                'user_id' => $request->input('user_id')
            ];
            
            // Remove null filters
            $filters = array_filter($filters, function($value) {
                return $value !== null && $value !== '';
            });
            
            $result = Gallery::getAll($page, $limit, $filters);
            
            return Response::paginated(
                $result['galleries'],
                $result['total'],
                $page,
                $limit,
                'Galleries retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve galleries: ' . $e->getMessage());
        }
    }
    
    public function show(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $gallery = Gallery::findById($id);
            
            if (!$gallery) {
                return Response::notFound('Gallery not found');
            }
            
            // Check if user can view this gallery
            if ($gallery['visibility'] === 'private') {
                if (!$currentUser || $currentUser['id'] !== $gallery['user_id']) {
                    return Response::forbidden('You cannot view this private gallery');
                }
            }
            
            // Increment view count (only for public galleries)
            if ($gallery['visibility'] === 'public') {
                Gallery::incrementViewCount($id);
                $gallery['view_count']++;
            }
            
            // Get media files
            $gallery['media'] = Gallery::getMedia($id, $gallery['sort_order']);
            
            return Response::success($gallery, 'Gallery retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve gallery: ' . $e->getMessage());
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
                ->max('title', 255)
                ->max('description', 1000)
                ->in('type', ['personal', 'interview', 'event', 'business'])
                ->in('visibility', ['public', 'private', 'unlisted'])
                ->in('sort_order', ['date_asc', 'date_desc', 'name_asc', 'name_desc', 'custom']);
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Create gallery
            $galleryData = [
                'user_id' => $currentUser['id'],
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'type' => $data['type'] ?? 'personal',
                'visibility' => $data['visibility'] ?? 'public',
                'sort_order' => $data['sort_order'] ?? 'date_desc'
            ];
            
            $gallery = Gallery::create($galleryData);
            
            return Response::success($gallery, 'Gallery created successfully', 201);
            
        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to create gallery: ' . $e->getMessage());
        }
    }
    
    public function update(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            $data = $request->all();
            
            $gallery = Gallery::findById($id);
            
            if (!$gallery) {
                return Response::notFound('Gallery not found');
            }
            
            // Check permissions
            if ($currentUser['id'] !== $gallery['user_id'] && 
                !$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('You can only edit your own galleries');
            }
            
            // Validate input
            $validator = Validator::make($data);
            
            if (isset($data['title'])) {
                $validator->required('title')->max('title', 255);
            }
            
            if (isset($data['description'])) {
                $validator->max('description', 1000);
            }
            
            if (isset($data['type'])) {
                $validator->in('type', ['personal', 'interview', 'event', 'business']);
            }
            
            if (isset($data['visibility'])) {
                $validator->in('visibility', ['public', 'private', 'unlisted']);
            }
            
            if (isset($data['sort_order'])) {
                $validator->in('sort_order', ['date_asc', 'date_desc', 'name_asc', 'name_desc', 'custom']);
            }
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Update gallery
            $updatedGallery = Gallery::update($id, $data);
            
            return Response::success($updatedGallery, 'Gallery updated successfully');
            
        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to update gallery: ' . $e->getMessage());
        }
    }
    
    public function delete(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $gallery = Gallery::findById($id);
            
            if (!$gallery) {
                return Response::notFound('Gallery not found');
            }
            
            // Check permissions
            if ($currentUser['id'] !== $gallery['user_id'] && 
                !$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('You can only delete your own galleries');
            }
            
            Gallery::delete($id);
            
            return Response::success(null, 'Gallery deleted successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to delete gallery: ' . $e->getMessage());
        }
    }
    
    public function getMedia(Request $request)
    {
        try {
            $id = $request->route('id');
            
            $gallery = Gallery::findById($id);
            
            if (!$gallery) {
                return Response::notFound('Gallery not found');
            }
            
            // Check visibility
            $currentUser = $request->user();
            if ($gallery['visibility'] === 'private') {
                if (!$currentUser || $currentUser['id'] !== $gallery['user_id']) {
                    return Response::forbidden('You cannot view this private gallery');
                }
            }
            
            $media = Gallery::getMedia($id, $gallery['sort_order']);
            
            return Response::success($media, 'Gallery media retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve gallery media: ' . $e->getMessage());
        }
    }
    
    public function addMedia(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $gallery = Gallery::findById($id);
            
            if (!$gallery) {
                return Response::notFound('Gallery not found');
            }
            
            // Check permissions
            if ($currentUser['id'] !== $gallery['user_id']) {
                return Response::forbidden('You can only add media to your own galleries');
            }
            
            if (!$request->hasFile('media')) {
                return Response::error('No media file provided', 400);
            }
            
            $file = $request->file('media');
            
            // Upload file using FileUploadService
            $uploadService = new FileUploadService();
            $uploadResult = $uploadService->uploadMedia($file, $currentUser['id'], 'gallery');
            
            if (!$uploadResult['success']) {
                return Response::error($uploadResult['error'], 500);
            }
            
            // Add media record
            $mediaData = [
                'title' => $request->input('title'),
                'description' => $request->input('description'),
                'type' => $uploadResult['type'],
                'url' => $uploadResult['url'],
                'filename' => $uploadResult['filename'],
                'mime_type' => $file['type'],
                'file_size' => $uploadResult['size'],
                'width' => $uploadResult['width'] ?? null,
                'height' => $uploadResult['height'] ?? null,
                'duration' => $uploadResult['duration'] ?? null,
                'alt_text' => $request->input('alt_text'),
                'tags' => $request->input('tags') ? explode(',', $request->input('tags')) : [],
                'is_cover' => $request->input('is_cover', false)
            ];
            
            $mediaId = Gallery::addMedia($id, $mediaData);
            
            return Response::success([
                'media_id' => $mediaId,
                'url' => $uploadResult['url']
            ], 'Media added successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to add media: ' . $e->getMessage());
        }
    }
    
    public function updateMediaOrder(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            $data = $request->all();
            
            $gallery = Gallery::findById($id);
            
            if (!$gallery) {
                return Response::notFound('Gallery not found');
            }
            
            // Check permissions
            if ($currentUser['id'] !== $gallery['user_id']) {
                return Response::forbidden('You can only reorder your own gallery media');
            }
            
            // Validate input
            $validator = Validator::make($data)
                ->required('media_order');
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            if (!is_array($data['media_order'])) {
                return Response::error('Media order must be an array', 400);
            }
            
            Gallery::updateMediaOrder($id, $data['media_order']);
            
            return Response::success(null, 'Media order updated successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to update media order: ' . $e->getMessage());
        }
    }
}
