<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\ValidationService;
use App\Services\AuthService;
use App\Services\InterviewTemplateService;
use App\Exceptions\ValidationException;

/**
 * Interview Template Controller
 * Handles interview template CRUD operations and management
 */
class InterviewTemplateController
{
    private AuthService $authService;
    private InterviewTemplateService $templateService;
    private ValidationService $validator;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->templateService = new InterviewTemplateService();
        $this->validator = new ValidationService();
    }

    /**
     * Get all interview templates
     */
    public function index(Request $request)
    {
        try {
            $filters = [
                'category' => $request->get('category'),
                'type' => $request->get('type'),
                'search' => $request->get('search'),
                'sort' => $request->get('sort', 'featured_first'),
                'is_public' => $request->get('public') !== null ? (bool)$request->get('public') : null,
                'is_featured' => $request->get('featured') !== null ? (bool)$request->get('featured') : null
            ];

            // Remove null filters
            $filters = array_filter($filters, function($value) {
                return $value !== null && $value !== '';
            });

            $templates = $this->templateService->getTemplates($filters);

            return Response::success($templates, 'Templates retrieved successfully');

        } catch (Exception $e) {
            return Response::error('Failed to fetch templates: ' . $e->getMessage());
        }
    }

    /**
     * Get template by ID
     */
    public function show(Request $request, string $id)
    {
        try {
            $template = $this->templateService->getTemplateById($id);
            
            if (!$template) {
                return Response::notFound('Template not found');
            }

            return Response::success($template, 'Template retrieved successfully');

        } catch (Exception $e) {
            return Response::error('Failed to fetch template: ' . $e->getMessage());
        }
    }

    /**
     * Create a new template
     */
    public function create(Request $request)
    {
        try {
            // Authenticate user
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            $data = $request->all();

            // Validate input
            $rules = [
                'name' => 'required|string|max:255',
                'description' => 'string',
                'category' => 'string|max:100',
                'type' => 'string|in:standard,technical,behavioral,panel,screening',
                'duration_minutes' => 'integer|min:5|max:480',
                'max_guests' => 'integer|min:1|max:50',
                'questions' => 'array',
                'structure' => 'array',
                'settings' => 'array',
                'is_public' => 'boolean',
                'is_featured' => 'boolean'
            ];

            $this->validator->validate($data, $rules);

            // Add created_by
            $data['created_by'] = $currentUser['id'];

            $template = $this->templateService->createTemplate($data);

            return Response::success($template, 'Template created successfully', 201);

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (Exception $e) {
            return Response::error('Failed to create template: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing template
     */
    public function update(Request $request, string $id)
    {
        try {
            // Authenticate user
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            // Check if template exists
            $existingTemplate = $this->templateService->getTemplateById($id);
            if (!$existingTemplate) {
                return Response::notFound('Template not found');
            }

            // Check permissions (only creator or admin can update)
            if ($existingTemplate['created_by'] !== $currentUser['id'] && $currentUser['role'] !== 'admin') {
                return Response::forbidden('You do not have permission to update this template');
            }

            $data = $request->all();

            // Validate input
            $rules = [
                'name' => 'string|max:255',
                'description' => 'string',
                'category' => 'string|max:100',
                'type' => 'string|in:standard,technical,behavioral,panel,screening',
                'duration_minutes' => 'integer|min:5|max:480',
                'max_guests' => 'integer|min:1|max:50',
                'questions' => 'array',
                'structure' => 'array',
                'settings' => 'array',
                'is_public' => 'boolean',
                'is_featured' => 'boolean'
            ];

            $this->validator->validate($data, $rules);

            $template = $this->templateService->updateTemplate($id, $data);

            return Response::success($template, 'Template updated successfully');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (Exception $e) {
            return Response::error('Failed to update template: ' . $e->getMessage());
        }
    }

    /**
     * Delete a template
     */
    public function delete(Request $request, string $id)
    {
        try {
            // Authenticate user
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            // Check if template exists
            $existingTemplate = $this->templateService->getTemplateById($id);
            if (!$existingTemplate) {
                return Response::notFound('Template not found');
            }

            // Check permissions (only creator or admin can delete)
            if ($existingTemplate['created_by'] !== $currentUser['id'] && $currentUser['role'] !== 'admin') {
                return Response::forbidden('You do not have permission to delete this template');
            }

            $deleted = $this->templateService->deleteTemplate($id);

            if ($deleted) {
                return Response::success(null, 'Template deleted successfully');
            } else {
                return Response::error('Failed to delete template');
            }

        } catch (Exception $e) {
            return Response::error('Failed to delete template: ' . $e->getMessage());
        }
    }

    /**
     * Apply template to room
     */
    public function applyToRoom(Request $request, string $id)
    {
        try {
            // Authenticate user
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            $data = $request->all();

            // Validate input
            $rules = [
                'room_id' => 'required|string',
                'customizations' => 'array'
            ];

            $this->validator->validate($data, $rules);

            $result = $this->templateService->applyTemplateToRoom(
                $id,
                $data['room_id'],
                $currentUser['id'],
                $data['customizations'] ?? []
            );

            return Response::success($result, 'Template applied to room successfully');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (Exception $e) {
            return Response::error('Failed to apply template: ' . $e->getMessage());
        }
    }

    /**
     * Get template categories
     */
    public function categories(Request $request)
    {
        try {
            $categories = $this->templateService->getCategories();
            return Response::success($categories, 'Categories retrieved successfully');

        } catch (Exception $e) {
            return Response::error('Failed to fetch categories: ' . $e->getMessage());
        }
    }

    /**
     * Get template statistics
     */
    public function stats(Request $request, string $id)
    {
        try {
            $stats = $this->templateService->getTemplateStats($id);
            return Response::success($stats, 'Template statistics retrieved successfully');

        } catch (Exception $e) {
            return Response::error('Failed to fetch template statistics: ' . $e->getMessage());
        }
    }

    /**
     * Duplicate a template
     */
    public function duplicate(Request $request, string $id)
    {
        try {
            // Authenticate user
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            // Get original template
            $originalTemplate = $this->templateService->getTemplateById($id);
            if (!$originalTemplate) {
                return Response::notFound('Template not found');
            }

            // Create duplicate with modified name
            $duplicateData = [
                'name' => $originalTemplate['name'] . ' (Copy)',
                'description' => $originalTemplate['description'],
                'category' => $originalTemplate['category'],
                'type' => $originalTemplate['type'],
                'duration_minutes' => $originalTemplate['duration_minutes'],
                'max_guests' => $originalTemplate['max_guests'],
                'questions' => $originalTemplate['questions'],
                'structure' => $originalTemplate['structure'],
                'settings' => $originalTemplate['settings'],
                'is_public' => false, // Duplicates are private by default
                'is_featured' => false,
                'created_by' => $currentUser['id']
            ];

            $newTemplate = $this->templateService->createTemplate($duplicateData);

            return Response::success($newTemplate, 'Template duplicated successfully', 201);

        } catch (Exception $e) {
            return Response::error('Failed to duplicate template: ' . $e->getMessage());
        }
    }
}
