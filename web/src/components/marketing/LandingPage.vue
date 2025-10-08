<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-background">
        <div class="hero-overlay"></div>
        <video autoplay muted loop class="hero-video">
          <source src="/videos/hero-background.mp4" type="video/mp4">
        </video>
      </div>
      
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              Share Your Story.<br>
              <span class="highlight">Inspire the World.</span>
            </h1>
            <p class="hero-subtitle">
              Join thousands of creators, experts, and thought leaders sharing their insights 
              through powerful interviews on the world's premier interview platform.
            </p>
            
            <div class="hero-stats">
              <div class="stat">
                <span class="stat-number">{{ formatNumber(platformStats.totalUsers) }}+</span>
                <span class="stat-label">Active Users</span>
              </div>
              <div class="stat">
                <span class="stat-number">{{ formatNumber(platformStats.totalInterviews) }}+</span>
                <span class="stat-label">Interviews</span>
              </div>
              <div class="stat">
                <span class="stat-number">{{ formatNumber(platformStats.totalViews) }}+</span>
                <span class="stat-label">Total Views</span>
              </div>
            </div>
            
            <div class="hero-actions">
              <button @click="startCreating" class="cta-button primary">
                <i class="fas fa-microphone"></i>
                Start Creating
              </button>
              <button @click="exploreContent" class="cta-button secondary">
                <i class="fas fa-play"></i>
                Watch Interviews
              </button>
            </div>
          </div>
          
          <div class="hero-visual">
            <div class="featured-interview">
              <div class="interview-preview">
                <img :src="featuredInterview.thumbnail" :alt="featuredInterview.title" />
                <div class="play-button" @click="playFeatured">
                  <i class="fas fa-play"></i>
                </div>
              </div>
              <div class="interview-info">
                <h3>{{ featuredInterview.title }}</h3>
                <div class="creator-info">
                  <img :src="featuredInterview.creator.avatar" :alt="featuredInterview.creator.name" />
                  <span>{{ featuredInterview.creator.name }}</span>
                </div>
                <div class="interview-stats">
                  <span><i class="fas fa-eye"></i> {{ formatNumber(featuredInterview.stats.views) }}</span>
                  <span><i class="fas fa-heart"></i> {{ formatNumber(featuredInterview.stats.likes) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="container">
        <div class="section-header">
          <h2>Everything You Need to Share Your Expertise</h2>
          <p>Professional tools and features designed for creators, experts, and businesses</p>
        </div>
        
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.id" class="feature-card">
            <div class="feature-icon">
              <i :class="feature.icon"></i>
            </div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
            <ul class="feature-benefits">
              <li v-for="benefit in feature.benefits" :key="benefit">
                <i class="fas fa-check"></i>
                {{ benefit }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories Section -->
    <section class="categories-section">
      <div class="container">
        <div class="section-header">
          <h2>Explore Diverse Topics</h2>
          <p>Discover insights from experts across every industry and field</p>
        </div>
        
        <div class="categories-grid">
          <div 
            v-for="category in featuredCategories" 
            :key="category.name"
            class="category-card"
            @click="exploreCategory(category)"
          >
            <div class="category-image">
              <img :src="category.image" :alt="category.name" />
              <div class="category-overlay">
                <i :class="category.icon"></i>
              </div>
            </div>
            <div class="category-content">
              <h3>{{ category.name }}</h3>
              <p>{{ category.description }}</p>
              <div class="category-stats">
                <span>{{ category.interviewCount }} interviews</span>
                <i class="fas fa-arrow-right"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials-section">
      <div class="container">
        <div class="section-header">
          <h2>Trusted by Industry Leaders</h2>
          <p>See what creators and experts are saying about Interviews.tv</p>
        </div>
        
        <div class="testimonials-carousel">
          <div class="testimonial-track" :style="{ transform: `translateX(-${currentTestimonial * 100}%)` }">
            <div v-for="testimonial in testimonials" :key="testimonial.id" class="testimonial-slide">
              <div class="testimonial-content">
                <div class="testimonial-text">
                  <i class="fas fa-quote-left"></i>
                  <p>{{ testimonial.content }}</p>
                </div>
                <div class="testimonial-author">
                  <img :src="testimonial.avatar" :alt="testimonial.author" />
                  <div class="author-info">
                    <h4>{{ testimonial.author }}</h4>
                    <span>{{ testimonial.role }}</span>
                    <div class="rating">
                      <i v-for="star in testimonial.rating" :key="star" class="fas fa-star"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="testimonial-controls">
            <button 
              v-for="(testimonial, index) in testimonials" 
              :key="index"
              @click="currentTestimonial = index"
              class="testimonial-dot"
              :class="{ active: currentTestimonial === index }"
            ></button>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2>Ready to Share Your Story?</h2>
          <p>Join thousands of creators who are already building their audience and sharing their expertise on Interviews.tv</p>
          
          <div class="cta-options">
            <div class="cta-option">
              <div class="option-icon">
                <i class="fas fa-user"></i>
              </div>
              <h3>For Creators</h3>
              <p>Share your expertise and build your personal brand</p>
              <button @click="signUpCreator" class="option-button">
                Get Started Free
              </button>
            </div>
            
            <div class="cta-option featured">
              <div class="option-badge">Most Popular</div>
              <div class="option-icon">
                <i class="fas fa-building"></i>
              </div>
              <h3>For Businesses</h3>
              <p>Showcase your company and connect with professionals</p>
              <button @click="signUpBusiness" class="option-button">
                Start Your Profile
              </button>
            </div>
            
            <div class="cta-option">
              <div class="option-icon">
                <i class="fas fa-eye"></i>
              </div>
              <h3>For Viewers</h3>
              <p>Discover insights from industry experts</p>
              <button @click="signUpViewer" class="option-button">
                Explore Content
              </button>
            </div>
          </div>
          
          <div class="trust-indicators">
            <div class="trust-item">
              <i class="fas fa-shield-alt"></i>
              <span>Secure & Private</span>
            </div>
            <div class="trust-item">
              <i class="fas fa-clock"></i>
              <span>Setup in Minutes</span>
            </div>
            <div class="trust-item">
              <i class="fas fa-users"></i>
              <span>Join 12K+ Creators</span>
            </div>
            <div class="trust-item">
              <i class="fas fa-star"></i>
              <span>4.8/5 Rating</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-brand">
            <h3>Interviews.tv</h3>
            <p>The premier platform for sharing expertise through interviews</p>
            <div class="social-links">
              <a href="#" class="social-link"><i class="fab fa-twitter"></i></a>
              <a href="#" class="social-link"><i class="fab fa-linkedin"></i></a>
              <a href="#" class="social-link"><i class="fab fa-youtube"></i></a>
              <a href="#" class="social-link"><i class="fab fa-instagram"></i></a>
            </div>
          </div>
          
          <div class="footer-links">
            <div class="link-group">
              <h4>Platform</h4>
              <a href="/features">Features</a>
              <a href="/pricing">Pricing</a>
              <a href="/help">Help Center</a>
              <a href="/api">API Docs</a>
            </div>
            
            <div class="link-group">
              <h4>Community</h4>
              <a href="/creators">For Creators</a>
              <a href="/businesses">For Businesses</a>
              <a href="/events">Events</a>
              <a href="/blog">Blog</a>
            </div>
            
            <div class="link-group">
              <h4>Company</h4>
              <a href="/about">About Us</a>
              <a href="/careers">Careers</a>
              <a href="/press">Press</a>
              <a href="/contact">Contact</a>
            </div>
            
            <div class="link-group">
              <h4>Legal</h4>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/cookies">Cookie Policy</a>
              <a href="/guidelines">Community Guidelines</a>
            </div>
          </div>
        </div>
        
        <div class="footer-bottom">
          <p>&copy; 2025 Interviews.tv. All rights reserved.</p>
          <div class="footer-badges">
            <img src="/images/badges/security-badge.png" alt="Security Certified" />
            <img src="/images/badges/privacy-badge.png" alt="Privacy Compliant" />
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  sampleInterviews, 
  testimonials, 
  platformStats, 
  featuredCategories 
} from '@/data/sampleContent'

export default {
  name: 'LandingPage',
  setup() {
    const router = useRouter()
    
    // Reactive state
    const currentTestimonial = ref(0)
    
    // Featured interview (first from sample)
    const featuredInterview = sampleInterviews[0]
    
    // Platform features
    const features = [
      {
        id: 1,
        title: 'Professional Recording',
        description: 'High-quality video and audio recording tools',
        icon: 'fas fa-video',
        benefits: [
          'HD video recording',
          'Crystal clear audio',
          'Multiple format support',
          'Live streaming capability'
        ]
      },
      {
        id: 2,
        title: 'Smart Analytics',
        description: 'Detailed insights into your content performance',
        icon: 'fas fa-chart-line',
        benefits: [
          'Audience demographics',
          'Engagement metrics',
          'Growth tracking',
          'Revenue analytics'
        ]
      },
      {
        id: 3,
        title: 'Global Reach',
        description: 'Share your content with audiences worldwide',
        icon: 'fas fa-globe',
        benefits: [
          'Multi-language support',
          'Global distribution',
          'SEO optimization',
          'Social media integration'
        ]
      },
      {
        id: 4,
        title: 'Monetization',
        description: 'Turn your expertise into revenue',
        icon: 'fas fa-dollar-sign',
        benefits: [
          'Subscription plans',
          'Pay-per-view content',
          'Tip system',
          'Sponsorship opportunities'
        ]
      }
    ]
    
    // Auto-rotate testimonials
    let testimonialInterval = null
    
    const startTestimonialRotation = () => {
      testimonialInterval = setInterval(() => {
        currentTestimonial.value = (currentTestimonial.value + 1) % testimonials.length
      }, 5000)
    }
    
    const stopTestimonialRotation = () => {
      if (testimonialInterval) {
        clearInterval(testimonialInterval)
        testimonialInterval = null
      }
    }
    
    // Methods
    const formatNumber = (num) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
      }
      return num.toString()
    }
    
    const startCreating = () => {
      router.push('/register?role=creator')
    }
    
    const exploreContent = () => {
      router.push('/explore')
    }
    
    const playFeatured = () => {
      router.push(`/interview/${featuredInterview.id}`)
    }
    
    const exploreCategory = (category) => {
      router.push(`/explore?category=${encodeURIComponent(category.name)}`)
    }
    
    const signUpCreator = () => {
      router.push('/register?role=creator')
    }
    
    const signUpBusiness = () => {
      router.push('/register?role=business')
    }
    
    const signUpViewer = () => {
      router.push('/register?role=viewer')
    }
    
    // Lifecycle
    onMounted(() => {
      startTestimonialRotation()
    })
    
    onUnmounted(() => {
      stopTestimonialRotation()
    })
    
    return {
      // State
      currentTestimonial,
      
      // Data
      featuredInterview,
      features,
      testimonials,
      platformStats,
      featuredCategories,
      
      // Methods
      formatNumber,
      startCreating,
      exploreContent,
      playFeatured,
      exploreCategory,
      signUpCreator,
      signUpBusiness,
      signUpViewer
    }
  }
}
</script>

