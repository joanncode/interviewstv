<?php

namespace App\Models;

use PDO;

class Event
{
    public static function getConnection()
    {
        static $pdo = null;
        
        if ($pdo === null) {
            $config = config('database.connections.mysql');
            $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
            
            $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
        }
        
        return $pdo;
    }

    public static function create($data)
    {
        $pdo = self::getConnection();
        
        $sql = "INSERT INTO events (title, description, promoter_id, start_date, end_date, location, is_virtual, 
                                   event_type, max_attendees, registration_required, registration_deadline, 
                                   ticket_price, event_url, cover_image_url, tags, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['title'],
            $data['description'] ?? null,
            $data['promoter_id'],
            $data['start_date'],
            $data['end_date'] ?? null,
            $data['location'] ?? null,
            $data['is_virtual'] ?? false,
            $data['event_type'] ?? 'general',
            $data['max_attendees'] ?? null,
            $data['registration_required'] ?? false,
            $data['registration_deadline'] ?? null,
            $data['ticket_price'] ?? null,
            $data['event_url'] ?? null,
            $data['cover_image_url'] ?? null,
            isset($data['tags']) ? json_encode($data['tags']) : null
        ]);
        
        $eventId = $pdo->lastInsertId();
        
        // Index for search
        self::indexForSearch($eventId);
        
        return self::findById($eventId);
    }

    public static function findById($id)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT e.*, u.username as promoter_username, u.avatar_url as promoter_avatar,
                       COUNT(DISTINCT ea.id) as attendee_count,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT c.id) as comment_count
                FROM events e
                LEFT JOIN users u ON e.promoter_id = u.id
                LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.status = 'confirmed'
                LEFT JOIN interviews i ON e.id = i.event_id
                LEFT JOIN comments c ON c.entity_type = 'event' AND c.entity_id = e.id
                WHERE e.id = ?
                GROUP BY e.id";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        
        $event = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($event) {
            $event = self::formatEvent($event);
        }
        
        return $event;
    }

    public static function update($id, $data)
    {
        $pdo = self::getConnection();
        
        $fields = [];
        $values = [];
        
        $allowedFields = ['title', 'description', 'start_date', 'end_date', 'location', 'is_virtual', 
                         'event_type', 'max_attendees', 'registration_required', 'registration_deadline',
                         'ticket_price', 'event_url', 'cover_image_url', 'tags', 'status'];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                if ($field === 'tags' && is_array($data[$field])) {
                    $values[] = json_encode($data[$field]);
                } else {
                    $values[] = $data[$field];
                }
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $fields[] = "updated_at = NOW()";
        $values[] = $id;
        
        $sql = "UPDATE events SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($values);
        
        if ($result) {
            // Update search index
            self::indexForSearch($id);
        }
        
        return $result;
    }

    public static function delete($id)
    {
        $pdo = self::getConnection();
        
        // Delete related data first
        $pdo->prepare("DELETE FROM event_attendees WHERE event_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM comments WHERE entity_type = 'event' AND entity_id = ?")->execute([$id]);
        $pdo->prepare("UPDATE interviews SET event_id = NULL WHERE event_id = ?")->execute([$id]);
        
        // Delete the event
        $stmt = $pdo->prepare("DELETE FROM events WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if ($result) {
            // Remove from search index
            self::removeFromSearchIndex($id);
        }
        
        return $result;
    }

    public static function getAll($filters = [], $page = 1, $limit = 20, $sort = 'start_date')
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $conditions = ['1=1'];
        $params = [];
        
        // Apply filters
        if (!empty($filters['event_type'])) {
            $conditions[] = 'e.event_type = ?';
            $params[] = $filters['event_type'];
        }
        
        if (!empty($filters['is_virtual'])) {
            $conditions[] = 'e.is_virtual = ?';
            $params[] = $filters['is_virtual'] === 'true';
        }
        
        if (!empty($filters['location'])) {
            $conditions[] = 'e.location LIKE ?';
            $params[] = '%' . $filters['location'] . '%';
        }
        
        if (!empty($filters['date_from'])) {
            $conditions[] = 'e.start_date >= ?';
            $params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $conditions[] = 'e.start_date <= ?';
            $params[] = $filters['date_to'];
        }
        
        if (!empty($filters['search'])) {
            $conditions[] = '(e.title LIKE ? OR e.description LIKE ?)';
            $params[] = '%' . $filters['search'] . '%';
            $params[] = '%' . $filters['search'] . '%';
        }
        
        if (!empty($filters['status'])) {
            $conditions[] = 'e.status = ?';
            $params[] = $filters['status'];
        } else {
            // Default to active events only
            $conditions[] = 'e.status = ?';
            $params[] = 'active';
        }
        
        // Build sort clause
        $sortOptions = [
            'start_date' => 'e.start_date ASC',
            'created_at' => 'e.created_at DESC',
            'title' => 'e.title ASC',
            'attendees' => 'attendee_count DESC',
            'popular' => 'interview_count DESC'
        ];
        
        $orderBy = $sortOptions[$sort] ?? $sortOptions['start_date'];
        
        // Count total
        $countSql = "SELECT COUNT(DISTINCT e.id) 
                     FROM events e 
                     WHERE " . implode(' AND ', $conditions);
        
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Get events
        $sql = "SELECT e.*, u.username as promoter_username, u.avatar_url as promoter_avatar,
                       COUNT(DISTINCT ea.id) as attendee_count,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT c.id) as comment_count
                FROM events e
                LEFT JOIN users u ON e.promoter_id = u.id
                LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.status = 'confirmed'
                LEFT JOIN interviews i ON e.id = i.event_id
                LEFT JOIN comments c ON c.entity_type = 'event' AND c.entity_id = e.id
                WHERE " . implode(' AND ', $conditions) . "
                GROUP BY e.id
                ORDER BY $orderBy
                LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($events as &$event) {
            $event = self::formatEvent($event);
        }
        
        return [
            'events' => $events,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ];
    }

    public static function getByPromoter($promoterId, $page = 1, $limit = 20)
    {
        return self::getAll(['promoter_id' => $promoterId], $page, $limit);
    }

    public static function search($query, $filters = [], $page = 1, $limit = 20)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $conditions = ['MATCH(e.title, e.description) AGAINST(? IN NATURAL LANGUAGE MODE)'];
        $params = [$query];
        
        // Apply additional filters
        if (!empty($filters['event_type'])) {
            $conditions[] = 'e.event_type = ?';
            $params[] = $filters['event_type'];
        }
        
        if (!empty($filters['is_virtual'])) {
            $conditions[] = 'e.is_virtual = ?';
            $params[] = $filters['is_virtual'] === 'true';
        }
        
        if (!empty($filters['date_from'])) {
            $conditions[] = 'e.start_date >= ?';
            $params[] = $filters['date_from'];
        }
        
        // Count total
        $countSql = "SELECT COUNT(DISTINCT e.id) 
                     FROM events e 
                     WHERE " . implode(' AND ', $conditions);
        
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();
        
        // Get events with relevance score
        $sql = "SELECT e.*, u.username as promoter_username, u.avatar_url as promoter_avatar,
                       COUNT(DISTINCT ea.id) as attendee_count,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT c.id) as comment_count,
                       MATCH(e.title, e.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
                FROM events e
                LEFT JOIN users u ON e.promoter_id = u.id
                LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.status = 'confirmed'
                LEFT JOIN interviews i ON e.id = i.event_id
                LEFT JOIN comments c ON c.entity_type = 'event' AND c.entity_id = e.id
                WHERE " . implode(' AND ', $conditions) . "
                GROUP BY e.id
                ORDER BY relevance_score DESC, e.start_date ASC
                LIMIT ? OFFSET ?";
        
        $searchParams = [$query, ...$params, $limit, $offset];
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($searchParams);
        
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($events as &$event) {
            $event = self::formatEvent($event);
        }
        
        return [
            'events' => $events,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit),
            'query' => $query
        ];
    }

    public static function getUpcoming($limit = 10)
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT e.*, u.username as promoter_username, u.avatar_url as promoter_avatar,
                       COUNT(DISTINCT ea.id) as attendee_count,
                       COUNT(DISTINCT i.id) as interview_count,
                       COUNT(DISTINCT c.id) as comment_count
                FROM events e
                LEFT JOIN users u ON e.promoter_id = u.id
                LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.status = 'confirmed'
                LEFT JOIN interviews i ON e.id = i.event_id
                LEFT JOIN comments c ON c.entity_type = 'event' AND c.entity_id = e.id
                WHERE e.start_date > NOW() AND e.status = 'active'
                GROUP BY e.id
                ORDER BY e.start_date ASC
                LIMIT ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit]);
        
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($events as &$event) {
            $event = self::formatEvent($event);
        }
        
        return $events;
    }

    public static function getInterviews($eventId, $page = 1, $limit = 10)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;
        
        $sql = "SELECT i.*, u.username, u.avatar_url,
                       COUNT(DISTINCT l.id) as like_count,
                       COUNT(DISTINCT c.id) as comment_count
                FROM interviews i
                JOIN users u ON i.user_id = u.id
                LEFT JOIN likes l ON l.entity_type = 'interview' AND l.entity_id = i.id
                LEFT JOIN comments c ON c.entity_type = 'interview' AND c.entity_id = i.id
                WHERE i.event_id = ? AND i.status = 'published'
                GROUP BY i.id
                ORDER BY i.created_at DESC
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$eventId, $limit, $offset]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function getEventTypes()
    {
        $pdo = self::getConnection();
        
        $sql = "SELECT event_type, COUNT(*) as count 
                FROM events 
                WHERE status = 'active'
                GROUP BY event_type 
                ORDER BY count DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function formatEvent($event)
    {
        if (!$event) return null;
        
        // Parse JSON fields
        if ($event['tags']) {
            $event['tags'] = json_decode($event['tags'], true);
        }
        
        // Format numbers
        $event['attendee_count'] = (int) $event['attendee_count'];
        $event['interview_count'] = (int) $event['interview_count'];
        $event['comment_count'] = (int) $event['comment_count'];
        
        // Add computed fields
        $event['slug'] = self::generateSlug($event['title'], $event['id']);
        $event['url'] = "/events/{$event['slug']}";
        $event['is_upcoming'] = strtotime($event['start_date']) > time();
        $event['is_ongoing'] = strtotime($event['start_date']) <= time() && 
                              ($event['end_date'] ? strtotime($event['end_date']) >= time() : false);
        $event['is_past'] = $event['end_date'] ? strtotime($event['end_date']) < time() : 
                           strtotime($event['start_date']) < time();
        
        // Format dates
        $event['formatted_start_date'] = date('M j, Y g:i A', strtotime($event['start_date']));
        if ($event['end_date']) {
            $event['formatted_end_date'] = date('M j, Y g:i A', strtotime($event['end_date']));
        }
        
        return $event;
    }

    private static function generateSlug($title, $id)
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title)));
        return $slug . '-' . $id;
    }

    private static function indexForSearch($eventId)
    {
        // This would integrate with the search indexing system
        return true;
    }

    private static function removeFromSearchIndex($eventId)
    {
        // This would remove from the search index
        return true;
    }

    public static function addAttendee($eventId, $userId)
    {
        $pdo = self::getConnection();

        try {
            $pdo->beginTransaction();

            // Check if user is already attending
            $checkSql = "SELECT status FROM event_attendees WHERE event_id = ? AND user_id = ?";
            $checkStmt = $pdo->prepare($checkSql);
            $checkStmt->execute([$eventId, $userId]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                $pdo->rollBack();
                return [
                    'success' => false,
                    'message' => 'You are already registered for this event'
                ];
            }

            // Get event details
            $event = self::findById($eventId);
            if (!$event) {
                $pdo->rollBack();
                return [
                    'success' => false,
                    'message' => 'Event not found'
                ];
            }

            // Check if event is full
            $status = 'confirmed';
            if ($event['max_attendees'] && $event['attendee_count'] >= $event['max_attendees']) {
                $status = 'waitlist';
            }

            // Add attendee
            $insertSql = "INSERT INTO event_attendees (event_id, user_id, status) VALUES (?, ?, ?)";
            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([$eventId, $userId, $status]);

            // Get updated attendee count
            $countSql = "SELECT COUNT(*) FROM event_attendees WHERE event_id = ? AND status = 'confirmed'";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute([$eventId]);
            $attendeeCount = $countStmt->fetchColumn();

            $pdo->commit();

            $message = $status === 'waitlist' ?
                'Added to waitlist - you will be notified if a spot opens up' :
                'Successfully registered for the event';

            return [
                'success' => true,
                'message' => $message,
                'status' => $status,
                'attendee_count' => $attendeeCount
            ];

        } catch (\Exception $e) {
            $pdo->rollBack();
            return [
                'success' => false,
                'message' => 'Failed to register for event'
            ];
        }
    }

    public static function removeAttendee($eventId, $userId)
    {
        $pdo = self::getConnection();

        try {
            $pdo->beginTransaction();

            // Remove attendee
            $deleteSql = "DELETE FROM event_attendees WHERE event_id = ? AND user_id = ?";
            $deleteStmt = $pdo->prepare($deleteSql);
            $result = $deleteStmt->execute([$eventId, $userId]);

            if ($deleteStmt->rowCount() === 0) {
                $pdo->rollBack();
                return [
                    'success' => false,
                    'message' => 'You are not registered for this event'
                ];
            }

            // Check if we can promote someone from waitlist
            $event = self::findById($eventId);
            if ($event['max_attendees']) {
                $promoteSql = "UPDATE event_attendees
                              SET status = 'confirmed'
                              WHERE event_id = ? AND status = 'waitlist'
                              ORDER BY created_at ASC
                              LIMIT 1";
                $promoteStmt = $pdo->prepare($promoteSql);
                $promoteStmt->execute([$eventId]);
            }

            // Get updated attendee count
            $countSql = "SELECT COUNT(*) FROM event_attendees WHERE event_id = ? AND status = 'confirmed'";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute([$eventId]);
            $attendeeCount = $countStmt->fetchColumn();

            $pdo->commit();

            return [
                'success' => true,
                'message' => 'Successfully cancelled your registration',
                'attendee_count' => $attendeeCount
            ];

        } catch (\Exception $e) {
            $pdo->rollBack();
            return [
                'success' => false,
                'message' => 'Failed to cancel registration'
            ];
        }
    }

    public static function getAttendanceStatus($eventId, $userId)
    {
        $pdo = self::getConnection();

        $sql = "SELECT status FROM event_attendees WHERE event_id = ? AND user_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$eventId, $userId]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'is_attending' => $result !== false,
            'status' => $result ? $result['status'] : null
        ];
    }

    public static function linkInterview($eventId, $interviewId)
    {
        $pdo = self::getConnection();

        // Update the interview to link it to the event
        $sql = "UPDATE interviews SET event_id = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute([$eventId, $interviewId]);
    }

    public static function unlinkInterview($interviewId)
    {
        $pdo = self::getConnection();

        // Remove the event link from the interview
        $sql = "UPDATE interviews SET event_id = NULL WHERE id = ?";
        $stmt = $pdo->prepare($sql);

        return $stmt->execute([$interviewId]);
    }

    public static function getAttendees($eventId, $status = null, $page = 1, $limit = 20)
    {
        $pdo = self::getConnection();
        $offset = ($page - 1) * $limit;

        $conditions = ['ea.event_id = ?'];
        $params = [$eventId];

        if ($status) {
            $conditions[] = 'ea.status = ?';
            $params[] = $status;
        }

        $sql = "SELECT u.id, u.username, u.avatar_url, ea.status, ea.registration_date
                FROM event_attendees ea
                JOIN users u ON ea.user_id = u.id
                WHERE " . implode(' AND ', $conditions) . "
                ORDER BY ea.registration_date ASC
                LIMIT ? OFFSET ?";

        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
