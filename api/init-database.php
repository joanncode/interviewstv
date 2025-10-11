<?php

// Initialize the database for Interviews.tv
echo "Initializing Interviews.tv Database...\n";
echo str_repeat("-", 50) . "\n";

try {
    // Create database file if it doesn't exist
    $dbPath = __DIR__ . '/interviews_tv.db';
    
    if (file_exists($dbPath)) {
        echo "Database file already exists: {$dbPath}\n";
    } else {
        echo "Creating new database file: {$dbPath}\n";
    }
    
    // Connect to SQLite database
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    echo "Connected to database successfully\n";
    
    // Create users table
    echo "Creating users table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            is_active INTEGER DEFAULT 1,
            email_verified INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    ");
    
    // Create interviews table
    echo "Creating interviews table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS interviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            host_id INTEGER NOT NULL,
            status TEXT DEFAULT 'scheduled',
            scheduled_at INTEGER,
            started_at INTEGER,
            ended_at INTEGER,
            join_code TEXT UNIQUE,
            settings TEXT DEFAULT '{}',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (host_id) REFERENCES users(id)
        )
    ");
    
    // Create interview_guests table
    echo "Creating interview_guests table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS interview_guests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER NOT NULL,
            email TEXT NOT NULL,
            name TEXT,
            join_code TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'invited',
            invited_at INTEGER NOT NULL,
            joined_at INTEGER,
            verification_token TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (interview_id) REFERENCES interviews(id)
        )
    ");
    
    // Create recordings table
    echo "Creating recordings table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS recordings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            duration INTEGER DEFAULT 0,
            format TEXT DEFAULT 'webm',
            quality TEXT DEFAULT 'hd',
            thumbnail_path TEXT,
            status TEXT DEFAULT 'processing',
            metadata TEXT DEFAULT '{}',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (interview_id) REFERENCES interviews(id)
        )
    ");
    
    // Create chat_rooms table
    echo "Creating chat_rooms table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS chat_rooms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            interview_id INTEGER,
            created_by INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            is_active INTEGER DEFAULT 1,
            max_users INTEGER DEFAULT 100,
            settings TEXT DEFAULT '{}',
            FOREIGN KEY (interview_id) REFERENCES interviews(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ");
    
    // Create chat_messages table
    echo "Creating chat_messages table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            message TEXT NOT NULL,
            message_type TEXT DEFAULT 'text',
            timestamp INTEGER NOT NULL,
            edited_at INTEGER,
            is_deleted INTEGER DEFAULT 0,
            metadata TEXT DEFAULT '{}',
            FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ");
    
    // Create chat_participants table
    echo "Creating chat_participants table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS chat_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            role TEXT DEFAULT 'participant',
            joined_at INTEGER NOT NULL,
            left_at INTEGER,
            is_active INTEGER DEFAULT 1,
            permissions TEXT DEFAULT '{}',
            FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(room_id, user_id)
        )
    ");
    
    // Create indexes for better performance
    echo "Creating database indexes...\n";
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_interviews_host ON interviews(host_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_interviews_join_code ON interviews(join_code)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_guests_interview ON interview_guests(interview_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_guests_email ON interview_guests(email)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_guests_join_code ON interview_guests(join_code)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_recordings_interview ON recordings(interview_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_chat_messages_room_timestamp ON chat_messages(room_id, timestamp)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_chat_participants_room ON chat_participants(room_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id)");
    
    // Insert sample data for testing
    echo "Inserting sample data...\n";
    
    // Sample user
    $stmt = $pdo->prepare("
        INSERT OR IGNORE INTO users (username, email, password_hash, name, role, is_active, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $now = time();
    $passwordHash = password_hash('password123', PASSWORD_BCRYPT);
    
    $stmt->execute([
        'testhost',
        'host@interviews.tv',
        $passwordHash,
        'Test Host',
        'host',
        1,
        1,
        $now,
        $now
    ]);
    
    $stmt->execute([
        'testguest',
        'guest@interviews.tv',
        $passwordHash,
        'Test Guest',
        'guest',
        1,
        1,
        $now,
        $now
    ]);
    
    // Sample interview
    $stmt = $pdo->prepare("
        INSERT OR IGNORE INTO interviews (title, description, host_id, status, join_code, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        'Test Interview',
        'This is a test interview for development',
        1, // host_id
        'scheduled',
        'TEST123',
        $now,
        $now
    ]);
    
    // Sample chat room
    $stmt = $pdo->prepare("
        INSERT OR IGNORE INTO chat_rooms (id, name, description, interview_id, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        'test-room',
        'Test Chat Room',
        'Test chat room for development',
        1, // interview_id
        1, // created_by
        $now,
        $now
    ]);
    
    echo "Database initialization completed successfully!\n";
    echo str_repeat("-", 50) . "\n";
    
    // Display database info
    echo "Database Information:\n";
    echo "- Location: {$dbPath}\n";
    echo "- Size: " . number_format(filesize($dbPath)) . " bytes\n";
    
    // Count records
    $tables = ['users', 'interviews', 'interview_guests', 'recordings', 'chat_rooms', 'chat_messages', 'chat_participants'];
    
    foreach ($tables as $table) {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM {$table}");
        $count = $stmt->fetch()['count'];
        echo "- {$table}: {$count} records\n";
    }
    
    echo "\nSample Login Credentials:\n";
    echo "- Host: host@interviews.tv / password123\n";
    echo "- Guest: guest@interviews.tv / password123\n";
    echo "\nSample Data:\n";
    echo "- Test Interview with join code: TEST123\n";
    echo "- Test Chat Room: test-room\n";
    
    echo "\nDatabase is ready for use!\n";
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
