<template>
  <div class="help-center">
    <!-- Hero Section -->
    <div class="help-hero">
      <div class="container">
        <h1>How can we help you?</h1>
        <p>Find answers, tutorials, and guides to get the most out of Interviews.tv</p>
        
        <!-- Search Bar -->
        <div class="help-search">
          <div class="search-input-group">
            <i class="fas fa-search"></i>
            <input 
              type="text" 
              v-model="searchQuery" 
              @input="performSearch"
              placeholder="Search for help articles, tutorials, or guides..."
            />
          </div>
          
          <!-- Quick Search Results -->
          <div v-if="searchResults.length > 0" class="search-results">
            <div 
              v-for="result in searchResults.slice(0, 5)" 
              :key="result.id"
              class="search-result-item"
              @click="openArticle(result)"
            >
              <i :class="result.icon"></i>
              <div>
                <h4>{{ result.title }}</h4>
                <p>{{ result.excerpt }}</p>
              </div>
            </div>
            <div v-if="searchResults.length > 5" class="search-more">
              <button @click="showAllResults" class="btn-link">
                View all {{ searchResults.length }} results
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <div class="container">
        <h2>Popular Topics</h2>
        <div class="actions-grid">
          <div 
            v-for="action in quickActions" 
            :key="action.id"
            class="action-card"
            @click="navigateToAction(action)"
          >
            <div class="action-icon">
              <i :class="action.icon"></i>
            </div>
            <h3>{{ action.title }}</h3>
            <p>{{ action.description }}</p>
            <span class="action-link">{{ action.linkText }} →</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Help Categories -->
    <div class="help-categories">
      <div class="container">
        <h2>Browse by Category</h2>
        <div class="categories-grid">
          <div 
            v-for="category in helpCategories" 
            :key="category.name"
            class="category-card"
            @click="selectCategory(category)"
          >
            <div class="category-header">
              <div class="category-icon">
                <i :class="category.icon"></i>
              </div>
              <h3>{{ category.name }}</h3>
              <span class="article-count">{{ category.articles.length }} articles</span>
            </div>
            
            <div class="category-articles">
              <div 
                v-for="article in category.articles.slice(0, 3)" 
                :key="article.id"
                class="article-preview"
                @click.stop="openArticle(article)"
              >
                <span class="article-title">{{ article.title }}</span>
                <span class="article-views">{{ article.views }} views</span>
              </div>
              
              <button 
                v-if="category.articles.length > 3"
                @click.stop="selectCategory(category)"
                class="view-all-btn"
              >
                View all articles
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Video Tutorials -->
    <div class="video-tutorials">
      <div class="container">
        <h2>Video Tutorials</h2>
        <p>Learn by watching step-by-step video guides</p>
        
        <div class="tutorials-grid">
          <div 
            v-for="tutorial in videoTutorials" 
            :key="tutorial.id"
            class="tutorial-card"
            @click="playTutorial(tutorial)"
          >
            <div class="tutorial-thumbnail">
              <img :src="tutorial.thumbnail" :alt="tutorial.title" />
              <div class="play-overlay">
                <i class="fas fa-play"></i>
              </div>
              <span class="tutorial-duration">{{ formatDuration(tutorial.duration) }}</span>
            </div>
            <div class="tutorial-info">
              <h4>{{ tutorial.title }}</h4>
              <p>{{ tutorial.description }}</p>
              <div class="tutorial-meta">
                <span class="tutorial-views">{{ tutorial.views }} views</span>
                <span class="tutorial-level">{{ tutorial.level }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ Section -->
    <div class="faq-section">
      <div class="container">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">
          <div 
            v-for="faq in frequentlyAsked" 
            :key="faq.id"
            class="faq-item"
            :class="{ active: activeFaq === faq.id }"
            @click="toggleFaq(faq.id)"
          >
            <div class="faq-question">
              <h4>{{ faq.question }}</h4>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
              <p>{{ faq.answer }}</p>
              <div v-if="faq.links" class="faq-links">
                <a 
                  v-for="link in faq.links" 
                  :key="link.text"
                  :href="link.url"
                  class="faq-link"
                >
                  {{ link.text }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Support -->
    <div class="contact-support">
      <div class="container">
        <div class="support-card">
          <div class="support-content">
            <h2>Still need help?</h2>
            <p>Can't find what you're looking for? Our support team is here to help.</p>
            
            <div class="support-options">
              <button @click="openChat" class="support-btn primary">
                <i class="fas fa-comments"></i>
                Live Chat
                <span class="support-status online">Online</span>
              </button>
              
              <button @click="sendEmail" class="support-btn secondary">
                <i class="fas fa-envelope"></i>
                Email Support
                <span class="support-response">24h response</span>
              </button>
              
              <button @click="scheduleMeeting" class="support-btn secondary">
                <i class="fas fa-calendar"></i>
                Schedule Call
                <span class="support-response">Book a time</span>
              </button>
            </div>
          </div>
          
          <div class="support-illustration">
            <i class="fas fa-headset"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Article Modal -->
    <div v-if="selectedArticle" class="article-modal" @click="closeArticle">
      <div class="article-content" @click.stop>
        <div class="article-header">
          <h1>{{ selectedArticle.title }}</h1>
          <button @click="closeArticle" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="article-body">
          <div class="article-meta">
            <span class="article-category">{{ selectedArticle.category }}</span>
            <span class="article-updated">Updated {{ formatDate(selectedArticle.updatedAt) }}</span>
            <span class="article-reading-time">{{ selectedArticle.readingTime }} min read</span>
          </div>
          
          <div class="article-text" v-html="selectedArticle.content"></div>
          
          <div class="article-footer">
            <div class="article-helpful">
              <span>Was this helpful?</span>
              <button @click="rateArticle(true)" class="helpful-btn">
                <i class="fas fa-thumbs-up"></i>
                Yes
              </button>
              <button @click="rateArticle(false)" class="helpful-btn">
                <i class="fas fa-thumbs-down"></i>
                No
              </button>
            </div>
            
            <div class="article-share">
              <button @click="shareArticle" class="share-btn">
                <i class="fas fa-share"></i>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'

export default {
  name: 'HelpCenter',
  setup() {
    const router = useRouter()
    const notificationStore = useNotificationStore()

    // Reactive state
    const searchQuery = ref('')
    const searchResults = ref([])
    const selectedArticle = ref(null)
    const activeFaq = ref(null)

    // Quick actions for common tasks
    const quickActions = [
      {
        id: 1,
        title: 'Create Your First Interview',
        description: 'Learn how to upload and publish your first interview',
        icon: 'fas fa-microphone',
        linkText: 'Get Started',
        action: 'tutorial',
        target: '/help/create-interview'
      },
      {
        id: 2,
        title: 'Set Up Your Profile',
        description: 'Complete your profile to attract more followers',
        icon: 'fas fa-user-edit',
        linkText: 'Learn More',
        action: 'tutorial',
        target: '/help/profile-setup'
      },
      {
        id: 3,
        title: 'Grow Your Audience',
        description: 'Tips and strategies to increase your reach',
        icon: 'fas fa-chart-line',
        linkText: 'View Guide',
        action: 'tutorial',
        target: '/help/grow-audience'
      },
      {
        id: 4,
        title: 'Monetize Your Content',
        description: 'Learn about creator monetization options',
        icon: 'fas fa-dollar-sign',
        linkText: 'Explore',
        action: 'tutorial',
        target: '/help/monetization'
      }
    ]

    // Help categories with articles
    const helpCategories = [
      {
        name: 'Getting Started',
        icon: 'fas fa-rocket',
        articles: [
          {
            id: 1,
            title: 'Welcome to Interviews.tv',
            excerpt: 'Everything you need to know to get started',
            views: 2341,
            category: 'Getting Started',
            readingTime: 3,
            updatedAt: '2025-01-15',
            content: '<h2>Welcome to Interviews.tv!</h2><p>This comprehensive guide will help you get started...</p>'
          },
          {
            id: 2,
            title: 'Account Setup and Verification',
            excerpt: 'How to set up and verify your account',
            views: 1876,
            category: 'Getting Started',
            readingTime: 5,
            updatedAt: '2025-01-14',
            content: '<h2>Account Setup</h2><p>Setting up your account is quick and easy...</p>'
          },
          {
            id: 3,
            title: 'Understanding User Roles',
            excerpt: 'Viewer, Creator, and Business account differences',
            views: 1543,
            category: 'Getting Started',
            readingTime: 4,
            updatedAt: '2025-01-13',
            content: '<h2>User Roles Explained</h2><p>There are three main types of accounts...</p>'
          }
        ]
      },
      {
        name: 'Creating Content',
        icon: 'fas fa-video',
        articles: [
          {
            id: 4,
            title: 'Video Interview Best Practices',
            excerpt: 'Tips for creating engaging video content',
            views: 3421,
            category: 'Creating Content',
            readingTime: 8,
            updatedAt: '2025-01-12',
            content: '<h2>Video Best Practices</h2><p>Creating great video content requires...</p>'
          },
          {
            id: 5,
            title: 'Audio Recording Guidelines',
            excerpt: 'How to record high-quality audio interviews',
            views: 2187,
            category: 'Creating Content',
            readingTime: 6,
            updatedAt: '2025-01-11',
            content: '<h2>Audio Recording</h2><p>Good audio quality is essential...</p>'
          }
        ]
      },
      {
        name: 'Growing Your Audience',
        icon: 'fas fa-users',
        articles: [
          {
            id: 6,
            title: 'SEO for Interview Content',
            excerpt: 'Optimize your content for better discoverability',
            views: 1987,
            category: 'Growing Your Audience',
            readingTime: 7,
            updatedAt: '2025-01-10',
            content: '<h2>SEO Optimization</h2><p>Making your content discoverable...</p>'
          }
        ]
      }
    ]

    // Video tutorials
    const videoTutorials = [
      {
        id: 1,
        title: 'Platform Overview - Getting Started',
        description: 'A complete walkthrough of the Interviews.tv platform',
        thumbnail: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=225&fit=crop',
        duration: 480, // 8 minutes
        views: 5432,
        level: 'Beginner',
        url: '/tutorials/platform-overview'
      },
      {
        id: 2,
        title: 'Creating Your First Interview',
        description: 'Step-by-step guide to uploading and publishing content',
        thumbnail: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=225&fit=crop',
        duration: 720, // 12 minutes
        views: 3876,
        level: 'Beginner',
        url: '/tutorials/first-interview'
      },
      {
        id: 3,
        title: 'Advanced Profile Optimization',
        description: 'Maximize your profile\'s impact and discoverability',
        thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=225&fit=crop',
        duration: 600, // 10 minutes
        views: 2341,
        level: 'Intermediate',
        url: '/tutorials/profile-optimization'
      }
    ]

    // Frequently asked questions
    const frequentlyAsked = [
      {
        id: 1,
        question: 'How do I upload my first interview?',
        answer: 'To upload your first interview, click the "Create" button in the navigation, choose your content type (video, audio, or text), fill in the details, and upload your file. Our system will process it and notify you when it\'s ready.',
        links: [
          { text: 'Video Tutorial', url: '/tutorials/first-interview' },
          { text: 'Upload Guidelines', url: '/help/upload-guidelines' }
        ]
      },
      {
        id: 2,
        question: 'What file formats are supported?',
        answer: 'We support MP4, MOV, and AVI for videos; MP3, WAV, and M4A for audio; and PDF, DOC, DOCX, and TXT for text-based interviews. Maximum file size is 2GB.',
        links: [
          { text: 'Technical Requirements', url: '/help/technical-requirements' }
        ]
      },
      {
        id: 3,
        question: 'How can I grow my audience?',
        answer: 'Focus on creating high-quality, valuable content consistently. Use relevant tags, engage with your community, collaborate with other creators, and share your content on social media.',
        links: [
          { text: 'Growth Strategies Guide', url: '/help/grow-audience' },
          { text: 'Community Guidelines', url: '/help/community-guidelines' }
        ]
      },
      {
        id: 4,
        question: 'Is there a mobile app?',
        answer: 'Currently, Interviews.tv is available as a responsive web application that works great on mobile devices. Native mobile apps are in development and will be available soon.',
        links: [
          { text: 'Mobile Experience Guide', url: '/help/mobile-guide' }
        ]
      }
    ]

    // Computed properties
    const allArticles = computed(() => {
      return helpCategories.flatMap(category => 
        category.articles.map(article => ({
          ...article,
          icon: category.icon
        }))
      )
    })

    // Methods
    const performSearch = () => {
      if (searchQuery.value.length < 2) {
        searchResults.value = []
        return
      }

      const query = searchQuery.value.toLowerCase()
      searchResults.value = allArticles.value.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query)
      )
    }

    const openArticle = (article) => {
      selectedArticle.value = article
      // Track article view
      article.views++
    }

    const closeArticle = () => {
      selectedArticle.value = null
    }

    const selectCategory = (category) => {
      router.push(`/help/category/${category.name.toLowerCase().replace(/\s+/g, '-')}`)
    }

    const navigateToAction = (action) => {
      if (action.action === 'tutorial') {
        router.push(action.target)
      }
    }

    const playTutorial = (tutorial) => {
      router.push(tutorial.url)
    }

    const toggleFaq = (faqId) => {
      activeFaq.value = activeFaq.value === faqId ? null : faqId
    }

    const rateArticle = (helpful) => {
      notificationStore.addNotification({
        type: 'success',
        message: helpful ? 'Thank you for your feedback!' : 'We\'ll work on improving this article.'
      })
    }

    const shareArticle = () => {
      if (navigator.share && selectedArticle.value) {
        navigator.share({
          title: selectedArticle.value.title,
          text: selectedArticle.value.excerpt,
          url: window.location.href
        })
      } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href)
        notificationStore.addNotification({
          type: 'success',
          message: 'Link copied to clipboard!'
        })
      }
    }

    const openChat = () => {
      // Implement live chat functionality
      notificationStore.addNotification({
        type: 'info',
        message: 'Live chat will open in a new window'
      })
    }

    const sendEmail = () => {
      window.location.href = 'mailto:support@interviews.tv?subject=Help Request'
    }

    const scheduleMeeting = () => {
      // Implement meeting scheduling
      notificationStore.addNotification({
        type: 'info',
        message: 'Redirecting to scheduling system...'
      })
    }

    const showAllResults = () => {
      router.push(`/help/search?q=${encodeURIComponent(searchQuery.value)}`)
    }

    const formatDuration = (seconds) => {
      const minutes = Math.floor(seconds / 60)
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return {
      // State
      searchQuery,
      searchResults,
      selectedArticle,
      activeFaq,
      
      // Data
      quickActions,
      helpCategories,
      videoTutorials,
      frequentlyAsked,
      
      // Computed
      allArticles,
      
      // Methods
      performSearch,
      openArticle,
      closeArticle,
      selectCategory,
      navigateToAction,
      playTutorial,
      toggleFaq,
      rateArticle,
      shareArticle,
      openChat,
      sendEmail,
      scheduleMeeting,
      showAllResults,
      formatDuration,
      formatDate
    }
  }
}
</script>

