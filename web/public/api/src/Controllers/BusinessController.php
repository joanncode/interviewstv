<?php

namespace App\Controllers;

use App\Models\Business;
use App\Models\User;
use App\Http\Request;
use App\Http\Response;

class BusinessController
{
    public function index(Request $request)
    {
        try {
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 20), 50);
            $sort = $request->get('sort', 'created_at');
            
            $filters = [];
            
            // Apply filters
            if ($industry = $request->get('industry')) {
                $filters['industry'] = $industry;
            }
            
            if ($location = $request->get('location')) {
                $filters['location'] = $location;
            }
            
            if ($verified = $request->get('verified')) {
                $filters['verified'] = $verified === 'true';
            }
            
            if ($search = $request->get('search')) {
                $filters['search'] = $search;
            }
            
            $result = Business::getAll($filters, $page, $limit, $sort);
            
            return Response::json([
                'success' => true,
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch businesses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $business = Business::findById($id);
            
            if (!$business) {
                return Response::json([
                    'success' => false,
                    'message' => 'Business not found'
                ], 404);
            }
            
            return Response::json([
                'success' => true,
                'data' => $business
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch business',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function create(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return Response::json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }
            
            // Validate required fields
            $requiredFields = ['name', 'industry'];
            foreach ($requiredFields as $field) {
                if (!$request->has($field)) {
                    return Response::json([
                        'success' => false,
                        'message' => "Field '$field' is required"
                    ], 400);
                }
            }
            
            // Validate industry
            $validIndustries = ['retail', 'hospitality', 'tech', 'healthcare', 'education', 'entertainment', 'other'];
            if (!in_array($request->get('industry'), $validIndustries)) {
                return Response::json([
                    'success' => false,
                    'message' => 'Invalid industry'
                ], 400);
            }
            
            // Validate website URL if provided
            if ($website = $request->get('website_url')) {
                if (!filter_var($website, FILTER_VALIDATE_URL)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid website URL'
                    ], 400);
                }
            }
            
            // Validate email if provided
            if ($email = $request->get('email')) {
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid email address'
                    ], 400);
                }
            }
            
            $businessData = [
                'name' => $request->get('name'),
                'owner_id' => $user['id'],
                'industry' => $request->get('industry'),
                'description' => $request->get('description'),
                'location' => $request->get('location'),
                'website_url' => $request->get('website_url'),
                'phone' => $request->get('phone'),
                'email' => $request->get('email'),
                'hours' => $request->get('hours'),
                'logo_url' => $request->get('logo_url')
            ];
            
            $business = Business::create($businessData);
            
            return Response::json([
                'success' => true,
                'message' => 'Business created successfully',
                'data' => $business
            ], 201);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to create business',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return Response::json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }
            
            $business = Business::findById($id);
            
            if (!$business) {
                return Response::json([
                    'success' => false,
                    'message' => 'Business not found'
                ], 404);
            }
            
            // Check ownership or admin privileges
            if ($business['owner_id'] != $user['id'] && $user['role'] !== 'admin') {
                return Response::json([
                    'success' => false,
                    'message' => 'Unauthorized to update this business'
                ], 403);
            }
            
            // Validate industry if provided
            if ($industry = $request->get('industry')) {
                $validIndustries = ['retail', 'hospitality', 'tech', 'healthcare', 'education', 'entertainment', 'other'];
                if (!in_array($industry, $validIndustries)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid industry'
                    ], 400);
                }
            }
            
            // Validate website URL if provided
            if ($website = $request->get('website_url')) {
                if ($website && !filter_var($website, FILTER_VALIDATE_URL)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid website URL'
                    ], 400);
                }
            }
            
            // Validate email if provided
            if ($email = $request->get('email')) {
                if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid email address'
                    ], 400);
                }
            }
            
            $updateData = [];
            $allowedFields = ['name', 'industry', 'description', 'location', 'website_url', 'phone', 'email', 'hours', 'logo_url'];
            
            foreach ($allowedFields as $field) {
                if ($request->has($field)) {
                    $updateData[$field] = $request->get($field);
                }
            }
            
            // Only admins can update verification status
            if ($user['role'] === 'admin' && $request->has('verified')) {
                $updateData['verified'] = $request->get('verified');
            }
            
            $success = Business::update($id, $updateData);
            
            if ($success) {
                $updatedBusiness = Business::findById($id);
                
                return Response::json([
                    'success' => true,
                    'message' => 'Business updated successfully',
                    'data' => $updatedBusiness
                ]);
            } else {
                return Response::json([
                    'success' => false,
                    'message' => 'Failed to update business'
                ], 500);
            }
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to update business',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function delete(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return Response::json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }
            
            $business = Business::findById($id);
            
            if (!$business) {
                return Response::json([
                    'success' => false,
                    'message' => 'Business not found'
                ], 404);
            }
            
            // Check ownership or admin privileges
            if ($business['owner_id'] != $user['id'] && $user['role'] !== 'admin') {
                return Response::json([
                    'success' => false,
                    'message' => 'Unauthorized to delete this business'
                ], 403);
            }
            
            $success = Business::delete($id);
            
            if ($success) {
                return Response::json([
                    'success' => true,
                    'message' => 'Business deleted successfully'
                ]);
            } else {
                return Response::json([
                    'success' => false,
                    'message' => 'Failed to delete business'
                ], 500);
            }
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to delete business',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function search(Request $request)
    {
        try {
            $query = $request->get('q', '');
            
            if (strlen($query) < 2) {
                return Response::json([
                    'success' => false,
                    'message' => 'Search query must be at least 2 characters'
                ], 400);
            }
            
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 20), 50);
            
            $filters = [];
            
            if ($industry = $request->get('industry')) {
                $filters['industry'] = $industry;
            }
            
            if ($location = $request->get('location')) {
                $filters['location'] = $location;
            }
            
            $result = Business::search($query, $filters, $page, $limit);
            
            return Response::json([
                'success' => true,
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Search failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getInterviews(Request $request, $id)
    {
        try {
            $business = Business::findById($id);
            
            if (!$business) {
                return Response::json([
                    'success' => false,
                    'message' => 'Business not found'
                ], 404);
            }
            
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 10), 20);
            
            $interviews = Business::getInterviews($id, $page, $limit);
            
            return Response::json([
                'success' => true,
                'data' => [
                    'interviews' => $interviews,
                    'business' => $business
                ]
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch business interviews',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function linkInterview(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return Response::json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }
            
            $business = Business::findById($id);
            
            if (!$business) {
                return Response::json([
                    'success' => false,
                    'message' => 'Business not found'
                ], 404);
            }
            
            // Check ownership or admin privileges
            if ($business['owner_id'] != $user['id'] && $user['role'] !== 'admin') {
                return Response::json([
                    'success' => false,
                    'message' => 'Unauthorized to link interviews to this business'
                ], 403);
            }
            
            $interviewId = $request->get('interview_id');
            
            if (!$interviewId) {
                return Response::json([
                    'success' => false,
                    'message' => 'Interview ID is required'
                ], 400);
            }
            
            $success = Business::linkInterview($id, $interviewId);
            
            if ($success) {
                return Response::json([
                    'success' => true,
                    'message' => 'Interview linked successfully'
                ]);
            } else {
                return Response::json([
                    'success' => false,
                    'message' => 'Failed to link interview'
                ], 500);
            }
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to link interview',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function unlinkInterview(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return Response::json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }
            
            $business = Business::findById($id);
            
            if (!$business) {
                return Response::json([
                    'success' => false,
                    'message' => 'Business not found'
                ], 404);
            }
            
            // Check ownership or admin privileges
            if ($business['owner_id'] != $user['id'] && $user['role'] !== 'admin') {
                return Response::json([
                    'success' => false,
                    'message' => 'Unauthorized to unlink interviews from this business'
                ], 403);
            }
            
            $interviewId = $request->get('interview_id');
            
            if (!$interviewId) {
                return Response::json([
                    'success' => false,
                    'message' => 'Interview ID is required'
                ], 400);
            }
            
            $success = Business::unlinkInterview($id, $interviewId);
            
            if ($success) {
                return Response::json([
                    'success' => true,
                    'message' => 'Interview unlinked successfully'
                ]);
            } else {
                return Response::json([
                    'success' => false,
                    'message' => 'Failed to unlink interview'
                ], 500);
            }
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to unlink interview',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getIndustries(Request $request)
    {
        try {
            $industries = Business::getIndustries();
            
            return Response::json([
                'success' => true,
                'data' => $industries
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch industries',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getPopular(Request $request)
    {
        try {
            $limit = min((int) $request->get('limit', 10), 20);
            $businesses = Business::getPopular($limit);
            
            return Response::json([
                'success' => true,
                'data' => $businesses
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch popular businesses',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
