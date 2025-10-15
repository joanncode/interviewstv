<?php

use App\Http\Router;

$router = new Router();

// Authentication routes
$router->group(['prefix' => 'auth'], function($router) {
    $router->post('register', 'AuthController@register');
    $router->post('login', 'AuthController@login');
    $router->post('logout', 'AuthController@logout');
    $router->post('refresh', 'AuthController@refresh');
    $router->post('verify-email', 'AuthController@verifyEmail');
    $router->post('resend-verification', 'AuthController@resendVerification');
    $router->post('forgot-password', 'AuthController@forgotPassword');
    $router->post('reset-password', 'AuthController@resetPassword');
    $router->post('change-password', 'AuthController@changePassword')->middleware('auth');
    $router->get('me', 'AuthController@me')->middleware('auth');
});

// User routes
$router->group(['prefix' => 'users'], function($router) {
    $router->get('/', 'UserController@index');
    $router->get('search', 'UserController@search');
    $router->get('discover', 'UserController@discover');
    $router->get('{username}', 'UserController@show')->where('username', '[a-zA-Z0-9_-]+');
    $router->put('{username}', 'UserController@update')->middleware('auth');
    $router->delete('{username}', 'UserController@delete')->middleware('auth');

    // User relationships
    $router->get('{username}/followers', 'UserController@followers');
    $router->get('{username}/following', 'UserController@following');
    $router->post('{username}/follow', 'UserController@follow')->middleware('auth');
    $router->delete('{username}/follow', 'UserController@unfollow')->middleware('auth');

    // User content
    $router->get('{username}/interviews', 'UserController@interviews');
    $router->get('{username}/stats', 'UserController@stats');

    // Privacy settings
    $router->get('{username}/privacy', 'UserController@getPrivacySettings')->middleware('auth');
    $router->put('{username}/privacy', 'UserController@updatePrivacySettings')->middleware('auth');

    // Profile sharing
    $router->post('{username}/share', 'UserController@trackProfileShare');
    $router->get('{username}/share-stats', 'UserController@getProfileShareStats')->middleware('auth');

    // Account management
    $router->post('delete-account', 'UserController@deleteAccount')->middleware('auth');
});

// Interview routes
$router->group(['prefix' => 'interviews'], function($router) {
    $router->get('/', 'InterviewController@index');
    $router->post('/', 'InterviewController@create')->middleware('auth');
    $router->get('{id}', 'InterviewController@show')->where('id', '[0-9]+');
    $router->put('{id}', 'InterviewController@update')->middleware('auth');
    $router->delete('{id}', 'InterviewController@delete')->middleware('auth');
    
    // Interview media
    $router->get('{id}/media', 'InterviewController@getMedia');
    $router->post('{id}/media', 'InterviewController@addMedia')->middleware('auth');
    $router->delete('{id}/media/{mediaId}', 'InterviewController@deleteMedia')->middleware('auth');
    
    // Interview interactions
    $router->post('{id}/like', 'InterviewController@like')->middleware('auth');
    $router->delete('{id}/like', 'InterviewController@unlike')->middleware('auth');
});

// Comment routes
$router->group(['prefix' => 'comments'], function($router) {
    $router->get('{entityType}/{entityId}', 'CommentController@index')
        ->where('entityType', '(interview|gallery|business|event)')
        ->where('entityId', '[0-9]+');
    $router->post('/', 'CommentController@create')->middleware('auth');
    $router->put('{id}', 'CommentController@update')->middleware('auth');
    $router->delete('{id}', 'CommentController@delete')->middleware('auth');

    // Comment interactions
    $router->post('{id}/like', 'CommentController@like')->middleware('auth');
    $router->delete('{id}/like', 'CommentController@unlike')->middleware('auth');
    $router->post('{id}/report', 'CommentController@report')->middleware('auth');
    $router->get('{id}/replies', 'CommentController@getReplies');
});

// Gallery routes
$router->group(['prefix' => 'galleries'], function($router) {
    $router->get('/', 'GalleryController@index');
    $router->get('{id}', 'GalleryController@show');
    $router->post('/', 'GalleryController@create')->middleware('auth');
    $router->put('{id}', 'GalleryController@update')->middleware('auth');
    $router->delete('{id}', 'GalleryController@delete')->middleware('auth');

    // Gallery media
    $router->get('{id}/media', 'GalleryController@getMedia');
    $router->post('{id}/media', 'GalleryController@addMedia')->middleware('auth');
    $router->put('{id}/media/order', 'GalleryController@updateMediaOrder')->middleware('auth');
});

// Media routes
$router->group(['prefix' => 'media'], function($router) {
    $router->get('{id}', 'MediaController@show')->where('id', '[0-9]+');
    $router->put('{id}', 'MediaController@update')->middleware('auth');
    $router->delete('{id}', 'MediaController@delete')->middleware('auth');

    // Media interactions
    $router->post('{id}/like', 'MediaController@like')->middleware('auth');
    $router->delete('{id}/like', 'MediaController@unlike')->middleware('auth');
});

// Search routes
$router->group(['prefix' => 'search'], function($router) {
    $router->get('/', 'SearchController@search');
    $router->get('suggestions', 'SearchController@suggestions');
    $router->get('popular', 'SearchController@popular');
    $router->get('trending', 'SearchController@trending');
    $router->get('recommendations', 'SearchController@recommendations')->middleware('auth');
    $router->get('categories', 'SearchController@categories');
    $router->get('tags', 'SearchController@tags');

    // Search indexing (admin only)
    $router->post('index', 'SearchController@index')->middleware('auth');
    $router->delete('index/{type}/{id}', 'SearchController@removeIndex')->middleware('auth');
});

