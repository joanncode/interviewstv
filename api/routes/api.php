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
    $router->get('me', 'AuthController@me')->middleware('auth');
});

// User routes
$router->group(['prefix' => 'users'], function($router) {
    $router->get('/', 'UserController@index');
    $router->get('{username}', 'UserController@show')->where('username', '[a-zA-Z0-9_-]+');
    $router->put('{username}', 'UserController@update')->middleware('auth');
    $router->delete('{username}', 'UserController@delete')->middleware('auth');
    
    // User relationships
    $router->get('{username}/followers', 'UserController@followers');
    $router->get('{username}/following', 'UserController@following');
    $router->post('{username}/follow', 'UserController@follow')->middleware('auth');
    $router->delete('{username}/follow', 'UserController@unfollow')->middleware('auth');
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

// Event routes
$router->group(['prefix' => 'events'], function($router) {
    $router->get('/', 'EventController@index');
    $router->post('/', 'EventController@create')->middleware('auth');
    $router->get('{id}', 'EventController@show')->where('id', '[0-9]+');
    $router->put('{id}', 'EventController@update')->middleware('auth');
    $router->delete('{id}', 'EventController@delete')->middleware('auth');
});

// Business routes
$router->group(['prefix' => 'businesses'], function($router) {
    $router->get('/', 'BusinessController@index');
    $router->post('/', 'BusinessController@create')->middleware('auth');
    $router->get('{id}', 'BusinessController@show')->where('id', '[0-9]+');
    $router->put('{id}', 'BusinessController@update')->middleware('auth');
    $router->delete('{id}', 'BusinessController@delete')->middleware('auth');
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

// Upload routes
$router->group(['prefix' => 'upload', 'middleware' => 'auth'], function($router) {
    $router->post('avatar', 'UploadController@avatar');
    $router->post('media', 'UploadController@media');
    $router->post('thumbnail', 'UploadController@thumbnail');
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
