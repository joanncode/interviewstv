<?php

function create_search_indexes_table($pdo) {
    $sql = "CREATE TABLE search_indexes (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        
        searchable_type VARCHAR(50) NOT NULL COMMENT 'Type of searchable entity',
        searchable_id BIGINT UNSIGNED NOT NULL COMMENT 'ID of the searchable entity',
        
        title VARCHAR(500) NOT NULL COMMENT 'Searchable title',
        content TEXT COMMENT 'Searchable content/description',
        tags JSON COMMENT 'Associated tags for filtering',
        metadata JSON COMMENT 'Additional searchable metadata',
        
        category VARCHAR(100) COMMENT 'Content category',
        status VARCHAR(50) DEFAULT 'published' COMMENT 'Content status',
        
        user_id BIGINT UNSIGNED COMMENT 'Content owner',
        username VARCHAR(100) COMMENT 'Content owner username',
        
        view_count INT UNSIGNED DEFAULT 0 COMMENT 'View count for ranking',
        like_count INT UNSIGNED DEFAULT 0 COMMENT 'Like count for ranking',
        comment_count INT UNSIGNED DEFAULT 0 COMMENT 'Comment count for ranking',
        
        popularity_score DECIMAL(10,4) DEFAULT 0 COMMENT 'Calculated popularity score',
        search_score DECIMAL(10,4) DEFAULT 0 COMMENT 'Search relevance score',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_searchable (searchable_type, searchable_id),
        INDEX idx_status (status),
        INDEX idx_category (category),
        INDEX idx_user_id (user_id),
        INDEX idx_popularity (popularity_score DESC),
        INDEX idx_created_at (created_at DESC),
        INDEX idx_view_count (view_count DESC),
        INDEX idx_like_count (like_count DESC),
        
        FULLTEXT INDEX idx_title_search (title),
        FULLTEXT INDEX idx_content_search (content),
        FULLTEXT INDEX idx_full_search (title, content)
    ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
}