// Event routes
$router->group(['prefix' => 'events'], function($router) {
    $router->get('/', 'EventController@index');
    $router->post('/', 'EventController@create')->middleware('auth');
    $router->get('search', 'EventController@search');
    $router->get('upcoming', 'EventController@getUpcoming');
    $router->get('types', 'EventController@getEventTypes');
    $router->get('{id}', 'EventController@show')->where('id', '[0-9]+');
    $router->put('{id}', 'EventController@update')->middleware('auth');
    $router->delete('{id}', 'EventController@delete')->middleware('auth');

    // Event interactions
    $router->get('{id}/interviews', 'EventController@getInterviews');
    $router->post('{id}/interviews', 'EventController@linkInterview')->middleware('auth');
    $router->post('{id}/rsvp', 'EventController@rsvp')->middleware('auth');
    $router->delete('{id}/rsvp', 'EventController@cancelRsvp')->middleware('auth');
    $router->get('{id}/attendance', 'EventController@getAttendance')->middleware('auth');
});

// Interview Room routes
$router->group(['prefix' => 'interview-rooms'], function($router) {
    // Room management (host only)
    $router->get('/', 'InterviewRoomController@index')->middleware('auth');
    $router->post('/', 'InterviewRoomController@create')->middleware('auth');
    $router->get('{roomId}', 'InterviewRoomController@show');
    $router->put('{roomId}', 'InterviewRoomController@update')->middleware('auth');
    $router->delete('{roomId}', 'InterviewRoomController@delete')->middleware('auth');

    // Guest invitation management
    $router->post('{roomId}/invite', 'InterviewRoomController@inviteGuests')->middleware('auth');
    $router->get('{roomId}/invitations', 'InterviewRoomController@getInvitations')->middleware('auth');
    $router->delete('{roomId}/invitations/{invitationId}', 'InterviewRoomController@cancelInvitation')->middleware('auth');
    $router->post('{roomId}/invitations/{invitationId}/resend', 'InterviewRoomController@resendInvitation')->middleware('auth');
});

// Guest Invitation routes (public access for guests)
$router->group(['prefix' => 'guest'], function($router) {
    // Join code verification and room joining
    $router->post('verify-code', 'GuestInvitationController@verifyJoinCode');
    $router->post('join', 'GuestInvitationController@joinRoom');

    // Invitation management
    $router->get('invitation/{token}', 'GuestInvitationController@getInvitationByToken');
    $router->post('invitation/{token}/accept', 'GuestInvitationController@acceptInvitation');
    $router->post('invitation/{token}/decline', 'GuestInvitationController@declineInvitation');

    // Participant management
    $router->get('participant/{participantId}/status', 'GuestInvitationController@getWaitingRoomStatus');
    $router->put('participant/{participantId}/settings', 'GuestInvitationController@updateDeviceSettings');
    $router->post('participant/{participantId}/leave', 'GuestInvitationController@leaveRoom');

    // Device testing
    $router->post('test-devices', 'GuestInvitationController@testDevices');
});

// Interview Template routes
$router->group(['prefix' => 'interview-templates'], function($router) {
    // Public template access
    $router->get('/', 'InterviewTemplateController@index');
    $router->get('categories', 'InterviewTemplateController@categories');
    $router->get('{id}', 'InterviewTemplateController@show');
    $router->get('{id}/stats', 'InterviewTemplateController@stats');

    // Protected template management
    $router->group(['middleware' => 'auth'], function($router) {
        $router->post('/', 'InterviewTemplateController@create');
        $router->put('{id}', 'InterviewTemplateController@update');
        $router->delete('{id}', 'InterviewTemplateController@delete');
        $router->post('{id}/duplicate', 'InterviewTemplateController@duplicate');
        $router->post('{id}/apply', 'InterviewTemplateController@applyToRoom');
    });
});

// Internationalization (i18n) routes
$router->group(['prefix' => 'i18n'], function($router) {
    // Public i18n endpoints
    $router->get('languages', 'I18nController@getLanguages');
    $router->get('translations/{locale}', 'I18nController@getTranslations');
    $router->get('translations/{locale}/{key}', 'I18nController@getTranslation');
    $router->get('stats', 'I18nController@getStats');
    $router->get('missing/{locale}', 'I18nController@getMissingTranslations');
    $router->get('export/{locale}', 'I18nController@exportTranslations');

    // Protected i18n management (admin only)
    $router->group(['middleware' => 'auth'], function($router) {
        $router->post('languages', 'I18nController@addLanguage');
        $router->put('translations/{locale}', 'I18nController@updateTranslations');
        $router->post('import/{locale}', 'I18nController@importTranslations');
    });
});

// Analytics Dashboard routes
$router->group(['prefix' => 'analytics'], function($router) {
    // Public analytics endpoints
    $router->get('dashboard', 'AnalyticsDashboardController@getDashboard');
    $router->get('realtime', 'AnalyticsDashboardController@getRealTimeAnalytics');
    $router->get('engagement', 'AnalyticsDashboardController@getEngagementAnalytics');
    $router->get('audience', 'AnalyticsDashboardController@getAudienceAnalytics');
    $router->get('performance', 'AnalyticsDashboardController@getPerformanceMetrics');
    $router->get('rooms', 'AnalyticsDashboardController@getRoomAnalytics');
    $router->get('export', 'AnalyticsDashboardController@exportAnalytics');

    // Protected analytics endpoints (require authentication)
    $router->group(['middleware' => 'auth'], function($router) {
        $router->get('admin/platform', 'AnalyticsDashboardController@getPlatformAnalytics');
        $router->get('admin/users', 'AnalyticsDashboardController@getUserAnalytics');
        $router->get('admin/content', 'AnalyticsDashboardController@getContentAnalytics');
        $router->post('admin/reports', 'AnalyticsDashboardController@generateReport');
    });
});