<style scoped>
.help-center {
  background: #1a1a1a;
  color: white;
  min-height: 100vh;
}

.help-hero {
  background: linear-gradient(135deg, #000 0%, #2a2a2a 100%);
  padding: 80px 0;
  text-align: center;
}

.help-hero h1 {
  font-size: 3rem;
  margin: 0 0 20px 0;
  color: white;
}

.help-hero p {
  font-size: 1.2rem;
  color: #ccc;
  margin: 0 0 40px 0;
}

.help-search {
  max-width: 600px;
  margin: 0 auto;
  position: relative;
}

.search-input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input-group i {
  position: absolute;
  left: 20px;
  color: #666;
  z-index: 2;
}

.search-input-group input {
  width: 100%;
  padding: 20px 20px 20px 50px;
  background: white;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  color: #333;
}

.search-input-group input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.3);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  margin-top: 10px;
  z-index: 10;
  overflow: hidden;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 20px;
  color: #333;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.search-result-item:hover {
  background: #f8f9fa;
}

.search-result-item i {
  color: #FF0000;
  width: 20px;
}

.search-result-item h4 {
  margin: 0 0 5px 0;
  font-size: 1rem;
}

.search-result-item p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.search-more {
  padding: 15px 20px;
  text-align: center;
  border-top: 1px solid #eee;
}

