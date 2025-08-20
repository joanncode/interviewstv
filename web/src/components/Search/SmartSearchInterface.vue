<template>
  <div class="smart-search-interface">
    <!-- Search Header -->
    <div class="search-header">
      <div class="search-input-container">
        <div class="search-input-wrapper">
          <i class="fas fa-search search-icon"></i>
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            @keyup.enter="performSearch"
            @focus="showSuggestions = true"
            type="text"
            class="search-input"
            placeholder="Search interviews, people, skills, or topics..."
            autocomplete="off"
          />
          <button 
            v-if="searchQuery"
            @click="clearSearch"
            class="clear-button"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Search Suggestions Dropdown -->
        <div v-if="showSuggestions && (suggestions.length > 0 || isLoadingSuggestions)" class="suggestions-dropdown">
          <div v-if="isLoadingSuggestions" class="suggestion-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Finding suggestions...</span>
          </div>
          
          <div v-else>
            <!-- AI Suggestions -->
            <div v-if="suggestions.ai_suggestions && suggestions.ai_suggestions.length > 0" class="suggestion-group">
              <div class="suggestion-group-header">
                <i class="fas fa-magic"></i>
                <span>AI Suggestions</span>
              </div>
              <div 
                v-for="suggestion in suggestions.ai_suggestions.slice(0, 3)" 
                :key="suggestion"
                @click="selectSuggestion(suggestion)"
                class="suggestion-item ai-suggestion"
              >
                <i class="fas fa-lightbulb"></i>
                <span>{{ suggestion }}</span>
              </div>
            </div>
            
            <!-- Recent Searches -->
            <div v-if="suggestions.recent_searches && suggestions.recent_searches.length > 0" class="suggestion-group">
              <div class="suggestion-group-header">
                <i class="fas fa-history"></i>
                <span>Recent Searches</span>
              </div>
              <div 
                v-for="search in suggestions.recent_searches.slice(0, 3)" 
                :key="search"
                @click="selectSuggestion(search)"
                class="suggestion-item recent-search"
              >
                <i class="fas fa-clock"></i>
                <span>{{ search }}</span>
              </div>
            </div>
            
            <!-- Popular Searches -->
            <div v-if="suggestions.popular_searches && suggestions.popular_searches.length > 0" class="suggestion-group">
              <div class="suggestion-group-header">
                <i class="fas fa-fire"></i>
                <span>Trending</span>
              </div>
              <div 
                v-for="search in suggestions.popular_searches.slice(0, 3)" 
                :key="search"
                @click="selectSuggestion(search)"
                class="suggestion-item popular-search"
              >
                <i class="fas fa-trending-up"></i>
                <span>{{ search }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Search Filters -->
      <div class="search-filters">
        <button 
          v-for="filter in searchFilters" 
          :key="filter.key"
          @click="toggleFilter(filter.key)"
          :class="['filter-button', { active: activeFilters.includes(filter.key) }]"
        >
          <i :class="filter.icon"></i>
          <span>{{ filter.label }}</span>
        </button>
      </div>
    </div>
    
    <!-- Search Results -->
    <div v-if="hasSearched" class="search-results">
      <!-- Search Info -->
      <div class="search-info">
        <div class="search-stats">
          <span class="result-count">{{ searchResults.total_results }} results</span>
          <span class="search-time">in {{ searchResults.search_time }}ms</span>
          <span v-if="searchResults.intent" class="search-intent">
            Intent: {{ formatIntent(searchResults.intent.primary_intent) }}
          </span>
        </div>
        
        <div class="search-actions">
          <button @click="saveSearch" class="action-button">
            <i class="fas fa-bookmark"></i>
            Save Search
          </button>
          <button @click="shareSearch" class="action-button">
            <i class="fas fa-share"></i>
            Share
          </button>
        </div>
      </div>
      
      <!-- Results Grid -->
      <div class="results-grid">
        <div 
          v-for="result in searchResults.results" 
          :key="result.type + '-' + result.id"
          :class="['result-card', result.type]"
          @click="openResult(result)"
        >
          <!-- Interview Result -->
          <div v-if="result.type === 'interview'" class="interview-result">
            <div class="result-header">
              <h3 class="result-title">{{ result.title }}</h3>
              <div class="result-meta">
                <span class="category">{{ result.category }}</span>
                <span class="duration">{{ result.duration }}min</span>
                <span v-if="result.ai_score" class="ai-score">{{ result.ai_score }}/100</span>
              </div>
            </div>
            <p class="result-description">{{ result.description }}</p>
            <div class="result-footer">
              <div class="interviewer">
                <img :src="result.interviewer_avatar" :alt="result.interviewer_name" class="avatar">
                <span>{{ result.interviewer_name }}</span>
              </div>
              <div class="result-actions">
                <button @click.stop="addToWatchlist(result)" class="action-btn">
                  <i class="fas fa-plus"></i>
                </button>
                <button @click.stop="shareResult(result)" class="action-btn">
                  <i class="fas fa-share"></i>
                </button>
              </div>
            </div>
          </div>
          
          <!-- User Result -->
          <div v-else-if="result.type === 'user'" class="user-result">
            <div class="user-header">
              <img :src="result.avatar" :alt="result.name" class="user-avatar">
              <div class="user-info">
                <h3 class="user-name">{{ result.name }}</h3>
                <p class="user-bio">{{ result.bio }}</p>
              </div>
            </div>
            <div class="user-stats">
              <div class="stat">
                <span class="stat-value">{{ result.interview_count }}</span>
                <span class="stat-label">Interviews</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ result.avg_score || 'N/A' }}</span>
                <span class="stat-label">Avg Score</span>
              </div>
            </div>
            <div class="user-skills">
              <span 
                v-for="skill in result.skills.slice(0, 3)" 
                :key="skill"
                class="skill-tag"
              >
                {{ skill }}
              </span>
            </div>
          </div>
          
          <!-- Topic Result -->
          <div v-else-if="result.type === 'topic'" class="topic-result">
            <div class="topic-header">
              <h3 class="topic-name">{{ result.name }}</h3>
              <div class="topic-stats">
                <span class="interview-count">{{ result.interview_count }} interviews</span>
                <span v-if="result.avg_score" class="avg-score">{{ result.avg_score }}/100 avg</span>
              </div>
            </div>
            <div class="related-tags">
              <span 
                v-for="tag in result.related_tags.slice(0, 4)" 
                :key="tag"
                class="related-tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>
          
          <!-- Skill Result -->
          <div v-else-if="result.type === 'skill'" class="skill-result">
            <div class="skill-header">
              <h3 class="skill-name">{{ result.name }}</h3>
              <div class="demand-indicator" :class="result.demand_level">
                {{ result.demand_level }} demand
              </div>
            </div>
            <div class="skill-stats">
              <div class="stat">
                <span class="stat-value">{{ result.user_count }}</span>
                <span class="stat-label">Users</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ result.interview_count }}</span>
                <span class="stat-label">Interviews</span>
              </div>
            </div>
          </div>
          
          <!-- Relevance Score -->
          <div class="relevance-score">
            <div class="score-bar">
              <div 
                class="score-fill" 
                :style="{ width: (result.final_score * 100) + '%' }"
              ></div>
            </div>
            <span class="score-text">{{ Math.round(result.final_score * 100) }}% match</span>
          </div>
        </div>
      </div>
      
      <!-- Load More -->
      <div v-if="canLoadMore" class="load-more">
        <button @click="loadMoreResults" :disabled="isLoadingMore" class="load-more-button">
          <i v-if="isLoadingMore" class="fas fa-spinner fa-spin"></i>
          <span>{{ isLoadingMore ? 'Loading...' : 'Load More Results' }}</span>
        </button>
      </div>
    </div>
    
    <!-- Recommendations Section -->
    <div v-if="!hasSearched" class="recommendations-section">
      <h2 class="section-title">
        <i class="fas fa-magic"></i>
        Recommended for You
      </h2>
      
      <div class="recommendation-tabs">
        <button 
          v-for="tab in recommendationTabs" 
          :key="tab.key"
          @click="activeRecommendationTab = tab.key"
          :class="['tab-button', { active: activeRecommendationTab === tab.key }]"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      </div>
      
      <div class="recommendations-grid">
        <div 
          v-for="recommendation in currentRecommendations" 
          :key="recommendation.type + '-' + recommendation.id"
          :class="['recommendation-card', recommendation.type]"
          @click="openResult(recommendation)"
        >
          <!-- Similar structure to search results but with recommendation reasons -->
          <div class="recommendation-reason">
            <i class="fas fa-info-circle"></i>
            <span>{{ recommendation.recommendation_reason }}</span>
          </div>
          
          <!-- Content based on type (similar to search results) -->
          <div v-if="recommendation.type === 'interview'" class="interview-recommendation">
            <h3 class="title">{{ recommendation.title }}</h3>
            <p class="description">{{ recommendation.description }}</p>
            <div class="meta">
              <span class="category">{{ recommendation.category }}</span>
              <span class="interviewer">by {{ recommendation.interviewer_name }}</span>
            </div>
          </div>
          
          <div v-else-if="recommendation.type === 'skill'" class="skill-recommendation">
            <h3 class="skill-name">{{ recommendation.name }}</h3>
            <div class="skill-info">
              <span class="difficulty">{{ recommendation.difficulty }} level</span>
              <span class="time-to-learn">{{ recommendation.time_to_learn }}</span>
            </div>
            <p class="learning-path">{{ recommendation.learning_path }}</p>
          </div>
          
          <!-- Add other recommendation types as needed -->
        </div>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-if="hasSearched && searchResults.results.length === 0" class="empty-state">
      <div class="empty-icon">
        <i class="fas fa-search"></i>
      </div>
      <h3>No results found</h3>
      <p>Try adjusting your search terms or filters</p>
      <div class="empty-suggestions">
        <h4>Suggestions:</h4>
        <ul>
          <li>Check your spelling</li>
          <li>Use more general terms</li>
          <li>Try different keywords</li>
          <li>Remove some filters</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SmartSearchInterface',
  data() {
    return {
      searchQuery: '',
      showSuggestions: false,
      isLoadingSuggestions: false,
      suggestions: {},
      searchResults: {},
      hasSearched: false,
      isLoadingMore: false,
      canLoadMore: false,
      currentPage: 1,
      activeFilters: [],
      activeRecommendationTab: 'mixed',
      recommendations: {},
      searchFilters: [
        { key: 'interviews', label: 'Interviews', icon: 'fas fa-video' },
        { key: 'people', label: 'People', icon: 'fas fa-users' },
        { key: 'skills', label: 'Skills', icon: 'fas fa-cogs' },
        { key: 'topics', label: 'Topics', icon: 'fas fa-tags' }
      ],
      recommendationTabs: [
        { key: 'mixed', label: 'For You', icon: 'fas fa-magic' },
        { key: 'interviews', label: 'Interviews', icon: 'fas fa-video' },
        { key: 'skills', label: 'Skills', icon: 'fas fa-cogs' },
        { key: 'people', label: 'People', icon: 'fas fa-users' }
      ],
      suggestionTimeout: null
    };
  },
  computed: {
    currentRecommendations() {
      return this.recommendations[this.activeRecommendationTab] || [];
    }
  },
  mounted() {
    this.loadRecommendations();
    this.setupClickOutside();
  },
  methods: {
    onSearchInput() {
      clearTimeout(this.suggestionTimeout);
      
      if (this.searchQuery.length >= 2) {
        this.suggestionTimeout = setTimeout(() => {
          this.loadSuggestions();
        }, 300);
      } else {
        this.suggestions = {};
        this.showSuggestions = false;
      }
    },
    
    async loadSuggestions() {
      if (this.searchQuery.length < 2) return;
      
      this.isLoadingSuggestions = true;
      
      try {
        const response = await this.$api.get('/search/suggestions', {
          params: { q: this.searchQuery }
        });
        
        this.suggestions = response.data;
        this.showSuggestions = true;
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      } finally {
        this.isLoadingSuggestions = false;
      }
    },
    
    async performSearch() {
      if (!this.searchQuery.trim()) return;
      
      this.hasSearched = true;
      this.showSuggestions = false;
      this.currentPage = 1;
      
      try {
        const response = await this.$api.get('/search', {
          params: {
            q: this.searchQuery,
            filters: this.activeFilters.join(','),
            page: this.currentPage,
            limit: 20
          }
        });
        
        this.searchResults = response.data;
        this.canLoadMore = response.data.results.length === 20;
      } catch (error) {
        console.error('Search failed:', error);
        this.$toast.error('Search failed. Please try again.');
      }
    },
    
    async loadMoreResults() {
      if (this.isLoadingMore) return;
      
      this.isLoadingMore = true;
      this.currentPage++;
      
      try {
        const response = await this.$api.get('/search', {
          params: {
            q: this.searchQuery,
            filters: this.activeFilters.join(','),
            page: this.currentPage,
            limit: 20
          }
        });
        
        this.searchResults.results.push(...response.data.results);
        this.canLoadMore = response.data.results.length === 20;
      } catch (error) {
        console.error('Failed to load more results:', error);
        this.currentPage--; // Revert page increment
      } finally {
        this.isLoadingMore = false;
      }
    },
    
    async loadRecommendations() {
      try {
        const response = await this.$api.get('/recommendations');
        this.recommendations = response.data;
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      }
    },
    
    selectSuggestion(suggestion) {
      this.searchQuery = suggestion;
      this.showSuggestions = false;
      this.performSearch();
    },
    
    toggleFilter(filterKey) {
      const index = this.activeFilters.indexOf(filterKey);
      if (index > -1) {
        this.activeFilters.splice(index, 1);
      } else {
        this.activeFilters.push(filterKey);
      }
      
      if (this.hasSearched) {
        this.performSearch();
      }
    },
    
    clearSearch() {
      this.searchQuery = '';
      this.hasSearched = false;
      this.searchResults = {};
      this.suggestions = {};
      this.showSuggestions = false;
    },
    
    openResult(result) {
      if (result.url) {
        this.$router.push(result.url);
      } else if (result.type === 'interview') {
        this.$router.push(`/interviews/${result.id}`);
      } else if (result.type === 'user') {
        this.$router.push(`/users/${result.id}`);
      }
    },
    
    formatIntent(intent) {
      return intent.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    },
    
    setupClickOutside() {
      document.addEventListener('click', (e) => {
        if (!this.$el.contains(e.target)) {
          this.showSuggestions = false;
        }
      });
    },
    
    // Additional methods for actions
    saveSearch() {
      // Implementation for saving search
    },
    
    shareSearch() {
      // Implementation for sharing search
    },
    
    addToWatchlist(result) {
      // Implementation for adding to watchlist
    },
    
    shareResult(result) {
      // Implementation for sharing result
    }
  }
};
</script>