// Export/Import routes
$router->group(['prefix' => 'export'], function($router) {
    // Basic export endpoints
    $router->get('user-data', 'ExportImportController@exportUserData');
    $router->get('interviews', 'ExportImportController@exportInterviews');
    $router->get('settings', 'ExportImportController@exportSettings');
    $router->get('analytics', 'ExportImportController@exportAnalytics');
    $router->post('backup', 'ExportImportController@createBackup');
    $router->get('history', 'ExportImportController@getExportImportHistory');
    $router->get('formats', 'ExportImportController@getExportFormats');
    $router->get('download/{exportId}', 'ExportImportController@downloadExport');

    // Advanced export endpoints
    $router->post('schedule', 'ExportImportController@scheduleExport');
    $router->post('template', 'ExportImportController@createExportTemplate');
    $router->post('batch', 'ExportImportController@batchExport');
    $router->get('incremental', 'ExportImportController@incrementalExport');
    $router->get('optimized', 'ExportImportController@optimizedExport');
    $router->get('metrics', 'ExportImportController@getExportMetrics');
});

$router->group(['prefix' => 'import'], function($router) {
    // Basic import endpoints
    $router->post('user-data', 'ExportImportController@importUserData');
    $router->post('interviews', 'ExportImportController@importInterviews');
    $router->post('settings', 'ExportImportController@importSettings');
    $router->post('restore', 'ExportImportController@restoreFromBackup');
    $router->post('validate', 'ExportImportController@validateImportFile');

    // Advanced import endpoints
    $router->post('validate-advanced', 'ExportImportController@advancedValidateImport');
});

// Backup/Restore routes
$router->group(['prefix' => 'backup'], function($router) {
    // System backup endpoints
    $router->post('create', 'BackupRestoreController@createSystemBackup');
    $router->get('list', 'BackupRestoreController@getBackupList');
    $router->get('{backupId}/details', 'BackupRestoreController@getBackupDetails');
    $router->post('{backupId}/restore', 'BackupRestoreController@restoreFromBackup');
    $router->delete('{backupId}', 'BackupRestoreController@deleteBackup');
    $router->get('{backupId}/download', 'BackupRestoreController@downloadBackup');
    $router->get('status', 'BackupRestoreController@getBackupStatus');
    $router->post('{backupId}/verify', 'BackupRestoreController@verifyBackup');
    $router->get('config', 'BackupRestoreController@getBackupConfig');
    $router->put('config', 'BackupRestoreController@updateBackupConfig');
    $router->post('schedule', 'BackupRestoreController@scheduleBackup');
    $router->get('scheduled', 'BackupRestoreController@getScheduledBackups');
    $router->post('test', 'BackupRestoreController@testBackupSystem');
    $router->get('stats', 'BackupRestoreController@getBackupStats');
});

// Transcription routes
$router->group(['prefix' => 'transcription'], function($router) {
    // Real-time transcription
    $router->post('start/{interviewId}', 'TranscriptionController@startTranscription');
    $router->post('segment/{interviewId}', 'TranscriptionController@processSegment');
    $router->get('realtime/{interviewId}', 'TranscriptionController@getRealtimeTranscription');
    $router->post('complete/{interviewId}', 'TranscriptionController@completeTranscription');

    // Transcription management
    $router->get('{interviewId}', 'TranscriptionController@getTranscription');
    $router->get('{interviewId}/search', 'TranscriptionController@searchTranscription');
    $router->get('{interviewId}/export', 'TranscriptionController@exportTranscription');
    $router->get('{interviewId}/stats', 'TranscriptionController@getTranscriptionStats');

    // Settings
    $router->get('{interviewId}/settings', 'TranscriptionController@getSettings');
    $router->put('{interviewId}/settings', 'TranscriptionController@updateSettings');
});

// Translation routes
$router->group(['prefix' => 'translation'], function($router) {
    // Translation session management
    $router->post('session/start', 'TranslationController@startSession');
    $router->get('session/{sessionId}', 'TranslationController@getSession');
    $router->put('session/{sessionId}', 'TranslationController@updateSession');

    // Translation operations
    $router->post('translate', 'TranslationController@translateText');
    $router->post('batch', 'TranslationController@batchTranslate');
    $router->post('detect', 'TranslationController@detectLanguage');

    // Translation data and analytics
    $router->get('languages', 'TranslationController@getSupportedLanguages');
    $router->get('history', 'TranslationController@getTranslationHistory');
    $router->get('analytics', 'TranslationController@getAnalytics');
    $router->get('stats', 'TranslationController@getTranslationStats');

    // Translation feedback
    $router->post('feedback', 'TranslationController@submitFeedback');
});

// Highlights routes
$router->group(['prefix' => 'highlights'], function($router) {
    // Highlight analysis and detection
    $router->post('analyze/{interviewId}', 'HighlightsController@analyzeInterview');
    $router->get('{interviewId}', 'HighlightsController@getInterviewHighlights');
    $router->get('{interviewId}/summary', 'HighlightsController@getHighlightSummary');
    $router->get('{interviewId}/export', 'HighlightsController@exportHighlights');
    $router->get('queue/{interviewId}', 'HighlightsController@getProcessingQueue');

    // Highlight management
    $router->put('{highlightId}/status', 'HighlightsController@updateHighlightStatus');
    $router->post('{highlightId}/feedback', 'HighlightsController@submitFeedback');
    $router->put('bulk', 'HighlightsController@bulkUpdateHighlights');

    // Highlight data and analytics
    $router->get('search', 'HighlightsController@searchHighlights');
    $router->get('types', 'HighlightsController@getHighlightTypes');
    $router->get('analytics', 'HighlightsController@getHighlightAnalytics');
});

