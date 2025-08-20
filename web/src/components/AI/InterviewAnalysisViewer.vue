<template>
  <div class="interview-analysis-viewer">
    <!-- Analysis Status -->
    <div v-if="analysisStatus === 'processing'" class="analysis-status processing">
      <div class="status-icon">
        <i class="fas fa-cog fa-spin"></i>
      </div>
      <div class="status-content">
        <h3>AI Analysis in Progress</h3>
        <p>{{ statusMessage }}</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Analysis Results -->
    <div v-else-if="analysisStatus === 'completed' && analysis" class="analysis-results">
      <!-- Overall Score -->
      <div class="overall-score-card">
        <div class="score-circle">
          <div class="score-value">{{ analysis.insights.overall_score }}</div>
          <div class="score-label">Overall Score</div>
        </div>
        <div class="score-breakdown">
          <div class="score-item">
            <span class="label">Confidence</span>
            <div class="score-bar">
              <div class="fill" :style="{ width: (analysis.sentiment.confidence_score * 100) + '%' }"></div>
            </div>
            <span class="value">{{ Math.round(analysis.sentiment.confidence_score * 100) }}%</span>
          </div>
          <div class="score-item">
            <span class="label">Communication</span>
            <div class="score-bar">
              <div class="fill" :style="{ width: (analysis.performance.clarity_score * 100) + '%' }"></div>
            </div>
            <span class="value">{{ Math.round(analysis.performance.clarity_score * 100) }}%</span>
          </div>
          <div class="score-item">
            <span class="label">Technical</span>
            <div class="score-bar">
              <div class="fill" :style="{ width: getTechnicalScore() + '%' }"></div>
            </div>
            <span class="value">{{ getTechnicalScore() }}%</span>
          </div>
        </div>
      </div>

      <!-- Analysis Tabs -->
      <div class="analysis-tabs">
        <div class="tab-headers">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            :class="['tab-header', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            <i :class="tab.icon"></i>
            {{ tab.label }}
          </button>
        </div>

        <!-- Insights Tab -->
        <div v-if="activeTab === 'insights'" class="tab-content">
          <div class="insights-grid">
            <!-- Strengths -->
            <div class="insight-card strengths">
              <h4><i class="fas fa-thumbs-up"></i> Strengths</h4>
              <ul>
                <li v-for="strength in analysis.insights.strengths" :key="strength">
                  {{ strength }}
                </li>
              </ul>
            </div>

            <!-- Areas for Improvement -->
            <div class="insight-card improvements">
              <h4><i class="fas fa-arrow-up"></i> Areas for Improvement</h4>
              <ul>
                <li v-for="area in analysis.insights.areas_for_improvement" :key="area">
                  {{ area }}
                </li>
              </ul>
            </div>

            <!-- Recommendations -->
            <div class="insight-card recommendations">
              <h4><i class="fas fa-lightbulb"></i> Recommendations</h4>
              <div class="recommendation-list">
                <div 
                  v-for="rec in analysis.insights.recommendations" 
                  :key="rec.title"
                  :class="['recommendation', rec.priority]"
                >
                  <div class="rec-header">
                    <span class="rec-title">{{ rec.title }}</span>
                    <span class="rec-priority">{{ rec.priority }}</span>
                  </div>
                  <p class="rec-description">{{ rec.description }}</p>
                </div>
              </div>
            </div>

            <!-- Communication Style -->
            <div class="insight-card communication">
              <h4><i class="fas fa-comments"></i> Communication Style</h4>
              <div class="style-analysis">
                <div class="primary-style">
                  <strong>Primary Style:</strong> {{ analysis.insights.communication_style.primary_style }}
                </div>
                <div class="style-metrics">
                  <div class="metric">
                    <span>Formality</span>
                    <div class="metric-bar">
                      <div class="fill" :style="{ width: (analysis.insights.communication_style.formality * 100) + '%' }"></div>
                    </div>
                  </div>
                  <div class="metric">
                    <span>Enthusiasm</span>
                    <div class="metric-bar">
                      <div class="fill" :style="{ width: (analysis.insights.communication_style.enthusiasm * 100) + '%' }"></div>
                    </div>
                  </div>
                  <div class="metric">
                    <span>Clarity</span>
                    <div class="metric-bar">
                      <div class="fill" :style="{ width: (analysis.insights.communication_style.clarity * 100) + '%' }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Tab -->
        <div v-if="activeTab === 'performance'" class="tab-content">
          <div class="performance-grid">
            <!-- Speaking Pace -->
            <div class="performance-card">
              <h4><i class="fas fa-tachometer-alt"></i> Speaking Pace</h4>
              <div class="metric-value">{{ analysis.performance.speaking_pace.words_per_minute }} WPM</div>
              <div class="metric-assessment">{{ analysis.performance.speaking_pace.assessment }}</div>
              <div class="recommendations">
                <ul>
                  <li v-for="rec in analysis.performance.speaking_pace.recommendations" :key="rec">
                    {{ rec }}
                  </li>
                </ul>
              </div>
            </div>

            <!-- Filler Words -->
            <div class="performance-card">
              <h4><i class="fas fa-filter"></i> Filler Words</h4>
              <div class="metric-value">{{ analysis.performance.filler_words.count }} ({{ analysis.performance.filler_words.percentage }}%)</div>
              <div class="metric-assessment">{{ analysis.performance.filler_words.assessment }}</div>
              <div class="filler-breakdown">
                <div v-for="(count, word) in analysis.performance.filler_words.details" :key="word" class="filler-item">
                  <span class="word">"{{ word }}"</span>
                  <span class="count">{{ count }}x</span>
                </div>
              </div>
            </div>

            <!-- Response Length -->
            <div class="performance-card">
              <h4><i class="fas fa-align-left"></i> Response Length</h4>
              <div class="metric-value">{{ analysis.performance.response_length.average }} words avg</div>
              <div class="length-distribution">
                <div class="distribution-item">
                  <span>Short (< 20 words)</span>
                  <div class="bar">
                    <div class="fill" :style="{ width: (analysis.performance.response_length.distribution.short * 100) + '%' }"></div>
                  </div>
                  <span>{{ Math.round(analysis.performance.response_length.distribution.short * 100) }}%</span>
                </div>
                <div class="distribution-item">
                  <span>Medium (20-50 words)</span>
                  <div class="bar">
                    <div class="fill" :style="{ width: (analysis.performance.response_length.distribution.medium * 100) + '%' }"></div>
                  </div>
                  <span>{{ Math.round(analysis.performance.response_length.distribution.medium * 100) }}%</span>
                </div>
                <div class="distribution-item">
                  <span>Long (> 50 words)</span>
                  <div class="bar">
                    <div class="fill" :style="{ width: (analysis.performance.response_length.distribution.long * 100) + '%' }"></div>
                  </div>
                  <span>{{ Math.round(analysis.performance.response_length.distribution.long * 100) }}%</span>
                </div>
              </div>
            </div>

            <!-- Vocabulary Diversity -->
            <div class="performance-card">
              <h4><i class="fas fa-book"></i> Vocabulary Diversity</h4>
              <div class="metric-value">{{ Math.round(analysis.performance.vocabulary_diversity.diversity_ratio * 100) }}%</div>
              <div class="metric-assessment">{{ analysis.performance.vocabulary_diversity.assessment }}</div>
              <div class="vocab-stats">
                <div class="stat">
                  <span class="label">Total Words:</span>
                  <span class="value">{{ analysis.performance.vocabulary_diversity.total_words }}</span>
                </div>
                <div class="stat">
                  <span class="label">Unique Words:</span>
                  <span class="value">{{ analysis.performance.vocabulary_diversity.unique_words }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sentiment Tab -->
        <div v-if="activeTab === 'sentiment'" class="tab-content">
          <div class="sentiment-grid">
            <!-- Overall Sentiment -->
            <div class="sentiment-card">
              <h4><i class="fas fa-heart"></i> Overall Sentiment</h4>
              <div class="sentiment-gauge">
                <div class="gauge-container">
                  <div class="gauge-fill" :style="{ transform: `rotate(${getSentimentAngle()}deg)` }"></div>
                  <div class="gauge-value">{{ getSentimentLabel() }}</div>
                </div>
              </div>
            </div>

            <!-- Emotions -->
            <div class="sentiment-card">
              <h4><i class="fas fa-smile"></i> Emotional Analysis</h4>
              <div class="emotions-chart">
                <div v-for="(value, emotion) in analysis.sentiment.emotions" :key="emotion" class="emotion-item">
                  <span class="emotion-label">{{ formatEmotionLabel(emotion) }}</span>
                  <div class="emotion-bar">
                    <div class="fill" :style="{ width: (value * 100) + '%' }"></div>
                  </div>
                  <span class="emotion-value">{{ Math.round(value * 100) }}%</span>
                </div>
              </div>
            </div>

            <!-- Confidence Level -->
            <div class="sentiment-card">
              <h4><i class="fas fa-shield-alt"></i> Confidence Analysis</h4>
              <div class="confidence-analysis">
                <div class="confidence-level">
                  <span class="level-label">Overall Confidence:</span>
                  <span class="level-value">{{ analysis.insights.confidence_level.overall_confidence.replace('_', ' ').toUpperCase() }}</span>
                </div>
                <div class="confidence-indicators">
                  <div class="indicator">
                    <span>Verbal Confidence:</span>
                    <div class="indicator-bar">
                      <div class="fill" :style="{ width: (analysis.insights.confidence_level.verbal_confidence * 100) + '%' }"></div>
                    </div>
                  </div>
                  <div class="indicator">
                    <span>Hesitation Count:</span>
                    <span class="count">{{ analysis.insights.confidence_level.hesitation_indicators }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sentiment Timeline -->
            <div class="sentiment-card timeline">
              <h4><i class="fas fa-chart-line"></i> Sentiment Timeline</h4>
              <div class="timeline-chart">
                <div 
                  v-for="(point, index) in analysis.sentiment.sentiment_timeline" 
                  :key="index"
                  class="timeline-point"
                  :style="{ left: ((index / (analysis.sentiment.sentiment_timeline.length - 1)) * 100) + '%' }"
                >
                  <div 
                    class="point" 
                    :class="getSentimentClass(point.sentiment)"
                    :title="`Segment ${point.segment}: ${getSentimentLabel(point.sentiment)}`"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Keywords Tab -->
        <div v-if="activeTab === 'keywords'" class="tab-content">
          <div class="keywords-grid">
            <!-- Technical Terms -->
            <div class="keyword-card">
              <h4><i class="fas fa-code"></i> Technical Terms</h4>
              <div class="keyword-cloud">
                <span 
                  v-for="term in analysis.keywords.technical_terms" 
                  :key="term"
                  class="keyword-tag technical"
                >
                  {{ term }}
                </span>
              </div>
            </div>

            <!-- Soft Skills -->
            <div class="keyword-card">
              <h4><i class="fas fa-users"></i> Soft Skills</h4>
              <div class="keyword-cloud">
                <span 
                  v-for="skill in analysis.keywords.soft_skills" 
                  :key="skill"
                  class="keyword-tag soft-skill"
                >
                  {{ skill }}
                </span>
              </div>
            </div>

            <!-- Industry Terms -->
            <div class="keyword-card">
              <h4><i class="fas fa-industry"></i> Industry Terms</h4>
              <div class="keyword-cloud">
                <span 
                  v-for="term in analysis.keywords.industry_terms" 
                  :key="term"
                  class="keyword-tag industry"
                >
                  {{ term }}
                </span>
              </div>
            </div>

            <!-- Topics -->
            <div class="keyword-card">
              <h4><i class="fas fa-tags"></i> Main Topics</h4>
              <div class="topics-list">
                <div 
                  v-for="topic in analysis.topics" 
                  :key="topic.topic"
                  class="topic-item"
                >
                  <span class="topic-name">{{ topic.topic }}</span>
                  <div class="relevance-bar">
                    <div class="fill" :style="{ width: (topic.relevance_score * 100) + '%' }"></div>
                  </div>
                  <span class="relevance-score">{{ Math.round(topic.relevance_score * 100) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Transcription Tab -->
        <div v-if="activeTab === 'transcription'" class="tab-content">
          <div class="transcription-viewer">
            <div class="transcription-controls">
              <button @click="showTimestamps = !showTimestamps" class="control-btn">
                <i class="fas fa-clock"></i>
                {{ showTimestamps ? 'Hide' : 'Show' }} Timestamps
              </button>
              <button @click="showSpeakers = !showSpeakers" class="control-btn">
                <i class="fas fa-user"></i>
                {{ showSpeakers ? 'Hide' : 'Show' }} Speakers
              </button>
            </div>
            
            <div class="transcription-content">
              <div 
                v-for="(paragraph, index) in analysis.transcription.paragraphs" 
                :key="index"
                class="transcription-paragraph"
              >
                <div v-if="showTimestamps" class="timestamp">
                  {{ formatTime(paragraph.start) }} - {{ formatTime(paragraph.end) }}
                </div>
                <div class="paragraph-text">{{ paragraph.text }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="analysisStatus === 'failed'" class="analysis-error">
      <div class="error-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="error-content">
        <h3>Analysis Failed</h3>
        <p>{{ errorMessage }}</p>
        <button @click="retryAnalysis" class="retry-btn">
          <i class="fas fa-redo"></i>
          Retry Analysis
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InterviewAnalysisViewer',
  props: {
    interviewId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      analysis: null,
      analysisStatus: 'loading', // loading, processing, completed, failed
      statusMessage: '',
      progress: 0,
      errorMessage: '',
      activeTab: 'insights',
      showTimestamps: true,
      showSpeakers: true,
      tabs: [
        { id: 'insights', label: 'Insights', icon: 'fas fa-lightbulb' },
        { id: 'performance', label: 'Performance', icon: 'fas fa-chart-bar' },
        { id: 'sentiment', label: 'Sentiment', icon: 'fas fa-heart' },
        { id: 'keywords', label: 'Keywords', icon: 'fas fa-tags' },
        { id: 'transcription', label: 'Transcription', icon: 'fas fa-file-text' }
      ]
    };
  },
  mounted() {
    this.loadAnalysis();
  },
  methods: {
    async loadAnalysis() {
      try {
        const response = await this.$api.get(`/interviews/${this.interviewId}/analysis`);
        
        if (response.data.status === 'completed') {
          this.analysis = response.data.analysis_data;
          this.analysisStatus = 'completed';
        } else if (response.data.status === 'processing') {
          this.analysisStatus = 'processing';
          this.statusMessage = response.data.status_message || 'Processing interview...';
          this.pollAnalysisStatus();
        } else if (response.data.status === 'failed') {
          this.analysisStatus = 'failed';
          this.errorMessage = response.data.status_message || 'Analysis failed';
        }
      } catch (error) {
        this.analysisStatus = 'failed';
        this.errorMessage = 'Failed to load analysis';
      }
    },
    
    pollAnalysisStatus() {
      const interval = setInterval(async () => {
        try {
          const response = await this.$api.get(`/interviews/${this.interviewId}/analysis`);
          
          if (response.data.status === 'completed') {
            this.analysis = response.data.analysis_data;
            this.analysisStatus = 'completed';
            clearInterval(interval);
          } else if (response.data.status === 'failed') {
            this.analysisStatus = 'failed';
            this.errorMessage = response.data.status_message || 'Analysis failed';
            clearInterval(interval);
          } else {
            this.statusMessage = response.data.status_message || 'Processing...';
            this.progress = Math.min(this.progress + 10, 90);
          }
        } catch (error) {
          clearInterval(interval);
          this.analysisStatus = 'failed';
          this.errorMessage = 'Failed to check analysis status';
        }
      }, 3000);
    },
    
    async retryAnalysis() {
      try {
        await this.$api.post(`/interviews/${this.interviewId}/analyze`);
        this.analysisStatus = 'processing';
        this.statusMessage = 'Starting analysis...';
        this.progress = 0;
        this.pollAnalysisStatus();
      } catch (error) {
        this.errorMessage = 'Failed to start analysis';
      }
    },
    
    getTechnicalScore() {
      if (!this.analysis) return 0;
      const techTermsCount = this.analysis.keywords.technical_terms.length;
      return Math.min(Math.round((techTermsCount / 20) * 100), 100);
    },
    
    getSentimentAngle() {
      if (!this.analysis) return 0;
      const sentiment = this.analysis.sentiment.overall_sentiment;
      return (sentiment + 1) * 90; // Convert -1 to 1 range to 0 to 180 degrees
    },
    
    getSentimentLabel(sentiment = null) {
      const value = sentiment !== null ? sentiment : this.analysis?.sentiment.overall_sentiment;
      if (value > 0.6) return 'Very Positive';
      if (value > 0.2) return 'Positive';
      if (value > -0.2) return 'Neutral';
      if (value > -0.6) return 'Negative';
      return 'Very Negative';
    },
    
    getSentimentClass(sentiment) {
      if (sentiment > 0.2) return 'positive';
      if (sentiment > -0.2) return 'neutral';
      return 'negative';
    },
    
    formatEmotionLabel(emotion) {
      return emotion.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    },
    
    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
};
</script>

<style scoped>
.interview-analysis-viewer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.analysis-status {
  text-align: center;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 20px;
}

.status-icon i {
  font-size: 48px;
  color: #007bff;
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 20px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #28a745);
  transition: width 0.3s ease;
}

.overall-score-card {
  display: flex;
  align-items: center;
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.score-circle {
  text-align: center;
  margin-right: 40px;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  color: #28a745;
}

.score-breakdown {
  flex: 1;
}

.score-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.score-item .label {
  width: 120px;
  font-weight: 500;
}

.score-bar {
  flex: 1;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  margin: 0 15px;
  overflow: hidden;
}

.score-bar .fill {
  height: 100%;
  background: linear-gradient(90deg, #ffc107, #28a745);
  transition: width 0.3s ease;
}

.analysis-tabs {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: hidden;
}

.tab-headers {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.tab-header {
  flex: 1;
  padding: 15px 20px;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-header.active {
  background: white;
  border-bottom: 3px solid #007bff;
}

.tab-content {
  padding: 30px;
}

.insights-grid,
.performance-grid,
.sentiment-grid,
.keywords-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.insight-card,
.performance-card,
.sentiment-card,
.keyword-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.keyword-tag.technical {
  background: #e3f2fd;
  color: #1976d2;
}

.keyword-tag.soft-skill {
  background: #f3e5f5;
  color: #7b1fa2;
}

.keyword-tag.industry {
  background: #e8f5e8;
  color: #388e3c;
}

.transcription-viewer {
  max-height: 600px;
  overflow-y: auto;
}

.transcription-controls {
  margin-bottom: 20px;
}

.control-btn {
  margin-right: 10px;
  padding: 8px 16px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.transcription-paragraph {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.timestamp {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 8px;
}

.analysis-error {
  text-align: center;
  padding: 40px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 12px;
  color: #c53030;
}

.retry-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