<style scoped>
.landing-page {
  background: #000;
  color: white;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(26, 26, 26, 0.6) 100%);
  z-index: 2;
}

.hero-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-content {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.hero-title {
  font-size: 4rem;
  font-weight: 900;
  line-height: 1.1;
  margin: 0 0 30px 0;
}

.highlight {
  color: #FF0000;
  background: linear-gradient(135deg, #FF0000, #FF4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.3rem;
  line-height: 1.6;
  color: #ccc;
  margin: 0 0 40px 0;
}

.hero-stats {
  display: flex;
  gap: 40px;
  margin: 0 0 50px 0;
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2.5rem;
  font-weight: 900;
  color: #FF0000;
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hero-actions {
  display: flex;
  gap: 20px;
}

.cta-button {
  padding: 18px 35px;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  text-decoration: none;
}

.cta-button.primary {
  background: linear-gradient(135deg, #FF0000, #FF4444);
  color: white;
}

.cta-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(255, 0, 0, 0.3);
}

.cta-button.secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.cta-button.secondary:hover {
  background: white;
  color: #000;
  transform: translateY(-2px);
}

.hero-visual {
  display: flex;
  justify-content: center;
}

.featured-interview {
  background: #2a2a2a;
  border-radius: 20px;
  overflow: hidden;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease;
}

.featured-interview:hover {
  transform: translateY(-10px);
}

.interview-preview {
  position: relative;
  aspect-ratio: 16/9;
}

.interview-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: rgba(255, 0, 0, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.play-button:hover {
  background: #FF0000;
  transform: translate(-50%, -50%) scale(1.1);
}

.interview-info {
  padding: 25px;
}

.interview-info h3 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  line-height: 1.4;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 15px 0;
}

.creator-info img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.creator-info span {
  color: #ccc;
  font-weight: 500;
}

.interview-stats {
  display: flex;
  gap: 20px;
  font-size: 0.9rem;
  color: #999;
}

.interview-stats i {
  color: #FF0000;
  margin-right: 5px;
}

/* Features Section */
.features-section {
  padding: 120px 0;
  background: #1a1a1a;
}

.section-header {
  text-align: center;
  margin-bottom: 80px;
}

.section-header h2 {
  font-size: 3rem;
  margin: 0 0 20px 0;
  color: white;
}

.section-header p {
  font-size: 1.2rem;
  color: #ccc;
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
}

.feature-card {
  background: #2a2a2a;
  border-radius: 20px;
  padding: 40px 30px;
  text-align: center;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.feature-card:hover {
  transform: translateY(-10px);
  border-color: #FF0000;
  box-shadow: 0 20px 40px rgba(255, 0, 0, 0.1);
}

.feature-icon {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #FF0000, #FF4444);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 30px auto;
  font-size: 2.5rem;
  color: white;
}

.feature-card h3 {
  margin: 0 0 15px 0;
  font-size: 1.5rem;
  color: white;
}

.feature-card p {
  margin: 0 0 25px 0;
  color: #ccc;
  line-height: 1.6;
}

.feature-benefits {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.feature-benefits li {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  color: #ccc;
}

.feature-benefits i {
  color: #FF0000;
  font-size: 0.9rem;
}

/* Categories Section */
.categories-section {
  padding: 120px 0;
  background: #0f0f0f;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.category-card {
  background: #2a2a2a;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
}

.category-image {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.category-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.category-card:hover .category-image img {
  transform: scale(1.05);
}

.category-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: rgba(255, 0, 0, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.category-content {
  padding: 25px;
}

.category-content h3 {
  margin: 0 0 10px 0;
  color: white;
  font-size: 1.3rem;
}

.category-content p {
  margin: 0 0 20px 0;
  color: #ccc;
  line-height: 1.5;
}

.category-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #FF0000;
  font-weight: bold;
}

/* Testimonials Section */
.testimonials-section {
  padding: 120px 0;
  background: #1a1a1a;
}

.testimonials-carousel {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 20px;
}

.testimonial-track {
  display: flex;
  transition: transform 0.5s ease;
}

.testimonial-slide {
  min-width: 100%;
  padding: 60px 40px;
  background: #2a2a2a;
}

.testimonial-text {
  text-align: center;
  margin-bottom: 40px;
}

.testimonial-text i {
  font-size: 3rem;
  color: #FF0000;
  margin-bottom: 20px;
}

.testimonial-text p {
  font-size: 1.3rem;
  line-height: 1.6;
  color: #ccc;
  font-style: italic;
  margin: 0;
}

.testimonial-author {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.testimonial-author img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.author-info h4 {
  margin: 0 0 5px 0;
  color: white;
  font-size: 1.2rem;
}

.author-info span {
  color: #999;
  font-size: 0.9rem;
}

.rating {
  margin-top: 10px;
}

.rating i {
  color: #FFD700;
  margin-right: 2px;
}

.testimonial-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 30px;
}

.testimonial-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: #666;
  cursor: pointer;
  transition: background 0.3s ease;
}

.testimonial-dot.active {
  background: #FF0000;
}

/* CTA Section */
.cta-section {
  padding: 120px 0;
  background: linear-gradient(135deg, #FF0000 0%, #FF4444 100%);
}

.cta-content {
  text-align: center;
}

.cta-content h2 {
  font-size: 3rem;
  margin: 0 0 20px 0;
  color: white;
}

.cta-content > p {
  font-size: 1.2rem;
  margin: 0 0 60px 0;
  color: rgba(255, 255, 255, 0.9);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.cta-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  margin-bottom: 60px;
}

.cta-option {
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
}

.cta-option:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.cta-option.featured {
  border: 3px solid #FFD700;
}

.option-badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #FFD700;
  color: #000;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
}

.option-icon {
  width: 80px;
  height: 80px;
  background: #FF0000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 25px auto;
  font-size: 2rem;
  color: white;
}

.cta-option h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.3rem;
}

.cta-option p {
  margin: 0 0 25px 0;
  color: #666;
  line-height: 1.5;
}

.option-button {
  background: #FF0000;
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 50px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.option-button:hover {
  background: #cc0000;
  transform: translateY(-2px);
}

.trust-indicators {
  display: flex;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.trust-item i {
  font-size: 1.2rem;
}

/* Footer */
.landing-footer {
  background: #000;
  padding: 60px 0 30px 0;
}

.footer-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 60px;
  margin-bottom: 40px;
}

.footer-brand h3 {
  margin: 0 0 15px 0;
  color: #FF0000;
  font-size: 1.8rem;
}

.footer-brand p {
  margin: 0 0 25px 0;
  color: #ccc;
  line-height: 1.6;
}

.social-links {
  display: flex;
  gap: 15px;
}

.social-link {
  width: 40px;
  height: 40px;
  background: #333;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-decoration: none;
  transition: all 0.3s ease;
}

.social-link:hover {
  background: #FF0000;
  transform: translateY(-2px);
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
}

.link-group h4 {
  margin: 0 0 20px 0;
  color: white;
  font-size: 1.1rem;
}

.link-group a {
  display: block;
  color: #ccc;
  text-decoration: none;
  margin-bottom: 10px;
  transition: color 0.3s ease;
}

.link-group a:hover {
  color: #FF0000;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 30px;
  border-top: 1px solid #333;
}

.footer-bottom p {
  margin: 0;
  color: #666;
}

.footer-badges {
  display: flex;
  gap: 15px;
}

.footer-badges img {
  height: 30px;
  opacity: 0.7;
}

@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }
  
  .hero-title {
    font-size: 3rem;
  }
  
  .footer-content {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .footer-links {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-stats {
    justify-content: center;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .cta-button {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }
  
  .section-header h2 {
    font-size: 2.2rem;
  }
  
  .features-grid,
  .categories-grid,
  .cta-options {
    grid-template-columns: 1fr;
  }
  
  .testimonial-slide {
    padding: 40px 20px;
  }
  
  .testimonial-author {
    flex-direction: column;
    text-align: center;
  }
  
  .trust-indicators {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  
  .footer-links {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .footer-bottom {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
}
</style>