// Smart Camera Switching routes
$router->group(['prefix' => 'smart-camera'], function($router) {
    // Session management
    $router->post('sessions', 'SmartCameraSwitchingController@startSession');
    $router->post('sessions/{sessionId}/stop', 'SmartCameraSwitchingController@stopSession');
    $router->get('sessions/{sessionId}/analytics', 'SmartCameraSwitchingController@getSessionAnalytics');
    $router->get('sessions/{sessionId}/events', 'SmartCameraSwitchingController@getSessionEvents');

    // Camera configuration
    $router->post('sessions/{sessionId}/cameras', 'SmartCameraSwitchingController@configureCameras');

    // Data processing
    $router->post('sessions/{sessionId}/audio', 'SmartCameraSwitchingController@processAudioData');
    $router->post('sessions/{sessionId}/engagement', 'SmartCameraSwitchingController@processEngagementData');

    // Camera switching
    $router->post('sessions/{sessionId}/switch', 'SmartCameraSwitchingController@executeSwitch');

    // Rules management
    $router->get('rules', 'SmartCameraSwitchingController@getSwitchingRules');
    $router->put('rules/{ruleId}', 'SmartCameraSwitchingController@updateSwitchingRule');

    // Demo and testing
    $router->get('demo-data', 'SmartCameraSwitchingController@getDemoData');
});

// AI Content Moderation routes
$router->group(['prefix' => 'content-moderation'], function($router) {
    // Session management
    $router->post('sessions', 'AIContentModerationController@startSession');
    $router->post('sessions/{sessionId}/stop', 'AIContentModerationController@stopSession');

    // Content analysis
    $router->post('sessions/{sessionId}/analyze', 'AIContentModerationController@analyzeContent');
    $router->post('sessions/{sessionId}/batch-analyze', 'AIContentModerationController@batchAnalyzeContent');

    // Analytics and monitoring
    $router->get('sessions/{sessionId}/analytics', 'AIContentModerationController@getSessionAnalytics');
    $router->get('sessions/{sessionId}/stats', 'AIContentModerationController@getSessionStats');
    $router->get('sessions/{sessionId}/history', 'AIContentModerationController@getAnalysisHistory');
    $router->get('sessions/{sessionId}/actions', 'AIContentModerationController@getActionsHistory');
    $router->get('sessions/{sessionId}/export', 'AIContentModerationController@exportSessionData');

    // Rules management
    $router->get('rules', 'AIContentModerationController@getModerationRules');
    $router->put('rules/{ruleId}', 'AIContentModerationController@updateModerationRule');

    // Testing and demo
    $router->post('test', 'AIContentModerationController@testModeration');
    $router->get('demo-data', 'AIContentModerationController@getDemoData');
});

// Automated Summary routes
$router->group(['prefix' => 'automated-summaries'], function($router) {
    // Session management
    $router->post('sessions', 'AutomatedSummaryController@startSession');
    $router->post('sessions/{sessionId}/generate', 'AutomatedSummaryController@generateSummary');
    $router->get('sessions/{sessionId}/analytics', 'AutomatedSummaryController@getSessionAnalytics');

    // Summary management
    $router->get('summaries/{summaryId}', 'AutomatedSummaryController@getSummary');
    $router->get('summaries/{summaryId}/export', 'AutomatedSummaryController@exportSummary');
    $router->post('summaries/{summaryId}/feedback', 'AutomatedSummaryController@submitFeedback');

    // Interview summaries
    $router->get('interviews/{interviewId}/summaries', 'AutomatedSummaryController@getInterviewSummaries');

    // Templates and configuration
    $router->get('templates', 'AutomatedSummaryController@getSummaryTemplates');

    // Testing and demo
    $router->post('test', 'AutomatedSummaryController@testSummaryGeneration');
    $router->get('demo-data', 'AutomatedSummaryController@getDemoData');
});

// Real-time Sentiment Analysis routes
$router->group(['prefix' => 'sentiment-analysis'], function($router) {
    // Session management
    $router->post('sessions', 'RealTimeSentimentController@startSession');
    $router->post('sessions/{sessionId}/analyze', 'RealTimeSentimentController@analyzeSentiment');
    $router->get('sessions/{sessionId}/analytics', 'RealTimeSentimentController@getSessionAnalytics');

    // Timeline and mood tracking
    $router->get('sessions/{sessionId}/timeline', 'RealTimeSentimentController@getSentimentTimeline');
    $router->get('sessions/{sessionId}/mood', 'RealTimeSentimentController@getMoodTracking');
    $router->get('sessions/{sessionId}/alerts', 'RealTimeSentimentController@getSentimentAlerts');
    $router->get('sessions/{sessionId}/results', 'RealTimeSentimentController@getSentimentResults');

    // Feedback and testing
    $router->post('results/{analysisId}/feedback', 'RealTimeSentimentController@submitFeedback');
    $router->post('test', 'RealTimeSentimentController@testSentimentAnalysis');
    $router->get('demo-data', 'RealTimeSentimentController@getDemoData');
});

