<?php

// Initialize file-based storage for Interviews.tv
echo "Initializing Interviews.tv File Storage...\n";
echo str_repeat("-", 50) . "\n";

try {
    // Create data directory structure
    $dataDir = __DIR__ . '/data';
    $dirs = [
        $dataDir,
        $dataDir . '/users',
        $dataDir . '/interviews',
        $dataDir . '/guests',
        $dataDir . '/recordings',
        $dataDir . '/chat',
        $dataDir . '/chat/rooms',
        $dataDir . '/chat/messages'
    ];
    
    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
            echo "Created directory: {$dir}\n";
        } else {
            echo "Directory exists: {$dir}\n";
        }
    }
    
    // Create sample data files
    echo "Creating sample data files...\n";
    
    $now = time();
    
    // Sample users
    $users = [
        [
            'id' => 1,
            'username' => 'testhost',
            'email' => 'host@interviews.tv',
            'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
            'name' => 'Test Host',
            'role' => 'host',
            'is_active' => true,
            'email_verified' => true,
            'created_at' => $now,
            'updated_at' => $now
        ],
        [
            'id' => 2,
            'username' => 'testguest',
            'email' => 'guest@interviews.tv',
            'password_hash' => password_hash('password123', PASSWORD_BCRYPT),
            'name' => 'Test Guest',
            'role' => 'guest',
            'is_active' => true,
            'email_verified' => true,
            'created_at' => $now,
            'updated_at' => $now
        ]
    ];
    
    foreach ($users as $user) {
        $userFile = $dataDir . '/users/' . $user['id'] . '.json';
        file_put_contents($userFile, json_encode($user, JSON_PRETTY_PRINT));
        echo "Created user file: {$userFile}\n";
    }
    
    // Sample interview
    $interview = [
        'id' => 1,
        'title' => 'Test Interview',
        'description' => 'This is a test interview for development',
        'host_id' => 1,
        'status' => 'scheduled',
        'join_code' => 'TEST123',
        'scheduled_at' => null,
        'started_at' => null,
        'ended_at' => null,
        'settings' => [],
        'created_at' => $now,
        'updated_at' => $now
    ];
    
    $interviewFile = $dataDir . '/interviews/1.json';
    file_put_contents($interviewFile, json_encode($interview, JSON_PRETTY_PRINT));
    echo "Created interview file: {$interviewFile}\n";
    
    // Sample chat room
    $chatRoom = [
        'id' => 'test-room',
        'name' => 'Test Chat Room',
        'description' => 'Test chat room for development',
        'interview_id' => 1,
        'created_by' => 1,
        'created_at' => $now,
        'updated_at' => $now,
        'is_active' => true,
        'max_users' => 100,
        'settings' => []
    ];
    
    $chatRoomFile = $dataDir . '/chat/rooms/test-room.json';
    file_put_contents($chatRoomFile, json_encode($chatRoom, JSON_PRETTY_PRINT));
    echo "Created chat room file: {$chatRoomFile}\n";
    
    // Create index files
    echo "Creating index files...\n";
    
    // Users index
    $usersIndex = [
        'by_id' => [
            1 => 'users/1.json',
            2 => 'users/2.json'
        ],
        'by_email' => [
            'host@interviews.tv' => 'users/1.json',
            'guest@interviews.tv' => 'users/2.json'
        ],
        'by_username' => [
            'testhost' => 'users/1.json',
            'testguest' => 'users/2.json'
        ]
    ];
    
    file_put_contents($dataDir . '/users/index.json', json_encode($usersIndex, JSON_PRETTY_PRINT));
    
    // Interviews index
    $interviewsIndex = [
        'by_id' => [
            1 => 'interviews/1.json'
        ],
        'by_join_code' => [
            'TEST123' => 'interviews/1.json'
        ],
        'by_host' => [
            1 => ['interviews/1.json']
        ]
    ];
    
    file_put_contents($dataDir . '/interviews/index.json', json_encode($interviewsIndex, JSON_PRETTY_PRINT));
    
    // Chat rooms index
    $chatRoomsIndex = [
        'by_id' => [
            'test-room' => 'chat/rooms/test-room.json'
        ],
        'by_interview' => [
            1 => ['chat/rooms/test-room.json']
        ]
    ];
    
    file_put_contents($dataDir . '/chat/index.json', json_encode($chatRoomsIndex, JSON_PRETTY_PRINT));
    
    // Create empty message files for chat rooms
    $messagesFile = $dataDir . '/chat/messages/test-room.json';
    file_put_contents($messagesFile, json_encode([], JSON_PRETTY_PRINT));
    echo "Created messages file: {$messagesFile}\n";
    
    echo "File storage initialization completed successfully!\n";
    echo str_repeat("-", 50) . "\n";
    
    // Display storage info
    echo "Storage Information:\n";
    echo "- Data directory: {$dataDir}\n";
    echo "- Total files created: " . count(glob($dataDir . '/**/*.json', GLOB_BRACE)) . "\n";
    
    // Count records
    $userFiles = glob($dataDir . '/users/*.json');
    $interviewFiles = glob($dataDir . '/interviews/*.json');
    $chatRoomFiles = glob($dataDir . '/chat/rooms/*.json');
    
    echo "- Users: " . (count($userFiles) - 1) . " records\n"; // -1 for index file
    echo "- Interviews: " . (count($interviewFiles) - 1) . " records\n";
    echo "- Chat rooms: " . count($chatRoomFiles) . " records\n";
    
    echo "\nSample Login Credentials:\n";
    echo "- Host: host@interviews.tv / password123\n";
    echo "- Guest: guest@interviews.tv / password123\n";
    echo "\nSample Data:\n";
    echo "- Test Interview with join code: TEST123\n";
    echo "- Test Chat Room: test-room\n";
    
    echo "\nFile storage is ready for use!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
