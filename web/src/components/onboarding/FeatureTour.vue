<template>
  <div v-if="isActive" class="feature-tour">
    <!-- Tour Overlay -->
    <div class="tour-overlay" @click="skipTour"></div>
    
    <!-- Tour Spotlight -->
    <div 
      class="tour-spotlight" 
      :style="spotlightStyle"
    ></div>
    
    <!-- Tour Tooltip -->
    <div 
      class="tour-tooltip" 
      :style="tooltipStyle"
      :class="tooltipPosition"
    >
      <div class="tooltip-content">
        <div class="tooltip-header">
          <h3>{{ currentStep.title }}</h3>
          <div class="step-counter">
            {{ currentStepIndex + 1 }} of {{ tourSteps.length }}
          </div>
        </div>
        
        <div class="tooltip-body">
          <p>{{ currentStep.description }}</p>
          
          <div v-if="currentStep.features" class="feature-highlights">
            <ul>
              <li v-for="feature in currentStep.features" :key="feature">
                <i class="fas fa-check"></i>
                {{ feature }}
              </li>
            </ul>
          </div>
        </div>
        
        <div class="tooltip-footer">
          <div class="tour-progress">
            <div 
              class="progress-bar"
              :style="{ width: `${progressPercentage}%` }"
            ></div>
          </div>
          
          <div class="tour-controls">
            <button 
              v-if="currentStepIndex > 0" 
              @click="previousStep" 
              class="tour-btn secondary"
            >
              <i class="fas fa-arrow-left"></i>
              Back
            </button>
            
            <button @click="skipTour" class="tour-btn skip">
              Skip Tour
            </button>
            
            <button 
              @click="nextStep" 
              class="tour-btn primary"
            >
              {{ isLastStep ? 'Finish' : 'Next' }}
              <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Tooltip Arrow -->
      <div class="tooltip-arrow"></div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'FeatureTour',
  props: {
    active: {
      type: Boolean,
      default: false
    },
    userRole: {
      type: String,
      default: 'viewer'
    }
  },
  emits: ['complete', 'skip'],
  setup(props, { emit }) {
    const router = useRouter()
    const authStore = useAuthStore()
    
    // Reactive state
    const currentStepIndex = ref(0)
    const spotlightStyle = ref({})
    const tooltipStyle = ref({})
    const tooltipPosition = ref('bottom')
    
    // Tour steps based on user role
    const tourSteps = computed(() => {
      const baseSteps = [
        {
          target: '.navbar-brand',
          title: 'Welcome to Interviews.tv',
          description: 'This is your home for discovering and sharing professional interviews. Let\'s take a quick tour of the key features.',
          position: 'bottom'
        },
        {
          target: '.navbar-nav .nav-link[href="/explore"]',
          title: 'Explore Content',
          description: 'Discover interviews from experts across different industries and topics.',
          features: [
            'Browse by category',
            'Search for specific topics',
            'Filter by content type'
          ],
          position: 'bottom'
        },
        {
          target: '.user-dropdown',
          title: 'Your Profile',
          description: 'Access your profile, settings, and account management from here.',
          features: [
            'Edit your profile',
            'Manage settings',
            'View your content'
          ],
          position: 'bottom-left'
        }
      ]
      
      if (props.userRole === 'creator') {
        baseSteps.splice(2, 0, {
          target: '.navbar-nav .nav-link[href="/create"]',
          title: 'Create Content',
          description: 'Share your expertise by creating video, audio, or text-based interviews.',
          features: [
            'Upload video interviews',
            'Record audio content',
            'Write text-based interviews',
            'Schedule live sessions'
          ],
          position: 'bottom'
        })
        
        baseSteps.push({
          target: '.navbar-nav .nav-link[href="/dashboard"]',
          title: 'Creator Dashboard',
          description: 'Track your content performance and manage your creator profile.',
          features: [
            'View analytics',
            'Manage content',
            'Track earnings',
            'Engage with audience'
          ],
          position: 'bottom'
        })
      }
      
      if (props.userRole === 'business') {
        baseSteps.splice(2, 0, {
          target: '.navbar-nav .nav-link[href="/business"]',
          title: 'Business Directory',
          description: 'Showcase your company and connect with other professionals.',
          features: [
            'Create business profile',
            'List your services',
            'Connect with experts',
            'Host events'
          ],
          position: 'bottom'
        })
      }
      
      baseSteps.push({
        target: '.main-content',
        title: 'You\'re Ready!',
        description: 'That\'s it! You now know the basics of navigating Interviews.tv. Start exploring and creating amazing content.',
        position: 'center'
      })
      
      return baseSteps
    })
    
    // Computed properties
    const isActive = computed(() => props.active)
    const currentStep = computed(() => tourSteps.value[currentStepIndex.value])
    const isLastStep = computed(() => currentStepIndex.value === tourSteps.value.length - 1)
    const progressPercentage = computed(() => ((currentStepIndex.value + 1) / tourSteps.value.length) * 100)
    
    // Methods
    const updateSpotlight = async () => {
      await nextTick()
      
      const target = document.querySelector(currentStep.value.target)
      if (!target) {
        // If target not found, center the spotlight
        spotlightStyle.value = {
          top: '50%',
          left: '50%',
          width: '200px',
          height: '200px',
          transform: 'translate(-50%, -50%)'
        }
        
        tooltipStyle.value = {
          top: '60%',
          left: '50%',
          transform: 'translateX(-50%)'
        }
        
        tooltipPosition.value = 'center'
        return
      }
      
      const rect = target.getBoundingClientRect()
      const padding = 8
      
      // Update spotlight position
      spotlightStyle.value = {
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${rect.height + padding * 2}px`
      }
      
      // Calculate tooltip position
      const tooltipWidth = 350
      const tooltipHeight = 200
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let tooltipTop = rect.bottom + 20
      let tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2)
      let position = currentStep.value.position || 'bottom'
      
      // Adjust if tooltip goes off screen
      if (tooltipLeft < 20) {
        tooltipLeft = 20
        position = 'bottom-left'
      } else if (tooltipLeft + tooltipWidth > viewportWidth - 20) {
        tooltipLeft = viewportWidth - tooltipWidth - 20
        position = 'bottom-right'
      }
      
      if (tooltipTop + tooltipHeight > viewportHeight - 20) {
        tooltipTop = rect.top - tooltipHeight - 20
        position = position.replace('bottom', 'top')
      }
      
      tooltipStyle.value = {
        top: `${tooltipTop}px`,
        left: `${tooltipLeft}px`
      }
      
      tooltipPosition.value = position
      
      // Scroll target into view if needed
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      })
    }
    
    const nextStep = () => {
      if (isLastStep.value) {
        completeTour()
      } else {
        currentStepIndex.value++
        updateSpotlight()
      }
    }
    
    const previousStep = () => {
      if (currentStepIndex.value > 0) {
        currentStepIndex.value--
        updateSpotlight()
      }
    }
    
    const skipTour = () => {
      emit('skip')
    }
    
    const completeTour = () => {
      // Mark tour as completed
      localStorage.setItem('feature_tour_completed', 'true')
      emit('complete')
    }
    
    const handleResize = () => {
      updateSpotlight()
    }
    
    const handleKeydown = (event) => {
      if (!isActive.value) return
      
      switch (event.key) {
        case 'Escape':
          skipTour()
          break
        case 'ArrowRight':
        case ' ':
          event.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
          event.preventDefault()
          previousStep()
          break
      }
    }
    
    // Lifecycle
    onMounted(() => {
      if (isActive.value) {
        updateSpotlight()
        window.addEventListener('resize', handleResize)
        window.addEventListener('keydown', handleKeydown)
      }
    })
    
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeydown)
    })
    
    // Watch for active changes
    const startTour = () => {
      if (isActive.value) {
        currentStepIndex.value = 0
        updateSpotlight()
      }
    }
    
    return {
      // State
      currentStepIndex,
      spotlightStyle,
      tooltipStyle,
      tooltipPosition,
      
      // Computed
      isActive,
      currentStep,
      isLastStep,
      progressPercentage,
      tourSteps,
      
      // Methods
      nextStep,
      previousStep,
      skipTour,
      completeTour,
      startTour
    }
  }
}
</script>

<style scoped>
.feature-tour {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

.tour-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  pointer-events: all;
}

.tour-spotlight {
  position: absolute;
  background: transparent;
  border: 3px solid #FF0000;
  border-radius: 8px;
  box-shadow: 
    0 0 0 9999px rgba(0, 0, 0, 0.7),
    0 0 20px rgba(255, 0, 0, 0.5),
    inset 0 0 20px rgba(255, 0, 0, 0.2);
  transition: all 0.3s ease;
  pointer-events: none;
}

.tour-tooltip {
  position: absolute;
  background: #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  width: 350px;
  pointer-events: all;
  z-index: 10000;
}

.tooltip-content {
  padding: 25px;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.tooltip-header h3 {
  margin: 0;
  color: #FF0000;
  font-size: 1.3rem;
}

.step-counter {
  background: #FF0000;
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.tooltip-body {
  margin-bottom: 20px;
}

.tooltip-body p {
  margin: 0 0 15px 0;
  color: #ccc;
  line-height: 1.5;
}

.feature-highlights ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-highlights li {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #ccc;
  font-size: 0.9rem;
}

.feature-highlights i {
  color: #FF0000;
  font-size: 0.8rem;
}

.tooltip-footer {
  border-top: 1px solid #333;
  padding-top: 20px;
}

.tour-progress {
  height: 4px;
  background: #333;
  border-radius: 2px;
  margin-bottom: 20px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #FF0000, #FF4444);
  transition: width 0.3s ease;
}

.tour-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.tour-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.tour-btn.primary {
  background: #FF0000;
  color: white;
}

.tour-btn.primary:hover {
  background: #cc0000;
}

.tour-btn.secondary {
  background: #333;
  color: #ccc;
}

.tour-btn.secondary:hover {
  background: #444;
  color: white;
}

.tour-btn.skip {
  background: transparent;
  color: #999;
  border: 1px solid #555;
}

.tour-btn.skip:hover {
  border-color: #FF0000;
  color: #FF0000;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 10px solid transparent;
}

/* Arrow positions */
.tour-tooltip.bottom .tooltip-arrow {
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: #2a2a2a;
}

.tour-tooltip.bottom-left .tooltip-arrow {
  top: -20px;
  left: 30px;
  border-bottom-color: #2a2a2a;
}

.tour-tooltip.bottom-right .tooltip-arrow {
  top: -20px;
  right: 30px;
  border-bottom-color: #2a2a2a;
}

.tour-tooltip.top .tooltip-arrow {
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: #2a2a2a;
}

.tour-tooltip.top-left .tooltip-arrow {
  bottom: -20px;
  left: 30px;
  border-top-color: #2a2a2a;
}

.tour-tooltip.top-right .tooltip-arrow {
  bottom: -20px;
  right: 30px;
  border-top-color: #2a2a2a;
}

.tour-tooltip.center .tooltip-arrow {
  display: none;
}

@media (max-width: 768px) {
  .tour-tooltip {
    width: calc(100vw - 40px);
    max-width: 350px;
  }
  
  .tooltip-content {
    padding: 20px;
  }
  
  .tour-controls {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .tour-btn {
    flex: 1;
    min-width: 80px;
    justify-content: center;
  }
}
</style>