// AI-Powered Interview Recommendations routes
$router->group(['prefix' => 'ai-recommendations'], function($router) {
    // Session management
    $router->post('sessions', 'AIRecommendationController@startSession');
    $router->post('sessions/{sessionId}/analyze', 'AIRecommendationController@generateRecommendations');

    // Recommendation retrieval
    $router->get('sessions/{sessionId}/recommendations', 'AIRecommendationController@getSessionRecommendations');
    $router->get('sessions/{sessionId}/candidate-assessment', 'AIRecommendationController@getCandidateAssessment');
    $router->get('sessions/{sessionId}/question-optimization', 'AIRecommendationController@getQuestionOptimization');
    $router->get('sessions/{sessionId}/improvement-suggestions', 'AIRecommendationController@getImprovementSuggestions');
    $router->get('sessions/{sessionId}/hiring-decision', 'AIRecommendationController@getHiringDecision');

    // Analytics and feedback
    $router->get('sessions/{sessionId}/analytics', 'AIRecommendationController@getSessionAnalytics');
    $router->post('recommendations/{recommendationId}/feedback', 'AIRecommendationController@submitFeedback');

    // Export and testing
    $router->get('sessions/{sessionId}/export', 'AIRecommendationController@exportRecommendations');
    $router->post('test', 'AIRecommendationController@testWithSampleData');
    $router->get('demo-data', 'AIRecommendationController@getDemoData');
});

// Calendar Integration routes
$router->group(['prefix' => 'calendar'], function($router) {
    // Provider management
    $router->get('providers', 'CalendarIntegrationController@getProviders');

    // OAuth flow
    $router->post('oauth/start', 'CalendarIntegrationController@startOAuth');
    $router->post('oauth/callback', 'CalendarIntegrationController@completeOAuth');

    // Connection management
    $router->get('connections', 'CalendarIntegrationController@getConnections');
    $router->post('connections/sync', 'CalendarIntegrationController@syncCalendar');
    $router->delete('connections', 'CalendarIntegrationController@disconnectCalendar');

    // Event management
    $router->post('events', 'CalendarIntegrationController@createEvent');
    $router->put('events', 'CalendarIntegrationController@updateEvent');
    $router->delete('events', 'CalendarIntegrationController@deleteEvent');
    $router->get('events', 'CalendarIntegrationController@getEvents');

    // Availability and analytics
    $router->get('availability', 'CalendarIntegrationController@getAvailability');
    $router->get('analytics', 'CalendarIntegrationController@getAnalytics');

    // Webhooks and export
    $router->post('webhooks', 'CalendarIntegrationController@handleWebhook');
    $router->get('export', 'CalendarIntegrationController@exportCalendarData');

    // Testing and demo
    $router->post('test', 'CalendarIntegrationController@testIntegration');
    $router->get('demo-data', 'CalendarIntegrationController@getDemoData');
});

// Business routes
$router->group(['prefix' => 'businesses'], function($router) {
    $router->get('/', 'BusinessController@index');
    $router->post('/', 'BusinessController@create')->middleware('auth');
    $router->get('{id}', 'BusinessController@show')->where('id', '[0-9]+');
    $router->put('{id}', 'BusinessController@update')->middleware('auth');
    $router->delete('{id}', 'BusinessController@delete')->middleware('auth');
});

// Recording routes (protected - requires authentication)
$router->group(['prefix' => 'recordings'], function($router) {
    // Recording control
    $router->post('start', 'RecordingController@startRecording')->middleware('auth');
    $router->post('{recordingId}/stop', 'RecordingController@stopRecording')->middleware('auth');
    $router->post('{recordingId}/pause', 'RecordingController@pauseRecording')->middleware('auth');
    $router->post('{recordingId}/resume', 'RecordingController@resumeRecording')->middleware('auth');

    // Recording management
    $router->get('/', 'RecordingController@getUserRecordings')->middleware('auth');
    $router->get('{recordingId}', 'RecordingController@getRecording')->middleware('auth');
    $router->delete('{recordingId}', 'RecordingController@deleteRecording')->middleware('auth');

    // File upload for client-side recording
    $router->post('{recordingId}/upload', 'RecordingController@uploadRecordingChunk')->middleware('auth');

    // Process recording chunks
    $router->post('{recordingId}/process', 'RecordingController@processRecordingChunks')->middleware('auth');
});

// Room-specific recording routes
$router->group(['prefix' => 'rooms'], function($router) {
    $router->get('{roomId}/recordings', 'RecordingController@getRoomRecordings')->middleware('auth');
});

// Video storage routes (protected - requires authentication)
$router->group(['prefix' => 'videos'], function($router) {
    // Video file management
    $router->post('store', 'VideoStorageController@storeVideo')->middleware('auth');
    $router->get('/', 'VideoStorageController@listVideoFiles')->middleware('auth');
    $router->get('{recordingId}', 'VideoStorageController@getVideoFile')->middleware('auth');
    $router->get('{recordingId}/qualities', 'VideoStorageController@getVideoQualities')->middleware('auth');
    $router->delete('{recordingId}', 'VideoStorageController@deleteVideoFile')->middleware('auth');

    // Video sharing
    $router->post('{recordingId}/share', 'VideoSharingController@createShareLink')->middleware('auth');
    $router->get('{recordingId}/embed', 'VideoSharingController@getEmbedCode')->middleware('auth');
    $router->get('shared/{shareToken}', 'VideoSharingController@getSharedVideo');
    $router->get('shares', 'VideoSharingController@getUserShares')->middleware('auth');
    $router->patch('shares/{shareId}', 'VideoSharingController@updateShare')->middleware('auth');
    $router->delete('shares/{shareId}', 'VideoSharingController@revokeShare')->middleware('auth');
    $router->get('shares/analytics', 'VideoSharingController@getShareAnalytics')->middleware('auth');
    $router->post('shares/{shareId}/social', 'VideoSharingController@trackSocialShare');
    $router->get('shares/{shareId}/social-urls', 'VideoSharingController@getSocialSharingUrls');

    // Storage statistics
    $router->get('stats', 'VideoStorageController@getStorageStats')->middleware('auth');

    // Video streaming (public access with auth check in controller)
    $router->get('stream/{encodedPath}', 'VideoStorageController@streamVideo');
});

