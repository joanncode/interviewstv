<?php

namespace App\Controllers;

use App\Models\Event;
use App\Models\User;
use App\Http\Request;
use App\Http\Response;

class EventController
{
    public function index(Request $request)
    {
        try {
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 20), 50);
            $sort = $request->get('sort', 'start_date');
            
            $filters = [];
            
            // Apply filters
            if ($eventType = $request->get('event_type')) {
                $filters['event_type'] = $eventType;
            }
            
            if ($isVirtual = $request->get('is_virtual')) {
                $filters['is_virtual'] = $isVirtual;
            }
            
            if ($location = $request->get('location')) {
                $filters['location'] = $location;
            }
            
            if ($dateFrom = $request->get('date_from')) {
                $filters['date_from'] = $dateFrom;
            }
            
            if ($dateTo = $request->get('date_to')) {
                $filters['date_to'] = $dateTo;
            }
            
            if ($search = $request->get('search')) {
                $filters['search'] = $search;
            }
            
            if ($status = $request->get('status')) {
                $filters['status'] = $status;
            }
            
            $result = Event::getAll($filters, $page, $limit, $sort);
            
            return Response::json([
                'success' => true,
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch events',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $event = Event::findById($id);
            
            if (!$event) {
                return Response::json([
                    'success' => false,
                    'message' => 'Event not found'
                ], 404);
            }
            
            return Response::json([
                'success' => true,
                'data' => $event
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch event',
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
            $requiredFields = ['title', 'start_date'];
            foreach ($requiredFields as $field) {
                if (!$request->has($field)) {
                    return Response::json([
                        'success' => false,
                        'message' => "Field '$field' is required"
                    ], 400);
                }
            }
            
            // Validate dates
            $startDate = $request->get('start_date');
            if (!strtotime($startDate)) {
                return Response::json([
                    'success' => false,
                    'message' => 'Invalid start date format'
                ], 400);
            }
            
            if ($endDate = $request->get('end_date')) {
                if (!strtotime($endDate)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid end date format'
                    ], 400);
                }
                
                if (strtotime($endDate) <= strtotime($startDate)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'End date must be after start date'
                    ], 400);
                }
            }
            
            // Validate event type
            $validTypes = ['conference', 'workshop', 'webinar', 'meetup', 'festival', 'interview', 'general'];
            $eventType = $request->get('event_type', 'general');
            if (!in_array($eventType, $validTypes)) {
                return Response::json([
                    'success' => false,
                    'message' => 'Invalid event type'
                ], 400);
            }
            
