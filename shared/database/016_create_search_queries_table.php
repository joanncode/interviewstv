<?php

function create_search_queries_table($pdo) {
    $sql = "CREATE TABLE search_queries (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        
        user_id BIGINT UNSIGNED NULL COMMENT 'User who performed search (null for anonymous)',
        
        query_text VARCHAR(500) NOT NULL COMMENT 'Search query text',
        filters JSON COMMENT 'Applied filters',
        sort_by VARCHAR(50) DEFAULT 'relevance' COMMENT 'Sort method used',
        
        results_count INT UNSIGNED DEFAULT 0 COMMENT 'Number of results returned',
        clicked_result_id BIGINT UNSIGNED NULL COMMENT 'ID of clicked result',
        clicked_result_type VARCHAR(50) NULL COMMENT 'Type of clicked result',
        
        session_id VARCHAR(100) COMMENT 'Session identifier',
        ip_address VARCHAR(45) COMMENT 'User IP address',
        user_agent TEXT COMMENT 'User agent string',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_user_id (user_id),
        INDEX idx_query_text (query_text),
        INDEX idx_created_at (created_at),
        INDEX idx_session_id (session_id),
        INDEX idx_results_count (results_count),
        
        FULLTEXT INDEX idx_query_search (query_text)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