// Video compression routes (protected - requires authentication)
$router->group(['prefix' => 'compression'], function($router) {
    // Compression operations
    $router->post('compress', 'VideoCompressionController@compressVideo')->middleware('auth');
    $router->post('multi-quality', 'VideoCompressionController@createMultipleQualities')->middleware('auth');

    // Job management
    $router->get('jobs', 'VideoCompressionController@listJobs')->middleware('auth');
    $router->get('jobs/{jobId}', 'VideoCompressionController@getJobStatus')->middleware('auth');
    $router->post('jobs/{jobId}/cancel', 'VideoCompressionController@cancelJob')->middleware('auth');

    // Configuration
    $router->get('presets', 'VideoCompressionController@getQualityPresets');
    $router->get('formats', 'VideoCompressionController@getSupportedFormats');

    // Maintenance
    $router->post('cleanup', 'VideoCompressionController@cleanupOldJobs')->middleware('auth');
});

// Video thumbnail routes (protected - requires authentication)
$router->group(['prefix' => 'thumbnails'], function($router) {
    // Thumbnail generation
    $router->post('poster', 'VideoThumbnailController@generatePosterThumbnail')->middleware('auth');
    $router->post('timeline', 'VideoThumbnailController@generateTimelineThumbnails')->middleware('auth');
    $router->post('preview', 'VideoThumbnailController@generateAnimatedPreview')->middleware('auth');
    $router->post('generate-all', 'VideoThumbnailController@generateAllThumbnails')->middleware('auth');

    // Thumbnail management
    $router->get('{recordingId}', 'VideoThumbnailController@getThumbnails')->middleware('auth');
    $router->delete('{recordingId}', 'VideoThumbnailController@deleteThumbnails')->middleware('auth');

    // Thumbnail serving (public access with auth check in controller)
    $router->get('{path}', 'VideoThumbnailController@serveThumbnail');
});

// Video metadata routes (protected - requires authentication)
$router->group(['prefix' => 'metadata'], function($router) {
    // Metadata extraction
    $router->post('extract', 'VideoMetadataController@extractMetadata')->middleware('auth');
    $router->post('batch-extract', 'VideoMetadataController@batchExtractMetadata')->middleware('auth');
    $router->post('re-extract-missing', 'VideoMetadataController@reExtractMissingMetadata')->middleware('auth');

    // Metadata retrieval
    $router->get('{recordingId}', 'VideoMetadataController@getStoredMetadata')->middleware('auth');
    $router->get('stats', 'VideoMetadataController@getMetadataStats')->middleware('auth');

    // Quality assessment
    $router->post('assess-quality', 'VideoMetadataController@assessVideoQuality')->middleware('auth');
});

// Storage management routes (protected - requires authentication)
$router->group(['prefix' => 'storage'], function($router) {
    // User storage management
    $router->get('analytics', 'StorageManagementController@getStorageAnalytics')->middleware('auth');
    $router->get('stats', 'StorageManagementController@getStorageStats')->middleware('auth');
    $router->get('health', 'StorageManagementController@getStorageHealth')->middleware('auth');

    // Storage operations
    $router->post('enforce-quota', 'StorageManagementController@enforceStorageQuota')->middleware('auth');
    $router->post('cleanup', 'StorageManagementController@cleanupOldFiles')->middleware('auth');
    $router->post('optimize', 'StorageManagementController@optimizeStorage')->middleware('auth');

    // Admin operations
    $router->get('system-analytics', 'StorageManagementController@getSystemStorageAnalytics')->middleware('auth');
    $router->post('update-statistics', 'StorageManagementController@updateStorageStatistics')->middleware('auth');
});