            // Validate ticket price if provided
            if ($ticketPrice = $request->get('ticket_price')) {
                if (!is_numeric($ticketPrice) || $ticketPrice < 0) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid ticket price'
                    ], 400);
                }
            }
            
            // Validate max attendees if provided
            if ($maxAttendees = $request->get('max_attendees')) {
                if (!is_numeric($maxAttendees) || $maxAttendees < 1) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid max attendees count'
                    ], 400);
                }
            }
            
            $eventData = [
                'title' => $request->get('title'),
                'description' => $request->get('description'),
                'promoter_id' => $user['id'],
                'start_date' => $startDate,
                'end_date' => $request->get('end_date'),
                'location' => $request->get('location'),
                'is_virtual' => $request->get('is_virtual', false),
                'event_type' => $eventType,
                'max_attendees' => $request->get('max_attendees'),
                'registration_required' => $request->get('registration_required', false),
                'registration_deadline' => $request->get('registration_deadline'),
                'ticket_price' => $request->get('ticket_price'),
                'event_url' => $request->get('event_url'),
                'cover_image_url' => $request->get('cover_image_url'),
                'tags' => $request->get('tags', [])
            ];
            
            $event = Event::create($eventData);
            
            return Response::json([
                'success' => true,
                'message' => 'Event created successfully',
                'data' => $event
            ], 201);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to create event',
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
            
            $event = Event::findById($id);
            
            if (!$event) {
                return Response::json([
                    'success' => false,
                    'message' => 'Event not found'
                ], 404);
            }
            
            // Check ownership or admin privileges
            if ($event['promoter_id'] != $user['id'] && $user['role'] !== 'admin') {
                return Response::json([
                    'success' => false,
                    'message' => 'Unauthorized to update this event'
                ], 403);
            }
            
            // Validate dates if provided
            if ($startDate = $request->get('start_date')) {
                if (!strtotime($startDate)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid start date format'
                    ], 400);
                }
            }
            
            if ($endDate = $request->get('end_date')) {
                if (!strtotime($endDate)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid end date format'
                    ], 400);
                }
                
                $checkStartDate = $startDate ?: $event['start_date'];
                if (strtotime($endDate) <= strtotime($checkStartDate)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'End date must be after start date'
                    ], 400);
                }
            }
            
            // Validate event type if provided
            if ($eventType = $request->get('event_type')) {
                $validTypes = ['conference', 'workshop', 'webinar', 'meetup', 'festival', 'interview', 'general'];
                if (!in_array($eventType, $validTypes)) {
                    return Response::json([
                        'success' => false,
                        'message' => 'Invalid event type'
                    ], 400);
                }
            }
            
            $updateData = [];
            $allowedFields = ['title', 'description', 'start_date', 'end_date', 'location', 'is_virtual',
                             'event_type', 'max_attendees', 'registration_required', 'registration_deadline',
                             'ticket_price', 'event_url', 'cover_image_url', 'tags'];
            
            foreach ($allowedFields as $field) {
                if ($request->has($field)) {
                    $updateData[$field] = $request->get($field);
                }
            }
            
            // Only admins can update status
            if ($user['role'] === 'admin' && $request->has('status')) {
                $updateData['status'] = $request->get('status');
            }
            
            $success = Event::update($id, $updateData);
            
            if ($success) {
                $updatedEvent = Event::findById($id);
                
                return Response::json([
                    'success' => true,
                    'message' => 'Event updated successfully',
                    'data' => $updatedEvent
                ]);
            } else {
                return Response::json([
                    'success' => false,
                    'message' => 'Failed to update event'
                ], 500);
            }
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to update event',
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
            
            $event = Event::findById($id);
            
            if (!$event) {
                return Response::json([
                    'success' => false,
                    'message' => 'Event not found'
                ], 404);
            }
            
            // Check ownership or admin privileges
            if ($event['promoter_id'] != $user['id'] && $user['role'] !== 'admin') {
                return Response::json([
                    'success' => false,
                    'message' => 'Unauthorized to delete this event'
                ], 403);
            }
            
            $success = Event::delete($id);
            
            if ($success) {
                return Response::json([
                    'success' => true,
                    'message' => 'Event deleted successfully'
                ]);
            } else {
                return Response::json([
                    'success' => false,
                    'message' => 'Failed to delete event'
                ], 500);
            }
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to delete event',
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
            
            if ($eventType = $request->get('event_type')) {
                $filters['event_type'] = $eventType;
            }
            
            if ($isVirtual = $request->get('is_virtual')) {
                $filters['is_virtual'] = $isVirtual;
            }
            
            if ($dateFrom = $request->get('date_from')) {
                $filters['date_from'] = $dateFrom;
            }
            
            $result = Event::search($query, $filters, $page, $limit);
            
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
            $event = Event::findById($id);
            
            if (!$event) {
                return Response::json([
                    'success' => false,
                    'message' => 'Event not found'
                ], 404);
            }
            
            $page = (int) $request->get('page', 1);
            $limit = min((int) $request->get('limit', 10), 20);
            
            $interviews = Event::getInterviews($id, $page, $limit);
            
            return Response::json([
                'success' => true,
                'data' => [
                    'interviews' => $interviews,
                    'event' => $event
                ]
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch event interviews',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getUpcoming(Request $request)
    {
        try {
            $limit = min((int) $request->get('limit', 10), 20);
            $events = Event::getUpcoming($limit);
            
            return Response::json([
                'success' => true,
                'data' => $events
            ]);
            
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch upcoming events',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getEventTypes(Request $request)
    {
        try {
            $eventTypes = Event::getEventTypes();

            return Response::json([
                'success' => true,
                'data' => $eventTypes
            ]);

        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to fetch event types',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function rsvp(Request $request, $id)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return Response::json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $event = Event::findById($id);

            if (!$event) {
                return Response::json([
                    'success' => false,
                    'message' => 'Event not found'
                ], 404);
            }

            // Check if event is in the past
            if (strtotime($event['start_date']) < time()) {
                return Response::json([
                    'success' => false,
                    'message' => 'Cannot RSVP to past events'
                ], 400);
            }

            // Check if registration deadline has passed
            if ($event['registration_deadline'] && strtotime($event['registration_deadline']) < time()) {
                return Response::json([
                    'success' => false,
                    'message' => 'Registration deadline has passed'
                ], 400);
            }

            $result = Event::addAttendee($id, $user['id']);

            if ($result['success']) {
                return Response::json([
                    'success' => true,
                    'message' => $result['message'],
                    'data' => [
                        'status' => $result['status'],
                        'attendee_count' => $result['attendee_count']
                    ]
                ]);
            } else {
                return Response::json([
                    'success' => false,
                    'message' => $result['message']
                ], 400);
            }

        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to RSVP to event',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function cancelRsvp(Request $request, $id)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return Response::json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $result = Event::removeAttendee($id, $user['id']);

            if ($result['success']) {
                return Response::json([
                    'success' => true,
                    'message' => $result['message'],
                    'data' => [
                        'attendee_count' => $result['attendee_count']
                    ]
                ]);
            } else {
                return Response::json([
                    'success' => false,
                    'message' => $result['message']
                ], 400);
            }

        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to cancel RSVP',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getAttendance(Request $request, $id)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return Response::json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $attendance = Event::getAttendanceStatus($id, $user['id']);

            return Response::json([
                'success' => true,
                'data' => $attendance
            ]);

        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to get attendance status',
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

            $event = Event::findById($id);

            if (!$event) {
                return Response::json([
                    'success' => false,
                    'message' => 'Event not found'
                ], 404);
            }

            // Check if user is the event promoter
            if ($event['promoter_id'] != $user['id'] && $user['role'] !== 'admin') {
                return Response::json([
                    'success' => false,
                    'message' => 'Unauthorized to link interviews to this event'
                ], 403);
            }

            $interviewId = $request->get('interview_id');

            if (!$interviewId) {
                return Response::json([
                    'success' => false,
                    'message' => 'Interview ID is required'
                ], 400);
            }

            $result = Event::linkInterview($id, $interviewId);

            if ($result) {
                return Response::json([
                    'success' => true,
                    'message' => 'Interview linked to event successfully'
                ]);
            } else {
                return Response::json([
                    'success' => false,
                    'message' => 'Failed to link interview to event'
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
}
