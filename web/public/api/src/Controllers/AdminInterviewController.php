<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Models\Interview;
use App\Models\User;
use App\Services\AuthService;
use App\Services\ContentModerationService;

class AdminInterviewController
{
    private $authService;
    private $moderationService;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->moderationService = new ContentModerationService();
    }

    /**
     * Get interview statistics for admin dashboard
     */
    public function getStatistics(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $statistics = Interview::getAdminStatistics();
            
            return Response::success($statistics, 'Statistics retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve statistics: ' . $e->getMessage());
        }
    }

    /**
     * Get all interviews for admin management
     */
    public function index(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            
            $filters = [
                'status' => $request->input('status'),
                'type' => $request->input('type'),
                'category' => $request->input('category'),
                'moderation' => $request->input('moderation'),
                'featured' => $request->input('featured'),
                'search' => $request->input('search'),
                'dateRange' => $request->input('dateRange'),
                'interviewer' => $request->input('interviewer'),
                'sort' => $request->input('sort', 'created_at'),
                'order' => $request->input('order', 'desc')
            ];
            
            // Remove null filters
            $filters = array_filter($filters, function($value) {
                return $value !== null && $value !== '' && $value !== 'all';
            });
            
            $result = Interview::getAllForAdmin($page, $limit, $filters);
            
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

    /**
     * Update interview (admin can edit any interview)
     */
    public function update(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $interview = Interview::findById($id);
            
            if (!$interview) {
                return Response::notFound('Interview not found');
            }

            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data);
            
            if (isset($data['title'])) {
                $validator->max('title', 255);
            }
            
            if (isset($data['description'])) {
                $validator->max('description', 2000);
            }
            
            if (isset($data['status'])) {
                $validator->in('status', ['draft', 'published', 'private', 'archived']);
            }
            
            if (isset($data['featured'])) {
                $validator->boolean('featured');
            }
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }

            // Update interview
            $updated = Interview::update($id, $data);
            
            if ($updated) {
                $interview = Interview::findById($id);
                return Response::success($interview, 'Interview updated successfully');
            } else {
                return Response::error('Failed to update interview');
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to update interview: ' . $e->getMessage());
        }
    }

    /**
     * Moderate interview
     */
    public function moderate(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $interview = Interview::findById($id);
            
            if (!$interview) {
                return Response::notFound('Interview not found');
            }

            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('action')
                ->in('action', ['approve', 'reject', 'flag', 'hide']);
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }

            $action = $data['action'];
            $notes = $data['notes'] ?? null;

            // Apply moderation action
            $result = $this->moderationService->reviewContent(
                $id,
                'interview',
                $currentUser['id'],
                $action,
                $notes
            );

            if ($result) {
                return Response::success(null, 'Moderation action applied successfully');
            } else {
                return Response::error('Failed to apply moderation action');
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to moderate interview: ' . $e->getMessage());
        }
    }

    /**
     * Bulk actions on interviews
     */
    public function bulkAction(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('interview_ids')
                ->required('action')
                ->array('interview_ids')
                ->in('action', ['approve', 'pending', 'feature', 'unfeature', 'delete']);
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }

            $interviewIds = $data['interview_ids'];
            $action = $data['action'];
            $successCount = 0;

            foreach ($interviewIds as $interviewId) {
                try {
                    switch ($action) {
                        case 'approve':
                            $this->moderationService->reviewContent(
                                $interviewId,
                                'interview',
                                $currentUser['id'],
                                'approve',
                                'Bulk approval'
                            );
                            $successCount++;
                            break;

                        case 'pending':
                            Interview::update($interviewId, ['moderation_status' => 'pending']);
                            $successCount++;
                            break;

                        case 'feature':
                            Interview::update($interviewId, ['featured' => true]);
                            $successCount++;
                            break;

                        case 'unfeature':
                            Interview::update($interviewId, ['featured' => false]);
                            $successCount++;
                            break;

                        case 'delete':
                            Interview::delete($interviewId);
                            $successCount++;
                            break;
                    }
                } catch (\Exception $e) {
                    // Continue with other interviews if one fails
                    continue;
                }
            }

            return Response::success([
                'processed' => count($interviewIds),
                'successful' => $successCount,
                'failed' => count($interviewIds) - $successCount
            ], "Bulk action completed. {$successCount} interviews processed successfully.");
            
        } catch (\Exception $e) {
            return Response::error('Failed to perform bulk action: ' . $e->getMessage());
        }
    }

    /**
     * Export interviews data
     */
    public function export(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $format = $request->input('format', 'csv');
            
            $filters = [
                'status' => $request->input('status'),
                'type' => $request->input('type'),
                'category' => $request->input('category'),
                'moderation' => $request->input('moderation'),
                'featured' => $request->input('featured'),
                'search' => $request->input('search'),
                'dateRange' => $request->input('dateRange'),
                'interviewer' => $request->input('interviewer')
            ];
            
            // Remove null filters
            $filters = array_filter($filters, function($value) {
                return $value !== null && $value !== '' && $value !== 'all';
            });

            // Get all interviews matching filters (no pagination for export)
            $result = Interview::getAllForAdmin(1, 10000, $filters);
            $interviews = $result['interviews'];

            if ($format === 'csv') {
                $csvData = $this->generateCSV($interviews);
                
                return Response::success($csvData, 'Export generated successfully', [
                    'Content-Type' => 'text/csv',
                    'Content-Disposition' => 'attachment; filename="interviews-export-' . date('Y-m-d') . '.csv"'
                ]);
            } else {
                return Response::success($interviews, 'Export data retrieved successfully');
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to export data: ' . $e->getMessage());
        }
    }

    /**
     * Generate CSV data from interviews
     */
    private function generateCSV($interviews)
    {
        $headers = [
            'ID',
            'Title',
            'Type',
            'Category',
            'Status',
            'Moderation Status',
            'Featured',
            'Interviewer',
            'Views',
            'Likes',
            'Comments',
            'Created At',
            'Updated At'
        ];

        $csv = implode(',', $headers) . "\n";

        foreach ($interviews as $interview) {
            $row = [
                $interview['id'],
                '"' . str_replace('"', '""', $interview['title']) . '"',
                $interview['type'],
                $interview['category'] ?? '',
                $interview['status'],
                $interview['moderation_status'] ?? 'pending',
                $interview['featured'] ? 'Yes' : 'No',
                '"' . str_replace('"', '""', $interview['interviewer_name']) . '"',
                $interview['views'] ?? 0,
                $interview['likes'] ?? 0,
                $interview['comments_count'] ?? 0,
                $interview['created_at'],
                $interview['updated_at']
            ];

            $csv .= implode(',', $row) . "\n";
        }

        return $csv;
    }

    /**
     * Get interview flags and reports
     */
    public function getFlags(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $interviewId = $request->route('id');
            $flags = $this->moderationService->getContentFlags($interviewId, 'interview');
            
            return Response::success($flags, 'Flags retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve flags: ' . $e->getMessage());
        }
    }

    /**
     * Get moderation history for interview
     */
    public function getModerationHistory(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$this->authService->hasRole($currentUser, 'admin')) {
                return Response::forbidden('Admin access required');
            }

            $interviewId = $request->route('id');
            $history = $this->moderationService->getModerationHistory($interviewId, 'interview');
            
            return Response::success($history, 'Moderation history retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve moderation history: ' . $e->getMessage());
        }
    }
}
