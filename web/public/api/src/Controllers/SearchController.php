<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\Search;
use App\Services\Validator;
use App\Exceptions\ValidationException;

class SearchController
{
    public function search(Request $request)
    {
        try {
            $query = $request->input('q', '');
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            $sort = $request->input('sort', 'relevance');
            
            // Build filters
            $filters = [];
            
            if ($request->input('type')) {
                $filters['type'] = $request->input('type');
            }
            
            if ($request->input('category')) {
                $filters['category'] = $request->input('category');
            }
            
            if ($request->input('user_id')) {
                $filters['user_id'] = $request->input('user_id');
            }
            
            if ($request->input('tags')) {
                $filters['tags'] = explode(',', $request->input('tags'));
            }
            
            if ($request->input('date_from')) {
                $filters['date_from'] = $request->input('date_from');
            }
            
            if ($request->input('date_to')) {
                $filters['date_to'] = $request->input('date_to');
            }
            
            // Perform search
            $result = Search::globalSearch($query, $filters, $page, $limit, $sort);
            
            // Log search query
            $currentUser = $request->user();
            $sessionId = session_id() ?: $request->header('X-Session-ID');
            
            Search::logSearchQuery(
                $query,
                $filters,
                $result['total'],
                $currentUser['id'] ?? null,
                $sessionId
            );
            
            return Response::paginated(
                $result['results'],
                $result['total'],
                $page,
                $limit,
                'Search completed successfully',
                [
                    'query' => $query,
                    'filters' => $filters,
                    'sort' => $sort
                ]
            );
            
        } catch (\Exception $e) {
            return Response::error('Search failed: ' . $e->getMessage());
        }
    }
    
    public function suggestions(Request $request)
    {
        try {
            $query = $request->input('q', '');
            $limit = min((int) $request->input('limit', 5), 10);
            
            if (strlen($query) < 2) {
                return Response::success([], 'Query too short for suggestions');
            }
            
            $suggestions = Search::getSuggestions($query, $limit);
            
            return Response::success($suggestions, 'Suggestions retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to get suggestions: ' . $e->getMessage());
        }
    }
    
    public function popular(Request $request)
    {
        try {
            $type = $request->input('type');
            $limit = min((int) $request->input('limit', 10), 20);
            $timeframe = $request->input('timeframe', '7 days');
            
            $results = Search::getPopularContent($type, $limit, $timeframe);
            
            return Response::success($results, 'Popular content retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to get popular content: ' . $e->getMessage());
        }
    }
    
    public function trending(Request $request)
    {
        try {
            $type = $request->input('type');
            $limit = min((int) $request->input('limit', 10), 20);
            
            $results = Search::getTrendingContent($type, $limit);
            
            return Response::success($results, 'Trending content retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to get trending content: ' . $e->getMessage());
        }
    }
    
    public function recommendations(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$currentUser) {
                return Response::error('Authentication required for recommendations', 401);
            }
            
            $limit = min((int) $request->input('limit', 10), 20);
            
            $results = Search::getRecommendations($currentUser['id'], $limit);
            
            return Response::success($results, 'Recommendations retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to get recommendations: ' . $e->getMessage());
        }
    }
    
    public function categories(Request $request)
    {
        try {
            $type = $request->input('type');
            
            // Get available categories from search index
            $categories = $this->getAvailableCategories($type);
            
            return Response::success($categories, 'Categories retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to get categories: ' . $e->getMessage());
        }
    }
    
    public function tags(Request $request)
    {
        try {
            $query = $request->input('q', '');
            $type = $request->input('type');
            $limit = min((int) $request->input('limit', 10), 20);
            
            $tags = $this->getAvailableTags($query, $type, $limit);
            
            return Response::success($tags, 'Tags retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to get tags: ' . $e->getMessage());
        }
    }
    
    public function index(Request $request)
    {
        try {
            $data = $request->all();
            
            // Validate input
            $validator = Validator::make($data)
                ->required('type')
                ->required('id')
                ->required('title')
                ->in('type', ['interview', 'gallery', 'user', 'business', 'event']);
            
            if ($validator->fails()) {
                return Response::validationError($validator->errors());
            }
            
            // Index the content
            $success = Search::indexContent($data['type'], $data['id'], $data);
            
            if ($success) {
                return Response::success(null, 'Content indexed successfully');
            } else {
                return Response::error('Failed to index content');
            }
            
        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Indexing failed: ' . $e->getMessage());
        }
    }
    
    public function removeIndex(Request $request)
    {
        try {
            $type = $request->route('type');
            $id = $request->route('id');
            
            if (!$type || !$id) {
                return Response::error('Type and ID are required', 400);
            }
            
            $success = Search::removeFromIndex($type, $id);
            
            if ($success) {
                return Response::success(null, 'Content removed from index successfully');
            } else {
                return Response::error('Failed to remove content from index');
            }
            
        } catch (\Exception $e) {
            return Response::error('Remove from index failed: ' . $e->getMessage());
        }
    }
    
    protected function getAvailableCategories($type = null)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "SELECT DISTINCT category, COUNT(*) as count
                FROM search_indexes 
                WHERE status = 'published' AND category IS NOT NULL";
        
        $params = [];
        
        if ($type) {
            $sql .= " AND searchable_type = ?";
            $params[] = $type;
        }
        
        $sql .= " GROUP BY category ORDER BY count DESC, category ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    protected function getAvailableTags($query = '', $type = null, $limit = 10)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        // This is a simplified version - in production you'd want a proper tags table
        $sql = "SELECT tags FROM search_indexes WHERE status = 'published' AND tags IS NOT NULL";
        
        $params = [];
        
        if ($type) {
            $sql .= " AND searchable_type = ?";
            $params[] = $type;
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(\PDO::FETCH_COLUMN);
        
        // Extract and count tags
        $tagCounts = [];
        foreach ($results as $tagsJson) {
            $tags = json_decode($tagsJson, true);
            if (is_array($tags)) {
                foreach ($tags as $tag) {
                    $tag = trim(strtolower($tag));
                    if (!empty($tag) && (empty($query) || strpos($tag, strtolower($query)) !== false)) {
                        $tagCounts[$tag] = ($tagCounts[$tag] ?? 0) + 1;
                    }
                }
            }
        }
        
        // Sort by count and limit
        arsort($tagCounts);
        $tags = array_slice(array_keys($tagCounts), 0, $limit);
        
        return array_map(function($tag) use ($tagCounts) {
            return [
                'tag' => $tag,
                'count' => $tagCounts[$tag]
            ];
        }, $tags);
    }
}
