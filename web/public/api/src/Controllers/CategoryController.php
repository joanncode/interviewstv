<?php

namespace App\Controllers;

use App\Models\Category;
use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Services\AuthService;

class CategoryController
{
    private $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    public function index(Request $request)
    {
        try {
            $type = $request->query('type');
            $hierarchy = $request->query('hierarchy', false);
            
            if ($hierarchy) {
                $categories = Category::getHierarchy($type);
            } else {
                $categories = Category::getAll($type);
            }
            
            return Response::success($categories);
            
        } catch (\Exception $e) {
            return Response::error('Failed to fetch categories: ' . $e->getMessage());
        }
    }

    public function show(Request $request)
    {
        try {
            $id = $request->route('id');
            $category = Category::findById($id);
            
            if (!$category) {
                return Response::notFound('Category not found');
            }
            
            return Response::success($category);
            
        } catch (\Exception $e) {
            return Response::error('Failed to fetch category: ' . $e->getMessage());
        }
    }

    public function create(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check permissions - only admins can create categories
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Only administrators can create categories');
            }
            
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('name')
                ->max('name', 255)
                ->max('description', 1000)
                ->in('type', ['interview', 'gallery', 'event', 'business'])
                ->max('color', 7)
                ->max('icon', 100)
                ->numeric('parent_id')
                ->numeric('sort_order')
                ->boolean('is_active')
                ->max('meta_title', 255)
                ->max('meta_description', 500);
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Check if parent category exists
            if (isset($data['parent_id'])) {
                $parentCategory = Category::findById($data['parent_id']);
                if (!$parentCategory) {
                    return Response::error('Parent category not found', 400);
                }
                
                // Ensure parent and child have same type
                if (isset($data['type']) && $parentCategory['type'] !== $data['type']) {
                    return Response::error('Child category must have same type as parent', 400);
                }
            }
            
            $category = Category::create($data);
            
            return Response::success($category, 'Category created successfully', 201);
            
        } catch (\Exception $e) {
            return Response::error('Failed to create category: ' . $e->getMessage());
        }
    }

    public function update(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            // Check permissions - only admins can update categories
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Only administrators can update categories');
            }
            
            $category = Category::findById($id);
            if (!$category) {
                return Response::notFound('Category not found');
            }
            
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data);
            
            if (isset($data['name'])) {
                $validator->required('name')->max('name', 255);
            }
            
            if (isset($data['description'])) {
                $validator->max('description', 1000);
            }
            
            if (isset($data['type'])) {
                $validator->in('type', ['interview', 'gallery', 'event', 'business']);
            }
            
            if (isset($data['color'])) {
                $validator->max('color', 7);
            }
            
            if (isset($data['icon'])) {
                $validator->max('icon', 100);
            }
            
            if (isset($data['parent_id'])) {
                $validator->numeric('parent_id');
                
                // Prevent circular references
                if ($data['parent_id'] == $id) {
                    return Response::error('Category cannot be its own parent', 400);
                }
                
                // Check if parent exists
                $parentCategory = Category::findById($data['parent_id']);
                if (!$parentCategory) {
                    return Response::error('Parent category not found', 400);
                }
            }
            
            if (isset($data['sort_order'])) {
                $validator->numeric('sort_order');
            }
            
            if (isset($data['is_active'])) {
                $validator->boolean('is_active');
            }
            
            if (isset($data['meta_title'])) {
                $validator->max('meta_title', 255);
            }
            
            if (isset($data['meta_description'])) {
                $validator->max('meta_description', 500);
            }
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            $updatedCategory = Category::update($id, $data);
            
            return Response::success($updatedCategory, 'Category updated successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to update category: ' . $e->getMessage());
        }
    }

    public function delete(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            // Check permissions - only admins can delete categories
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Only administrators can delete categories');
            }
            
            $category = Category::findById($id);
            if (!$category) {
                return Response::notFound('Category not found');
            }
            
            Category::delete($id);
            
            return Response::success(null, 'Category deleted successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to delete category: ' . $e->getMessage());
        }
    }

    public function popular(Request $request)
    {
        try {
            $limit = $request->query('limit', 10);
            $type = $request->query('type');
            
            $categories = Category::getPopular($limit, $type);
            
            return Response::success($categories);
            
        } catch (\Exception $e) {
            return Response::error('Failed to fetch popular categories: ' . $e->getMessage());
        }
    }

    public function search(Request $request)
    {
        try {
            $query = $request->query('q');
            $type = $request->query('type');
            
            if (!$query) {
                return Response::error('Search query is required', 400);
            }
            
            $categories = Category::search($query, $type);
            
            return Response::success($categories);
            
        } catch (\Exception $e) {
            return Response::error('Failed to search categories: ' . $e->getMessage());
        }
    }

    public function bulkUpdate(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check permissions - only admins can bulk update categories
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Only administrators can bulk update categories');
            }
            
            $data = $request->all();
            
            if (!isset($data['categories']) || !is_array($data['categories'])) {
                return Response::error('Categories array is required', 400);
            }
            
            $results = [];
            
            foreach ($data['categories'] as $categoryData) {
                if (!isset($categoryData['id'])) {
                    continue;
                }
                
                try {
                    $category = Category::update($categoryData['id'], $categoryData);
                    $results[] = [
                        'id' => $categoryData['id'],
                        'success' => true,
                        'category' => $category
                    ];
                } catch (\Exception $e) {
                    $results[] = [
                        'id' => $categoryData['id'],
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            return Response::success($results, 'Bulk update completed');
            
        } catch (\Exception $e) {
            return Response::error('Failed to bulk update categories: ' . $e->getMessage());
        }
    }
}
