<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Services\ValidationService;
use App\Services\GuestInvitationService;
use App\Services\InterviewRoomService;
use App\Exceptions\ValidationException;

/**
 * Guest Invitation Controller
 * Handles guest-facing invitation endpoints (join, verify, etc.)
 */
class GuestInvitationController
{
    private GuestInvitationService $invitationService;
    private InterviewRoomService $roomService;
    private ValidationService $validator;

    public function __construct()
    {
        $this->invitationService = new GuestInvitationService();
        $this->roomService = new InterviewRoomService();
        $this->validator = new ValidationService();
    }

    /**
     * Verify join code and get invitation details
     */
    public function verifyJoinCode(Request $request)
    {
        try {
            $data = $request->all();

            // Validate input
            $rules = [
                'join_code' => 'required|string|size:12'
            ];

            $this->validator->validate($data, $rules);

            $invitation = $this->invitationService->verifyJoinCode($data['join_code']);

            if (!$invitation) {
                return Response::notFound('Invalid or expired join code');
            }

            // Get room details
            $room = $this->roomService->getRoomById($invitation['room_id']);

            return Response::success([
                'invitation' => $invitation,
                'room' => $room,
                'can_join' => $this->invitationService->canJoinRoom($invitation['id'])
            ], 'Join code verified successfully');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to verify join code: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Join interview room with invitation token
     */
    public function joinRoom(Request $request)
    {
        try {
            $data = $request->all();

            // Validate input
            $rules = [
                'invitation_token' => 'required|string',
                'guest_name' => 'required|string|max:255',
                'device_info' => 'array'
            ];

            $this->validator->validate($data, $rules);

            $result = $this->invitationService->joinRoom(
                $data['invitation_token'],
                $data['guest_name'],
                $data['device_info'] ?? []
            );

            return Response::success($result, 'Successfully joined interview room');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to join room: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get invitation details by token
     */
    public function getInvitationByToken(Request $request, string $token)
    {
        try {
            $invitation = $this->invitationService->getInvitationByToken($token);

            if (!$invitation) {
                return Response::notFound('Invalid or expired invitation');
            }

            // Get room details
            $room = $this->roomService->getRoomById($invitation['room_id']);

            return Response::success([
                'invitation' => $invitation,
                'room' => $room
            ], 'Invitation details retrieved successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to retrieve invitation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Accept invitation
     */
    public function acceptInvitation(Request $request, string $token)
    {
        try {
            $data = $request->all();

            // Validate input
            $rules = [
                'guest_name' => 'required|string|max:255'
            ];

            $this->validator->validate($data, $rules);

            $result = $this->invitationService->acceptInvitation($token, $data['guest_name']);

            return Response::success($result, 'Invitation accepted successfully');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to accept invitation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Decline invitation
     */
    public function declineInvitation(Request $request, string $token)
    {
        try {
            $this->invitationService->declineInvitation($token);

            return Response::success(null, 'Invitation declined successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to decline invitation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get waiting room status
     */
    public function getWaitingRoomStatus(Request $request, string $participantId)
    {
        try {
            $status = $this->invitationService->getWaitingRoomStatus($participantId);

            return Response::success($status, 'Waiting room status retrieved successfully');

        } catch (\Exception $e) {
            return Response::error('Failed to get waiting room status: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update guest device settings
     */
    public function updateDeviceSettings(Request $request, string $participantId)
    {
        try {
            $data = $request->all();

            // Validate input
            $rules = [
                'audio_enabled' => 'boolean',
                'video_enabled' => 'boolean',
                'device_info' => 'array'
            ];

            $this->validator->validate($data, $rules);

            $this->invitationService->updateParticipantSettings($participantId, $data);

            return Response::success(null, 'Device settings updated successfully');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to update device settings: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Leave interview room
     */
    public function leaveRoom(Request $request, string $participantId)
    {
        try {
            $this->invitationService->leaveRoom($participantId);

            return Response::success(null, 'Successfully left the interview room');

        } catch (\Exception $e) {
            return Response::error('Failed to leave room: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Test device capabilities (camera/microphone)
     */
    public function testDevices(Request $request)
    {
        try {
            $data = $request->all();

            // Validate input
            $rules = [
                'audio_test' => 'boolean',
                'video_test' => 'boolean',
                'device_info' => 'array'
            ];

            $this->validator->validate($data, $rules);

            $testResults = $this->invitationService->testDeviceCapabilities($data);

            return Response::success($testResults, 'Device test completed successfully');

        } catch (ValidationException $e) {
            return Response::validationError($e->getErrors());
        } catch (\Exception $e) {
            return Response::error('Failed to test devices: ' . $e->getMessage(), 500);
        }
    }
}
