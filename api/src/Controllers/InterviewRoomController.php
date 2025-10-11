<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\ValidationService;
use App\Services\AuthService;
use App\Services\InterviewRoomService;
use App\Services\GuestInvitationService;
use App\Exceptions\ValidationException;

/**
 * Interview Room Controller
 * Handles interview room creation, management, and guest invitations
 */
class InterviewRoomController
{
    private AuthService $authService;
    private InterviewRoomService $roomService;
    private GuestInvitationService $invitationService;
    private ValidationService $validator;

    public function __construct()
    {
        $this->authService = new AuthService();
        $this->roomService = new InterviewRoomService();
        $this->invitationService = new GuestInvitationService();
        $this->validator = new ValidationService();
    }

    /**
     * Create a new interview room
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
                'title' => 'required|string|max:255',
                'description' => 'string',
                'scheduled_start' => 'required|datetime',
                'scheduled_end' => 'datetime',
                'max_guests' => 'integer|min:1|max:50',
                'recording_enabled' => 'boolean',
                'chat_enabled' => 'boolean',
                'waiting_room_enabled' => 'boolean',
                'guest_approval_required' => 'boolean',
                'password_protected' => 'boolean',
                'room_password' => 'string|min:6'
            ];

            $this->validator->validate($data, $rules);

            // Create the room
            $room = $this->roomService->createRoom($currentUser['id'], $data);

            return Response::success($room, 'Interview room created successfully', 201);

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to create interview room: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get interview room details
     */
    public function show(Request $request, string $roomId)
    {
        try {
            $currentUser = $this->authService->getCurrentUser($request);
            
            $room = $this->roomService->getRoomById($roomId);
            if (!$room) {
                return Response::notFound('Interview room not found');
            }

            // Check if user has access to this room
            if (!$this->roomService->hasAccess($currentUser['id'] ?? null, $roomId)) {
                return Response::forbidden('Access denied to this interview room');
            }

            return Response::success($room, 'Interview room retrieved successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to retrieve interview room: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update interview room
     */
    public function update(Request $request, string $roomId)
    {
        try {
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            $room = $this->roomService->getRoomById($roomId);
            if (!$room) {
                return Response::notFound('Interview room not found');
            }

            // Check if user is the host
            if ($room['host_user_id'] !== $currentUser['id']) {
                return Response::forbidden('Only the host can update this room');
            }

            $data = $request->all();

            // Validate input
            $rules = [
                'title' => 'string|max:255',
                'description' => 'string',
                'scheduled_start' => 'datetime',
                'scheduled_end' => 'datetime',
                'max_guests' => 'integer|min:1|max:50',
                'recording_enabled' => 'boolean',
                'chat_enabled' => 'boolean',
                'waiting_room_enabled' => 'boolean',
                'guest_approval_required' => 'boolean',
                'password_protected' => 'boolean',
                'room_password' => 'string|min:6'
            ];

            $this->validator->validate($data, $rules);

            $updatedRoom = $this->roomService->updateRoom($roomId, $data);

            return Response::success($updatedRoom, 'Interview room updated successfully');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to update interview room: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete interview room
     */
    public function delete(Request $request, string $roomId)
    {
        try {
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            $room = $this->roomService->getRoomById($roomId);
            if (!$room) {
                return Response::notFound('Interview room not found');
            }

            // Check if user is the host
            if ($room['host_user_id'] !== $currentUser['id']) {
                return Response::forbidden('Only the host can delete this room');
            }

            $this->roomService->deleteRoom($roomId);

            return Response::success(null, 'Interview room deleted successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to delete interview room: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get user's interview rooms
     */
    public function index(Request $request)
    {
        try {
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            $status = $request->input('status');

            $result = $this->roomService->getUserRooms($currentUser['id'], $page, $limit, $status);

            return Response::paginated(
                $result['rooms'],
                $result['total'],
                $page,
                $limit,
                'Interview rooms retrieved successfully'
            );

        } catch (\Exception $e) {
            return Response::error('Failed to retrieve interview rooms: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Invite guests to interview room
     */
    public function inviteGuests(Request $request, string $roomId)
    {
        try {
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            $room = $this->roomService->getRoomById($roomId);
            if (!$room) {
                return Response::notFound('Interview room not found');
            }

            // Check if user is the host
            if ($room['host_user_id'] !== $currentUser['id']) {
                return Response::forbidden('Only the host can invite guests');
            }

            $data = $request->all();

            // Validate input
            $rules = [
                'guests' => 'required|array|min:1',
                'guests.*.email' => 'required|email',
                'guests.*.name' => 'string|max:255',
                'guests.*.role' => 'string|in:guest,co-host,viewer',
                'guests.*.custom_message' => 'string',
                'send_email' => 'boolean'
            ];

            $this->validator->validate($data, $rules);

            $invitations = $this->invitationService->inviteGuests($roomId, $data['guests'], [
                'send_email' => $data['send_email'] ?? true,
                'host_name' => $currentUser['name'],
                'room_title' => $room['title']
            ]);

            return Response::success($invitations, 'Guest invitations sent successfully', 201);

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to invite guests: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get room invitations
     */
    public function getInvitations(Request $request, string $roomId)
    {
        try {
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            $room = $this->roomService->getRoomById($roomId);
            if (!$room) {
                return Response::notFound('Interview room not found');
            }

            // Check if user is the host
            if ($room['host_user_id'] !== $currentUser['id']) {
                return Response::forbidden('Only the host can view invitations');
            }

            $invitations = $this->invitationService->getRoomInvitations($roomId);

            return Response::success($invitations, 'Room invitations retrieved successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to retrieve invitations: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel invitation
     */
    public function cancelInvitation(Request $request, string $roomId, string $invitationId)
    {
        try {
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            $room = $this->roomService->getRoomById($roomId);
            if (!$room) {
                return Response::notFound('Interview room not found');
            }

            // Check if user is the host
            if ($room['host_user_id'] !== $currentUser['id']) {
                return Response::forbidden('Only the host can cancel invitations');
            }

            $this->invitationService->cancelInvitation($invitationId);

            return Response::success(null, 'Invitation cancelled successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to cancel invitation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Resend invitation
     */
    public function resendInvitation(Request $request, string $roomId, string $invitationId)
    {
        try {
            $currentUser = $this->authService->getCurrentUser($request);
            if (!$currentUser) {
                return Response::unauthorized('Authentication required');
            }

            $room = $this->roomService->getRoomById($roomId);
            if (!$room) {
                return Response::notFound('Interview room not found');
            }

            // Check if user is the host
            if ($room['host_user_id'] !== $currentUser['id']) {
                return Response::forbidden('Only the host can resend invitations');
            }

            $this->invitationService->resendInvitation($invitationId, [
                'host_name' => $currentUser['name'],
                'room_title' => $room['title']
            ]);

            return Response::success(null, 'Invitation resent successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to resend invitation: ' . $e->getMessage(), 500);
        }
    }
}