<style scoped>
.smart-search-interface {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.search-header {
  margin-bottom: 30px;
}

.search-input-container {
  position: relative;
  margin-bottom: 20px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  padding: 0 20px;
  transition: all 0.3s ease;
}

.search-input-wrapper:focus-within {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.search-icon {
  color: #6c757d;
  margin-right: 12px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 16px 0;
  font-size: 16px;
  background: transparent;
}

.clear-button {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.clear-button:hover {
  background: #f8f9fa;
  color: #495057;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
}

.suggestion-group {
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f4;
}

.suggestion-group:last-child {
  border-bottom: none;
}

.suggestion-group-header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.suggestion-item:hover {
  background: #f8f9fa;
}

.suggestion-item i {
  margin-right: 12px;
  width: 16px;
  color: #6c757d;
}

.search-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #e1e5e9;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-button:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.filter-button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.search-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.search-stats {
  display: flex;
  gap: 16px;
  align-items: center;
}

.result-count {
  font-weight: 600;
}

.search-time, .search-intent {
  color: #6c757d;
  font-size: 14px;
}

.search-actions {
  display: flex;
  gap: 12px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid #e1e5e9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #f8f9fa;
}

.results-grid, .recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.result-card, .recommendation-card {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.result-card:hover, .recommendation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #007bff;
}

.relevance-score {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-bar {
  width: 60px;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffc107, #28a745);
  transition: width 0.3s ease;
}

.score-text {
  font-size: 12px;
  color: #6c757d;
}

.recommendation-reason {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #e3f2fd;
  border-radius: 6px;
  font-size: 12px;
  color: #1976d2;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
}

.empty-icon i {
  font-size: 48px;
  margin-bottom: 20px;
  color: #dee2e6;
}

.empty-suggestions {
  margin-top: 30px;
  text-align: left;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.load-more {
  text-align: center;
  margin-top: 30px;
}

.load-more-button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.load-more-button:hover:not(:disabled) {
  background: #0056b3;
}

.load-more-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
