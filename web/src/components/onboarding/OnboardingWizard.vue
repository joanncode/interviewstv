<template>
  <div class="onboarding-wizard">
    <!-- Progress Header -->
    <div class="onboarding-header">
      <div class="container">
        <div class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${progressPercentage}%` }"
            ></div>
          </div>
          <div class="progress-text">
            Step {{ currentStep + 1 }} of {{ steps.length }}
          </div>
        </div>
        
        <button 
          v-if="canSkip" 
          @click="skipOnboarding" 
          class="skip-button"
        >
          Skip for now
        </button>
      </div>
    </div>

    <!-- Onboarding Content -->
    <div class="onboarding-content">
      <div class="container">
        <div class="onboarding-card">
          <div class="step-content">
            <!-- Step Icon -->
            <div class="step-icon">
              <i :class="currentStepData.icon || 'fas fa-star'"></i>
            </div>

            <!-- Step Title and Description -->
            <h1 class="step-title">{{ currentStepData.title }}</h1>
            <p class="step-description">{{ currentStepData.description }}</p>

            <!-- Step-specific Content -->
            <div class="step-body">
              <!-- Welcome Step -->
              <div v-if="currentStepData.type === 'welcome'" class="welcome-step">
                <div class="role-selection">
                  <h3>What brings you to Interviews.tv?</h3>
                  <div class="role-options">
                    <div 
                      v-for="role in roleOptions" 
                      :key="role.value"
                      class="role-option"
                      :class="{ active: selectedRole === role.value }"
                      @click="selectedRole = role.value"
                    >
                      <div class="role-icon">
                        <i :class="role.icon"></i>
                      </div>
                      <h4>{{ role.title }}</h4>
                      <p>{{ role.description }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Profile Setup Step -->
              <div v-if="currentStepData.type === 'profile'" class="profile-step">
                <form @submit.prevent="saveProfile" class="profile-form">
                  <div class="form-group">
                    <label>Profile Picture</label>
                    <div class="avatar-upload">
                      <div class="avatar-preview">
                        <img 
                          :src="profileData.avatar || '/images/default-avatar.png'" 
                          alt="Profile"
                        />
                      </div>
                      <input 
                        type="file" 
                        @change="handleAvatarUpload" 
                        accept="image/*"
                        class="avatar-input"
                      />
                      <button type="button" class="upload-button">
                        <i class="fas fa-camera"></i>
                        Change Photo
                      </button>
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>First Name *</label>
                      <input 
                        type="text" 
                        v-model="profileData.firstName" 
                        required
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div class="form-group">
                      <label>Last Name *</label>
                      <input 
                        type="text" 
                        v-model="profileData.lastName" 
                        required
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Bio</label>
                    <textarea 
                      v-model="profileData.bio" 
                      placeholder="Tell us about yourself..."
                      rows="4"
                    ></textarea>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>Location</label>
                      <input 
                        type="text" 
                        v-model="profileData.location" 
                        placeholder="City, State/Country"
                      />
                    </div>
                    <div class="form-group">
                      <label>Company</label>
                      <input 
                        type="text" 
                        v-model="profileData.company" 
                        placeholder="Your company or organization"
                      />
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Website</label>
                    <input 
                      type="url" 
                      v-model="profileData.website" 
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </form>
              </div>

              <!-- Interests Step -->
              <div v-if="currentStepData.type === 'interests'" class="interests-step">
                <h3>What topics interest you?</h3>
                <p>Select categories to personalize your experience</p>
                
                <div class="interests-grid">
                  <div 
                    v-for="category in categories" 
                    :key="category.name"
                    class="interest-card"
                    :class="{ selected: selectedInterests.includes(category.name) }"
                    @click="toggleInterest(category.name)"
                  >
                    <div class="interest-icon">
                      <i :class="category.icon"></i>
                    </div>
                    <h4>{{ category.name }}</h4>
                    <p>{{ category.description }}</p>
                  </div>
                </div>
              </div>

              <!-- Follow Suggestions Step -->
              <div v-if="currentStepData.type === 'follow'" class="follow-step">
                <h3>Follow creators you're interested in</h3>
                <p>Get updates when they publish new content</p>

                <div class="creators-list">
                  <div
                    v-for="creator in suggestedCreators"
                    :key="creator.id"
                    class="creator-card"
                  >
                    <div class="creator-info">
                      <img :src="creator.avatar" :alt="creator.name" class="creator-avatar" />
                      <div class="creator-details">
                        <h4>{{ creator.name }}</h4>
                        <p>{{ creator.bio.substring(0, 100) }}...</p>
                        <div class="creator-stats">
                          <span>{{ creator.stats.followers }} followers</span>
                          <span>{{ creator.stats.interviews }} interviews</span>
                        </div>
                      </div>
                    </div>
                    <button
                      @click="toggleFollow(creator.id)"
                      class="follow-button"
                      :class="{ following: followedCreators.includes(creator.id) }"
                    >
                      {{ followedCreators.includes(creator.id) ? 'Following' : 'Follow' }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Completion Step -->
              <div v-if="currentStepData.type === 'complete'" class="complete-step">
                <div class="success-animation">
                  <i class="fas fa-check-circle"></i>
                </div>
                <h3>You're all set!</h3>
                <p>Welcome to Interviews.tv. Start exploring amazing content from industry experts.</p>
                
                <div class="next-actions">
                  <div class="action-card" @click="goToExplore">
                    <i class="fas fa-compass"></i>
                    <h4>Explore Interviews</h4>
                    <p>Discover content based on your interests</p>
                  </div>
                  <div class="action-card" @click="goToProfile">
                    <i class="fas fa-user"></i>
                    <h4>Complete Profile</h4>
                    <p>Add more details to your profile</p>
                  </div>
                  <div v-if="selectedRole === 'creator'" class="action-card" @click="createInterview">
                    <i class="fas fa-plus"></i>
                    <h4>Create Interview</h4>
                    <p>Share your first piece of content</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Navigation Buttons -->
            <div class="step-navigation">
              <button 
                v-if="currentStep > 0" 
                @click="previousStep" 
                class="nav-button secondary"
              >
                <i class="fas fa-arrow-left"></i>
                Back
              </button>
              
              <button 
                @click="nextStep" 
                class="nav-button primary"
                :disabled="!canProceed"
              >
                {{ isLastStep ? 'Get Started' : 'Continue' }}
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { sampleUsers, featuredCategories } from '@/data/sampleContent'

export default {
  name: 'OnboardingWizard',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()

    // Reactive state
    const currentStep = ref(0)
    const selectedRole = ref('')
    const selectedInterests = ref([])
    const followedCreators = ref([])
    const profileData = ref({
      firstName: '',
      lastName: '',
      bio: '',
      location: '',
      company: '',
      website: '',
      avatar: null
    })

    // Role options
    const roleOptions = [
      {
        value: 'viewer',
        title: 'I want to learn',
        description: 'Discover insights from industry experts',
        icon: 'fas fa-eye'
      },
      {
        value: 'creator',
        title: 'I want to share',
        description: 'Create and share my expertise',
        icon: 'fas fa-microphone'
      },
      {
        value: 'business',
        title: 'I represent a business',
        description: 'Showcase my company and connect',
        icon: 'fas fa-building'
      }
    ]

    // Categories for interests
    const categories = featuredCategories

    // Suggested creators
    const suggestedCreators = sampleUsers.filter(user => user.featured)

    // Onboarding steps configuration
    const steps = computed(() => {
      const baseSteps = [
        {
          type: 'welcome',
          title: 'Welcome to Interviews.tv',
          description: 'Let\'s get you set up in just a few steps',
          icon: 'fas fa-star'
        },
        {
          type: 'profile',
          title: 'Set up your profile',
          description: 'Tell us a bit about yourself',
          icon: 'fas fa-user'
        },
        {
          type: 'interests',
          title: 'Choose your interests',
          description: 'We\'ll personalize your experience',
          icon: 'fas fa-heart'
        }
      ]

      if (selectedRole.value !== 'business') {
        baseSteps.push({
          type: 'follow',
          title: 'Follow creators',
          description: 'Stay updated with your favorite experts',
          icon: 'fas fa-users'
        })
      }

      baseSteps.push({
        type: 'complete',
        title: 'You\'re ready!',
        description: 'Welcome to the community',
        icon: 'fas fa-check'
      })

      return baseSteps
    })

    // Computed properties
    const currentStepData = computed(() => steps.value[currentStep.value])
    const progressPercentage = computed(() => ((currentStep.value + 1) / steps.value.length) * 100)
    const isLastStep = computed(() => currentStep.value === steps.value.length - 1)
    const canSkip = computed(() => currentStep.value > 0 && currentStep.value < steps.value.length - 1)

    const canProceed = computed(() => {
      switch (currentStepData.value.type) {
        case 'welcome':
          return selectedRole.value !== ''
        case 'profile':
          return profileData.value.firstName && profileData.value.lastName
        case 'interests':
          return selectedInterests.value.length > 0
        case 'follow':
          return true // Optional step
        case 'complete':
          return true
        default:
          return true
      }
    })

    // Methods
    const nextStep = async () => {
      if (!canProceed.value) return

      if (isLastStep.value) {
        await completeOnboarding()
      } else {
        currentStep.value++
      }
    }

    const previousStep = () => {
      if (currentStep.value > 0) {
        currentStep.value--
      }
    }

    const skipOnboarding = () => {
      router.push('/explore')
    }

    const toggleInterest = (interest) => {
      const index = selectedInterests.value.indexOf(interest)
      if (index > -1) {
        selectedInterests.value.splice(index, 1)
      } else {
        selectedInterests.value.push(interest)
      }
    }

    const toggleFollow = (creatorId) => {
      const index = followedCreators.value.indexOf(creatorId)
      if (index > -1) {
        followedCreators.value.splice(index, 1)
      } else {
        followedCreators.value.push(creatorId)
      }
    }

    const handleAvatarUpload = (event) => {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          profileData.value.avatar = e.target.result
        }
        reader.readAsDataURL(file)
      }
    }

    const saveProfile = () => {
      // Profile data is automatically saved via v-model
      nextStep()
    }

    const completeOnboarding = async () => {
      try {
        // Save onboarding data to backend
        const onboardingData = {
          role: selectedRole.value,
          profile: profileData.value,
          interests: selectedInterests.value,
          followedCreators: followedCreators.value
        }

        const response = await fetch('/api/user/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify(onboardingData)
        })

        if (!response.ok) {
          throw new Error('Failed to save onboarding data')
        }

        // Update user role in auth store
        authStore.updateUserRole(selectedRole.value)

        // Mark onboarding as complete
        localStorage.setItem('onboarding_completed', 'true')

        notificationStore.addNotification({
          type: 'success',
          message: 'Welcome to Interviews.tv! Your account is now set up.'
        })

        // Redirect based on role
        if (selectedRole.value === 'creator') {
          router.push('/create')
        } else if (selectedRole.value === 'business') {
          router.push('/business/create')
        } else {
          router.push('/explore')
        }

      } catch (error) {
        console.error('Onboarding completion failed:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to complete onboarding. Please try again.'
        })
      }
    }

    const goToExplore = () => {
      router.push('/explore')
    }

    const goToProfile = () => {
      router.push('/profile')
    }

    const createInterview = () => {
      router.push('/create')
    }

    // Lifecycle
    onMounted(() => {
      // Pre-fill profile data if user is already logged in
      if (authStore.user) {
        profileData.value.firstName = authStore.user.name?.split(' ')[0] || ''
        profileData.value.lastName = authStore.user.name?.split(' ')[1] || ''
        profileData.value.bio = authStore.user.bio || ''
        profileData.value.location = authStore.user.location || ''
        profileData.value.company = authStore.user.company || ''
        profileData.value.website = authStore.user.website || ''
        profileData.value.avatar = authStore.user.avatar_url || null
      }
    })

    return {
      // State
      currentStep,
      selectedRole,
      selectedInterests,
      followedCreators,
      profileData,
      
      // Data
      roleOptions,
      categories,
      suggestedCreators,
      
      // Computed
      steps,
      currentStepData,
      progressPercentage,
      isLastStep,
      canSkip,
      canProceed,
      
      // Methods
      nextStep,
      previousStep,
      skipOnboarding,
      toggleInterest,
      toggleFollow,
      handleAvatarUpload,
      saveProfile,
      completeOnboarding,
      goToExplore,
      goToProfile,
      createInterview
    }
  }
}
</script>

<style scoped>
.onboarding-wizard {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  color: white;
}

.onboarding-header {
  background: #000;
  padding: 20px 0;
  border-bottom: 1px solid #333;
}

.progress-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 600px;
  margin: 0 auto;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 20px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF0000, #FF4444);
  transition: width 0.3s ease;
}

.progress-text {
  color: #ccc;
  font-size: 0.9rem;
  white-space: nowrap;
}

.skip-button {
  background: none;
  border: 1px solid #666;
  color: #ccc;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.skip-button:hover {
  border-color: #FF0000;
  color: #FF0000;
}

.onboarding-content {
  padding: 60px 20px;
  display: flex;
  align-items: center;
  min-height: calc(100vh - 80px);
}

.onboarding-card {
  max-width: 800px;
  margin: 0 auto;
  background: #2a2a2a;
  border-radius: 16px;
  padding: 60px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.step-icon {
  text-align: center;
  margin-bottom: 30px;
}

.step-icon i {
  font-size: 4rem;
  color: #FF0000;
}

.step-title {
  text-align: center;
  font-size: 2.5rem;
  margin: 0 0 15px 0;
  color: white;
}

.step-description {
  text-align: center;
  font-size: 1.2rem;
  color: #ccc;
  margin: 0 0 40px 0;
}

.step-body {
  margin-bottom: 40px;
}

/* Role Selection */
.role-selection h3 {
  text-align: center;
  margin-bottom: 30px;
  color: white;
}

.role-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.role-option {
  background: #333;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.role-option:hover {
  border-color: #FF0000;
  transform: translateY(-2px);
}

.role-option.active {
  border-color: #FF0000;
  background: rgba(255, 0, 0, 0.1);
}

.role-option .role-icon {
  font-size: 2rem;
  color: #FF0000;
  margin-bottom: 15px;
}

.role-option h4 {
  margin: 0 0 10px 0;
  color: white;
}

.role-option p {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

/* Profile Form */
.profile-form {
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 25px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #ccc;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  background: #333;
  border: 1px solid #555;
  border-radius: 6px;
  color: white;
  font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #FF0000;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #FF0000;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-input {
  display: none;
}

.upload-button {
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

/* Interests Grid */
.interests-step h3 {
  text-align: center;
  margin-bottom: 10px;
}

.interests-step p {
  text-align: center;
  color: #ccc;
  margin-bottom: 30px;
}

.interests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.interest-card {
  background: #333;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.interest-card:hover {
  border-color: #FF0000;
  transform: translateY(-2px);
}

.interest-card.selected {
  border-color: #FF0000;
  background: rgba(255, 0, 0, 0.1);
}

.interest-icon {
  font-size: 2rem;
  color: #FF0000;
  margin-bottom: 15px;
}

.interest-card h4 {
  margin: 0 0 10px 0;
  color: white;
}

.interest-card p {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

/* Follow Step */
.follow-step h3 {
  text-align: center;
  margin-bottom: 10px;
}

.follow-step p {
  text-align: center;
  color: #ccc;
  margin-bottom: 30px;
}

.creators-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.creator-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #333;
  border-radius: 12px;
  padding: 20px;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.creator-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.creator-details h4 {
  margin: 0 0 5px 0;
  color: white;
}

.creator-details p {
  margin: 0 0 10px 0;
  color: #ccc;
  font-size: 0.9rem;
}

.creator-stats {
  display: flex;
  gap: 15px;
  font-size: 0.8rem;
  color: #999;
}

.follow-button {
  background: #FF0000;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.follow-button.following {
  background: #333;
  color: #ccc;
}

/* Complete Step */
.complete-step {
  text-align: center;
}

.success-animation {
  font-size: 4rem;
  color: #28a745;
  margin-bottom: 30px;
}

.complete-step h3 {
  margin-bottom: 15px;
}

.complete-step p {
  color: #ccc;
  margin-bottom: 40px;
}

.next-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.action-card {
  background: #333;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  border-color: #FF0000;
  transform: translateY(-2px);
}

.action-card i {
  font-size: 2rem;
  color: #FF0000;
  margin-bottom: 15px;
}

.action-card h4 {
  margin: 0 0 10px 0;
  color: white;
}

.action-card p {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

/* Navigation */
.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
}

.nav-button {
  padding: 15px 30px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.nav-button.primary {
  background: #FF0000;
  color: white;
}

.nav-button.primary:hover {
  background: #cc0000;
}

.nav-button.secondary {
  background: transparent;
  color: #ccc;
  border: 1px solid #666;
}

.nav-button.secondary:hover {
  border-color: #FF0000;
  color: #FF0000;
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .onboarding-card {
    padding: 40px 30px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .role-options,
  .interests-grid,
  .next-actions {
    grid-template-columns: 1fr;
  }
  
  .step-navigation {
    flex-direction: column;
    gap: 15px;
  }
  
  .nav-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