.btn-link {
  background: none;
  border: none;
  color: #FF0000;
  cursor: pointer;
  font-weight: bold;
}

.quick-actions {
  padding: 80px 0;
}

.quick-actions h2 {
  text-align: center;
  margin: 0 0 50px 0;
  font-size: 2.5rem;
  color: white;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.action-card {
  background: #2a2a2a;
  border-radius: 16px;
  padding: 40px 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.action-card:hover {
  transform: translateY(-5px);
  border-color: #FF0000;
  box-shadow: 0 20px 40px rgba(255, 0, 0, 0.1);
}

.action-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #FF0000, #FF4444);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 25px auto;
  font-size: 2rem;
  color: white;
}

.action-card h3 {
  margin: 0 0 15px 0;
  color: white;
  font-size: 1.3rem;
}

.action-card p {
  margin: 0 0 20px 0;
  color: #ccc;
  line-height: 1.6;
}

.action-link {
  color: #FF0000;
  font-weight: bold;
  font-size: 0.9rem;
}

.help-categories {
  padding: 80px 0;
  background: #0f0f0f;
}

.help-categories h2 {
  text-align: center;
  margin: 0 0 50px 0;
  font-size: 2.5rem;
  color: white;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.category-card {
  background: #2a2a2a;
  border-radius: 16px;
  padding: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #333;
}

.category-icon {
  width: 50px;
  height: 50px;
  background: #FF0000;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.category-header h3 {
  flex: 1;
  margin: 0;
  color: white;
  font-size: 1.3rem;
}

.article-count {
  color: #999;
  font-size: 0.9rem;
}

.category-articles {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
  transition: color 0.3s ease;
}

.article-preview:hover {
  color: #FF0000;
}

.article-title {
  flex: 1;
  color: #ccc;
  font-size: 0.95rem;
}

.article-views {
  color: #666;
  font-size: 0.8rem;
}

.view-all-btn {
  background: none;
  border: 1px solid #FF0000;
  color: #FF0000;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
  transition: all 0.3s ease;
}

.view-all-btn:hover {
  background: #FF0000;
  color: white;
}

.video-tutorials {
  padding: 80px 0;
}

.video-tutorials h2 {
  text-align: center;
  margin: 0 0 15px 0;
  font-size: 2.5rem;
  color: white;
}

.video-tutorials p {
  text-align: center;
  color: #ccc;
  margin: 0 0 50px 0;
  font-size: 1.1rem;
}

.tutorials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
}

.tutorial-card {
  background: #2a2a2a;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tutorial-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.tutorial-thumbnail {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.tutorial-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: rgba(255, 0, 0, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.tutorial-duration {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.tutorial-info {
  padding: 25px;
}

.tutorial-info h4 {
  margin: 0 0 10px 0;
  color: white;
  font-size: 1.2rem;
}

.tutorial-info p {
  margin: 0 0 15px 0;
  color: #ccc;
  line-height: 1.5;
}

.tutorial-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.tutorial-views {
  color: #999;
}

.tutorial-level {
  background: #FF0000;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.faq-section {
  padding: 80px 0;
  background: #0f0f0f;
}

.faq-section h2 {
  text-align: center;
  margin: 0 0 50px 0;
  font-size: 2.5rem;
  color: white;
}

.faq-list {
  max-width: 800px;
  margin: 0 auto;
}

.faq-item {
  background: #2a2a2a;
  border-radius: 12px;
  margin-bottom: 15px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.faq-item.active {
  box-shadow: 0 5px 15px rgba(255, 0, 0, 0.2);
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 30px;
  cursor: pointer;
}

.faq-question h4 {
  margin: 0;
  color: white;
  font-size: 1.1rem;
}

.faq-question i {
  color: #FF0000;
  transition: transform 0.3s ease;
}

.faq-item.active .faq-question i {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 30px;
  max-height: 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.faq-item.active .faq-answer {
  max-height: 200px;
  padding: 0 30px 25px 30px;
}

.faq-answer p {
  margin: 0 0 15px 0;
  color: #ccc;
  line-height: 1.6;
}

.faq-links {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.faq-link {
  color: #FF0000;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: bold;
}

.faq-link:hover {
  text-decoration: underline;
}

.contact-support {
  padding: 80px 0;
}

.support-card {
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border-radius: 20px;
  padding: 60px;
  display: flex;
  align-items: center;
  gap: 60px;
}

.support-content {
  flex: 1;
}

.support-content h2 {
  margin: 0 0 15px 0;
  font-size: 2.2rem;
  color: white;
}

.support-content p {
  margin: 0 0 40px 0;
  color: #ccc;
  font-size: 1.1rem;
  line-height: 1.6;
}

.support-options {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.support-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 25px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
}

.support-btn.primary {
  background: #FF0000;
  color: white;
}

.support-btn.primary:hover {
  background: #cc0000;
  transform: translateY(-2px);
}

.support-btn.secondary {
  background: #333;
  color: white;
  border: 1px solid #555;
}

.support-btn.secondary:hover {
  border-color: #FF0000;
  transform: translateY(-2px);
}

.support-btn i {
  font-size: 1.5rem;
}

.support-status,
.support-response {
  font-size: 0.8rem;
  opacity: 0.8;
}

.support-status.online {
  color: #28a745;
}

.support-illustration {
  font-size: 8rem;
  color: #FF0000;
  opacity: 0.3;
}

.article-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.article-content {
  background: #2a2a2a;
  border-radius: 16px;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  width: 100%;
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px 40px;
  border-bottom: 1px solid #333;
}

.article-header h1 {
  margin: 0;
  color: white;
  font-size: 1.8rem;
}

.close-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;
}

.close-btn:hover {
  color: white;
}

.article-body {
  padding: 40px;
}

.article-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  font-size: 0.9rem;
  color: #999;
}

.article-category {
  background: #FF0000;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
}

.article-text {
  color: #ccc;
  line-height: 1.8;
  margin-bottom: 40px;
}

.article-text h2 {
  color: white;
  margin: 30px 0 15px 0;
}

.article-text p {
  margin-bottom: 20px;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 30px;
  border-top: 1px solid #333;
}

.article-helpful {
  display: flex;
  align-items: center;
  gap: 15px;
}

.article-helpful span {
  color: #ccc;
}

.helpful-btn {
  background: none;
  border: 1px solid #555;
  color: #ccc;
  padding: 8px 15px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s ease;
}

.helpful-btn:hover {
  border-color: #FF0000;
  color: #FF0000;
}

.share-btn {
  background: #FF0000;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .help-hero {
    padding: 60px 0;
  }
  
  .help-hero h1 {
    font-size: 2.2rem;
  }
  
  .actions-grid,
  .categories-grid,
  .tutorials-grid {
    grid-template-columns: 1fr;
  }
  
  .support-card {
    flex-direction: column;
    text-align: center;
    padding: 40px 30px;
  }
  
  .support-options {
    justify-content: center;
  }
  
  .article-content {
    margin: 10px;
    max-height: calc(100vh - 20px);
  }
  
  .article-header,
  .article-body {
    padding: 20px;
  }
  
  .article-footer {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
}
</style>