// Health check endpoint
$router->get('health', function() {
    try {
        require_once __DIR__ . '/../config/database.php';
        $database = new Database();
        $pdo = $database->getConnection();

        // Test database connection
        $stmt = $pdo->query('SELECT 1 as test');
        $result = $stmt->fetch();

        return [
            'success' => true,
            'message' => 'API is healthy',
            'database' => 'connected',
            'timestamp' => date('Y-m-d H:i:s'),
            'test_query' => $result ? 'passed' : 'failed'
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Database connection failed',
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
});

// Community routes
$router->group(['prefix' => 'communities'], function($router) {
    $router->get('/', 'CommunityController@index');
    $router->post('/', 'CommunityController@create')->middleware('auth');
    $router->get('{id}', 'CommunityController@show')->where('id', '[0-9]+');
    $router->put('{id}', 'CommunityController@update')->middleware('auth');
    $router->delete('{id}', 'CommunityController@delete')->middleware('auth');
    $router->post('{id}/join', 'CommunityController@join')->middleware('auth');
    $router->delete('{id}/leave', 'CommunityController@leave')->middleware('auth');
});

// Search routes
$router->group(['prefix' => 'search'], function($router) {
    $router->get('/', 'SearchController@index');
    $router->get('users', 'SearchController@users');
    $router->get('interviews', 'SearchController@interviews');
    $router->get('events', 'SearchController@events');
    $router->get('businesses', 'SearchController@businesses');
});

// Discovery routes
$router->get('explore', 'DiscoveryController@explore');
$router->get('trending', 'DiscoveryController@trending');
$router->get('categories', 'DiscoveryController@categories');

// Feed routes
$router->group(['prefix' => 'feed'], function($router) {
    $router->get('personal', 'FeedController@personalFeed')->middleware('auth');
    $router->get('public', 'FeedController@publicFeed');
    $router->get('user/{username}', 'FeedController@userFeed')->where('username', '[a-zA-Z0-9_-]+');
    $router->get('preferences', 'FeedController@getFeedPreferences')->middleware('auth');
    $router->put('preferences', 'FeedController@updateFeedPreferences')->middleware('auth');
});

// Notification routes
$router->group(['prefix' => 'notifications', 'middleware' => 'auth'], function($router) {
    $router->get('/', 'NotificationController@index');
    $router->get('unread-count', 'NotificationController@unreadCount');
    $router->put('{id}/read', 'NotificationController@markAsRead')->where('id', '[0-9]+');
    $router->put('mark-all-read', 'NotificationController@markAllAsRead');
    $router->delete('{id}', 'NotificationController@delete')->where('id', '[0-9]+');
    $router->get('preferences', 'NotificationController@getPreferences');
    $router->put('preferences', 'NotificationController@updatePreferences');
});

// Upload routes
$router->group(['prefix' => 'upload', 'middleware' => 'auth'], function($router) {
    $router->post('avatar', 'UploadController@avatar');
    $router->delete('avatar', 'UploadController@removeAvatar');
    $router->post('hero-banner', 'UploadController@heroBanner');
    $router->post('business-logo', 'UploadController@businessLogo');
    $router->post('media', 'UploadController@media');
    $router->post('thumbnail', 'UploadController@thumbnail');
});

// Category routes
$router->group(['prefix' => 'categories'], function($router) {
    $router->get('', 'CategoryController@index');
    $router->get('popular', 'CategoryController@popular');
    $router->get('search', 'CategoryController@search');
    $router->get('{id}', 'CategoryController@show');

    // Admin only routes
    $router->group(['middleware' => 'auth'], function($router) {
        $router->post('', 'CategoryController@create');
        $router->put('{id}', 'CategoryController@update');
        $router->delete('{id}', 'CategoryController@delete');
        $router->post('bulk-update', 'CategoryController@bulkUpdate');
    });
});

// Content Management routes
$router->group(['prefix' => 'content-management', 'middleware' => 'auth'], function($router) {
    $router->get('dashboard', 'ContentManagementController@dashboard');
    $router->get('analytics', 'ContentManagementController@analytics');
    $router->get('search', 'ContentManagementController@searchContent');
    $router->post('bulk-actions', 'ContentManagementController@bulkActions');
    $router->post('flag', 'ContentManagementController@flagContent');

    // Moderation routes (admin/moderator only)
    $router->get('moderation-queue', 'ContentManagementController@moderationQueue');
    $router->post('moderate', 'ContentManagementController@moderateContent');
});

// Security routes
$router->group(['prefix' => 'security'], function($router) {
    // Public security endpoints
    $router->post('report', 'SecurityController@reportEvent');

    // Admin only security endpoints
    $router->group(['middleware' => 'auth'], function($router) {
        $router->get('dashboard', 'SecurityController@dashboard');
        $router->get('config', 'SecurityController@getConfig');
        $router->get('export-report', 'SecurityController@exportReport');
        $router->post('ban-ip', 'SecurityController@banIP');
        $router->delete('ban-ip/{ip}', 'SecurityController@unbanIP');
        $router->post('clear-logs', 'SecurityController@clearOldLogs');
    });
});

// Admin routes (require admin role)
$router->group(['prefix' => 'admin', 'middleware' => 'auth'], function($router) {
    // Interview management
    $router->get('interviews/statistics', 'AdminInterviewController@getStatistics');
    $router->get('interviews', 'AdminInterviewController@index');
    $router->patch('interviews/{id}', 'AdminInterviewController@update');
    $router->post('interviews/{id}/moderate', 'AdminInterviewController@moderate');
    $router->post('interviews/bulk-action', 'AdminInterviewController@bulkAction');
    $router->get('interviews/export', 'AdminInterviewController@export');
    $router->get('interviews/{id}/flags', 'AdminInterviewController@getFlags');
    $router->get('interviews/{id}/moderation-history', 'AdminInterviewController@getModerationHistory');
});

// Live Streaming routes
$router->group(['prefix' => 'streams'], function($router) {
    // Stream management
    $router->post('/', 'StreamingController@createStream')->middleware('auth');
    $router->get('live', 'StreamingController@getLiveStreams');
    $router->get('{id}', 'StreamingController@getStream');
    $router->put('{id}', 'StreamingController@updateStream')->middleware('auth');

    // Stream control
    $router->post('{id}/start', 'StreamingController@startStream')->middleware('auth');
    $router->post('{id}/stop', 'StreamingController@stopStream')->middleware('auth');

    // Viewer management
    $router->post('{id}/join', 'StreamingController@joinStream');
    $router->post('{id}/leave', 'StreamingController@leaveStream');

    // Analytics
    $router->get('{id}/stats', 'StreamingController@getStreamStats');
});

// Social Media Streaming Integration routes
$router->group(['prefix' => 'social-streaming'], function($router) {
    // Platform management
    $router->get('platforms', 'SocialMediaStreamingController@getPlatforms');

    // OAuth flow
    $router->post('oauth/start', 'SocialMediaStreamingController@startOAuth')->middleware('auth');
    $router->post('oauth/callback', 'SocialMediaStreamingController@completeOAuth');

    // Connection management
    $router->get('connections', 'SocialMediaStreamingController@getConnections')->middleware('auth');
    $router->delete('connections', 'SocialMediaStreamingController@disconnectPlatform')->middleware('auth');

    // Stream management
    $router->post('streams', 'SocialMediaStreamingController@createStream')->middleware('auth');
    $router->post('streams/start', 'SocialMediaStreamingController@startStream')->middleware('auth');
    $router->post('streams/stop', 'SocialMediaStreamingController@stopStream')->middleware('auth');

    // Analytics and monitoring
    $router->get('analytics', 'SocialMediaStreamingController@getAnalytics')->middleware('auth');

    // Testing and demo
    $router->get('demo-data', 'SocialMediaStreamingController@getDemoData');
});

// Webhook Notification Routes
$router->group(['prefix' => 'webhooks'], function($router) {
    // Webhook endpoint management
    $router->get('endpoints', 'WebhookNotificationController@getEndpoints')->middleware('auth');
    $router->post('endpoints', 'WebhookNotificationController@createEndpoint')->middleware('auth');
    $router->put('endpoints', 'WebhookNotificationController@updateEndpoint')->middleware('auth');
    $router->delete('endpoints', 'WebhookNotificationController@deleteEndpoint')->middleware('auth');

    // Event type management
    $router->get('event-types', 'WebhookNotificationController@getEventTypes');

    // Subscription management
    $router->get('endpoints/subscriptions', 'WebhookNotificationController@getSubscriptions')->middleware('auth');
    $router->post('endpoints/subscriptions', 'WebhookNotificationController@subscribeToEvents')->middleware('auth');
    $router->delete('endpoints/subscriptions', 'WebhookNotificationController@unsubscribeFromEvents')->middleware('auth');

    // Delivery management
    $router->get('endpoints/deliveries', 'WebhookNotificationController@getDeliveryHistory')->middleware('auth');
    $router->post('deliveries/retry', 'WebhookNotificationController@retryDelivery')->middleware('auth');

    // Analytics and monitoring
    $router->get('endpoints/analytics', 'WebhookNotificationController@getAnalytics')->middleware('auth');

    // Testing and utilities
    $router->post('test-event', 'WebhookNotificationController@dispatchTestEvent')->middleware('auth');
    $router->get('templates', 'WebhookNotificationController@getTemplates');
    $router->get('demo-data', 'WebhookNotificationController@getDemoData');
});

// Third-Party Integrations
$router->group(['prefix' => 'integrations'], function() use ($router) {
    // App Management
    $router->get('apps', 'ThirdPartyIntegrationController@getAvailableApps');
    $router->get('apps/details', 'ThirdPartyIntegrationController@getAppDetails');

    // Connection Management
    $router->get('connections', 'ThirdPartyIntegrationController@getUserConnections')->middleware('auth');
    $router->post('connect', 'ThirdPartyIntegrationController@createAuthorizationUrl')->middleware('auth');
    $router->post('oauth/callback', 'ThirdPartyIntegrationController@handleOAuthCallback');
    $router->delete('connections/disconnect', 'ThirdPartyIntegrationController@disconnectApp')->middleware('auth');

    // Workflow Management
    $router->get('workflows', 'ThirdPartyIntegrationController@getUserWorkflows')->middleware('auth');
    $router->post('workflows', 'ThirdPartyIntegrationController@createWorkflow')->middleware('auth');
    $router->post('workflows/execute', 'ThirdPartyIntegrationController@executeWorkflow')->middleware('auth');

    // Template Management
    $router->get('templates', 'ThirdPartyIntegrationController@getIntegrationTemplates');
    $router->post('templates/apply', 'ThirdPartyIntegrationController@applyTemplate')->middleware('auth');

    // Analytics and Monitoring
    $router->get('analytics', 'ThirdPartyIntegrationController@getIntegrationAnalytics')->middleware('auth');

    // Testing and Utilities
    $router->get('demo-data', 'ThirdPartyIntegrationController@getDemoData');
});

// ==================== CRM CONNECTIONS ROUTES ====================
$router->group(['prefix' => 'api/crm'], function() use ($router) {
    $crmController = new App\Controllers\CRMConnectionController($db);

    // Contact Management
    $router->post('/api/crm/contacts/sync', [$crmController, 'syncContacts']);
    $router->post('/api/crm/contacts', [$crmController, 'createContact']);
    $router->get('/api/crm/contacts/mappings', [$crmController, 'getContactMappings']);

    // Lead Management
    $router->post('/api/crm/leads/from-interview', [$crmController, 'createLeadFromInterview']);
    $router->get('/api/crm/leads', [$crmController, 'getInterviewLeads']);

    // Deal Management
    $router->post('/api/crm/deals/from-lead', [$crmController, 'createDealFromLead']);
    $router->get('/api/crm/deals', [$crmController, 'getCRMDeals']);

    // Activity Logging
    $router->post('/api/crm/activities/log-interview', [$crmController, 'logInterviewActivity']);
    $router->get('/api/crm/activities', [$crmController, 'getActivityLogs']);

    // Automation & Analytics
    $router->post('/api/crm/automation/execute', [$crmController, 'executeAutomationRules']);
    $router->get('/api/crm/analytics', [$crmController, 'getCRMAnalytics']);

    // Testing and Utilities
    $router->get('/api/crm/demo-data', [$crmController, 'getDemoData']);
});

// Health check
$router->get('health', function() {
    return response([
        'status' => 'OK',
        'timestamp' => time(),
        'version' => '1.0.0'
    ]);
});

return $router;
