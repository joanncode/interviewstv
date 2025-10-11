<?php

namespace App\Controllers;

use App\Models\Interview;
use App\Models\Category;
use App\Services\ContentAnalyticsService;
use App\Services\ContentModerationService;
use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Services\AuthService;

class ContentManagementController
{
    private $authService;
    private $analyticsService;
    private $moderationService;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->analyticsService = new ContentAnalyticsService();
        $this->moderationService = new ContentModerationService();
    }

    public function dashboard(Request $request)
    {
        try {
            $currentUser = $request->user();
            $isAdmin = $this->authService->hasRole($currentUser, 'admin');
            $userId = $isAdmin ? null : $currentUser['id'];
            
            // Get overview stats
            $overview = $this->analyticsService->getContentOverview($userId);
            
            // Get top performing content
            $topContent = $this->analyticsService->getTopPerformingContent(5, 'views', $userId);
            
            // Get category performance
            $categoryPerformance = $this->analyticsService->getCategoryPerformance($userId);
            
            // Get content health
            $contentHealth = $this->analyticsService->getContentHealth($userId);
            
            // Get moderation stats (admin only)
            $moderationStats = null;
            if ($isAdmin) {
                $moderationStats = $this->moderationService->getModerationStats();
            }
            
            return Response::success([
                'overview' => $overview,
                'top_content' => $topContent,
                'category_performance' => $categoryPerformance,
                'content_health' => $contentHealth,
                'moderation_stats' => $moderationStats
            ]);
            
        } catch (\Exception $e) {
            return Response::error('Failed to load dashboard: ' . $e->getMessage());
        }
    }

    public function analytics(Request $request)
    {
        try {
            $currentUser = $request->user();
            $isAdmin = $this->authService->hasRole($currentUser, 'admin');
            $userId = $isAdmin ? null : $currentUser['id'];
            
            $dateRange = $request->query('date_range', '30 days');
            $metric = $request->query('metric', 'views');
            $groupBy = $request->query('group_by', 'day');
            
            // Get content trends
            $trends = $this->analyticsService->getContentTrends($userId, $dateRange, $groupBy);
            
            // Get top performing content
            $topContent = $this->analyticsService->getTopPerformingContent(10, $metric, $userId, $dateRange);
            
            // Get audience insights
            $audienceInsights = $this->analyticsService->getAudienceInsights($userId, $dateRange);
            
            // Get search terms
            $searchTerms = $this->analyticsService->getSearchTerms(20, $dateRange);
            
            return Response::success([
                'trends' => $trends,
                'top_content' => $topContent,
                'audience_insights' => $audienceInsights,
                'search_terms' => $searchTerms,
                'date_range' => $dateRange,
                'metric' => $metric
            ]);
            
        } catch (\Exception $e) {
            return Response::error('Failed to load analytics: ' . $e->getMessage());
        }
    }

    public function bulkActions(Request $request)
    {
        try {
            $currentUser = $request->user();
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('action')
                ->required('content_ids')
                ->in('action', ['publish', 'unpublish', 'delete', 'feature', 'unfeature', 'moderate'])
                ->array('content_ids');
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            $action = $data['action'];
            $contentIds = $data['content_ids'];
            $contentType = $data['content_type'] ?? 'interview';
            
            $results = [];
            
            foreach ($contentIds as $contentId) {
                try {
                    $result = $this->performBulkAction($contentId, $contentType, $action, $currentUser);
                    $results[] = [
                        'content_id' => $contentId,
                        'success' => true,
                        'result' => $result
                    ];
                } catch (\Exception $e) {
                    $results[] = [
                        'content_id' => $contentId,
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            return Response::success($results, 'Bulk action completed');
            
        } catch (\Exception $e) {
            return Response::error('Failed to perform bulk action: ' . $e->getMessage());
        }
    }

    public function moderationQueue(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check permissions - only admins and moderators
            if (!$this->authService->hasRole($currentUser, ['admin', 'moderator'])) {
                return Response::forbidden('Insufficient permissions');
            }
            
            $limit = $request->query('limit', 50);
            $contentType = $request->query('content_type');
            
            $pendingReviews = $this->moderationService->getPendingReviews($limit, $contentType);
            
            return Response::success($pendingReviews);
            
        } catch (\Exception $e) {
            return Response::error('Failed to load moderation queue: ' . $e->getMessage());
        }
    }

    public function moderateContent(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            // Check permissions - only admins and moderators
            if (!$this->authService->hasRole($currentUser, ['admin', 'moderator'])) {
                return Response::forbidden('Insufficient permissions');
            }
            
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('content_id')
                ->required('content_type')
                ->required('action')
                ->numeric('content_id')
                ->in('content_type', ['interview', 'comment', 'gallery', 'user'])
                ->in('action', ['approve', 'reject', 'hide', 'delete', 'warn', 'ban']);
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            $result = $this->moderationService->reviewContent(
                $data['content_id'],
                $data['content_type'],
                $currentUser['id'],
                $data['action'],
                $data['notes'] ?? null
            );
            
            return Response::success($result, 'Content moderated successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to moderate content: ' . $e->getMessage());
        }
    }

    public function flagContent(Request $request)
    {
        try {
            $currentUser = $request->user();
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('content_id')
                ->required('content_type')
                ->required('reason')
                ->numeric('content_id')
                ->in('content_type', ['interview', 'comment', 'gallery', 'user'])
                ->in('reason', ['spam', 'inappropriate', 'copyright', 'harassment', 'fake', 'other'])
                ->max('description', 500);
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            $result = $this->moderationService->flagContent(
                $data['content_id'],
                $data['content_type'],
                $data['reason'],
                $currentUser['id'],
                $data['description'] ?? null
            );
            
            return Response::success($result, 'Content flagged successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to flag content: ' . $e->getMessage());
        }
    }

    public function searchContent(Request $request)
    {
        try {
            $query = $request->query('q');
            $filters = [
                'category' => $request->query('category'),
                'type' => $request->query('type'),
                'status' => $request->query('status'),
                'featured' => $request->query('featured'),
                'date_from' => $request->query('date_from'),
                'date_to' => $request->query('date_to')
            ];
            
            $page = $request->query('page', 1);
            $limit = $request->query('limit', 20);
            
            // Build search filters
            $searchFilters = array_filter($filters);
            if ($query) {
                $searchFilters['search'] = $query;
            }
            
            $interviews = Interview::getAll($page, $limit, $searchFilters);
            
            return Response::success($interviews);
            
        } catch (\Exception $e) {
            return Response::error('Failed to search content: ' . $e->getMessage());
        }
    }

    private function performBulkAction($contentId, $contentType, $action, $currentUser)
    {
        switch ($action) {
            case 'publish':
                return Interview::update($contentId, ['status' => 'published']);
                
            case 'unpublish':
                return Interview::update($contentId, ['status' => 'draft']);
                
            case 'delete':
                // Check permissions
                $content = Interview::findById($contentId);
                if ($content['interviewer_id'] !== $currentUser['id'] && 
                    !$this->authService->hasRole($currentUser, 'admin')) {
                    throw new \Exception('Insufficient permissions to delete this content');
                }
                return Interview::delete($contentId);
                
            case 'feature':
                if (!$this->authService->hasRole($currentUser, 'admin')) {
                    throw new \Exception('Only admins can feature content');
                }
                return Interview::update($contentId, ['featured' => true]);
                
            case 'unfeature':
                if (!$this->authService->hasRole($currentUser, 'admin')) {
                    throw new \Exception('Only admins can unfeature content');
                }
                return Interview::update($contentId, ['featured' => false]);
                
            case 'moderate':
                if (!$this->authService->hasRole($currentUser, ['admin', 'moderator'])) {
                    throw new \Exception('Insufficient permissions to moderate content');
                }
                return $this->moderationService->reviewContent(
                    $contentId, $contentType, $currentUser['id'], 'approve'
                );
                
            default:
                throw new \Exception('Unknown action: ' . $action);
        }
    }
}
