<template>
  <div v-if="showModal" class="welcome-modal-overlay" @click="closeModal">
    <div class="welcome-modal" @click.stop>
      <div class="modal-header">
        <h2>Welcome to Interviews.tv!</h2>
        <button @click="closeModal" class="close-button">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="welcome-content">
          <div class="welcome-icon">
            <i class="fas fa-star"></i>
          </div>
          
          <h3>You're all set!</h3>
          <p>Your account has been created successfully. Here are some quick tips to get you started:</p>
          
          <div class="quick-tips">
            <div class="tip-item">
              <div class="tip-icon">
                <i class="fas fa-user-edit"></i>
              </div>
              <div class="tip-content">
                <h4>Complete Your Profile</h4>
                <p>Add a photo and bio to help others connect with you</p>
              </div>
            </div>
            
            <div class="tip-item">
              <div class="tip-icon">
                <i class="fas fa-compass"></i>
              </div>
              <div class="tip-content">
                <h4>Explore Content</h4>
                <p>Discover interviews from experts in your field</p>
              </div>
            </div>
            
            <div v-if="userRole === 'creator'" class="tip-item">
              <div class="tip-icon">
                <i class="fas fa-microphone"></i>
              </div>
              <div class="tip-content">
                <h4>Create Your First Interview</h4>
                <p>Share your expertise with the community</p>
              </div>
            </div>
            
            <div v-if="userRole === 'business'" class="tip-item">
              <div class="tip-icon">
                <i class="fas fa-building"></i>
              </div>
              <div class="tip-content">
                <h4>Set Up Your Business</h4>
                <p>Create your company profile and connect with professionals</p>
              </div>
            </div>
          </div>
          
          <div class="action-buttons">
            <button @click="startOnboarding" class="btn-primary">
              <i class="fas fa-rocket"></i>
              Take the Tour
            </button>
            <button @click="skipToMain" class="btn-secondary">
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'WelcomeModal',
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'start-onboarding'],
  setup(props, { emit }) {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const showModal = computed(() => props.show)
    const userRole = computed(() => authStore.user?.role || 'viewer')
    
    const closeModal = () => {
      emit('close')
    }
    
    const startOnboarding = () => {
      emit('start-onboarding')
      closeModal()
    }
    
    const skipToMain = () => {
      // Mark onboarding as skipped
      localStorage.setItem('onboarding_skipped', 'true')
      
      // Redirect based on user role
      if (userRole.value === 'creator') {
        router.push('/dashboard')
      } else if (userRole.value === 'business') {
        router.push('/business/dashboard')
      } else {
        router.push('/explore')
      }
      
      closeModal()
    }
    
    return {
      showModal,
      userRole,
      closeModal,
      startOnboarding,
      skipToMain
    }
  }
}
</script>

<style scoped>
.welcome-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.welcome-modal {
  background: #2a2a2a;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 30px;
  border-bottom: 1px solid #333;
}

.modal-header h2 {
  margin: 0;
  color: #FF0000;
  font-size: 1.5rem;
}

.close-button {
  background: none;
  border: none;
  color: #ccc;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.close-button:hover {
  color: white;
  background: #333;
}

.modal-body {
  padding: 30px;
}

.welcome-content {
  text-align: center;
}

.welcome-icon {
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

.welcome-content h3 {
  margin: 0 0 15px 0;
  color: white;
  font-size: 1.8rem;
}

.welcome-content > p {
  margin: 0 0 30px 0;
  color: #ccc;
  line-height: 1.6;
}

.quick-tips {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
  text-align: left;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  background: #333;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.tip-item:hover {
  background: #3a3a3a;
  transform: translateY(-2px);
}

.tip-icon {
  width: 50px;
  height: 50px;
  background: #FF0000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.tip-content h4 {
  margin: 0 0 8px 0;
  color: white;
  font-size: 1.1rem;
}

.tip-content p {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.4;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn-primary,
.btn-secondary {
  padding: 15px 25px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.btn-primary {
  background: #FF0000;
  color: white;
}

.btn-primary:hover {
  background: #cc0000;
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  color: #ccc;
  border: 1px solid #666;
}

.btn-secondary:hover {
  border-color: #FF0000;
  color: #FF0000;
}

@media (max-width: 768px) {
  .welcome-modal {
    margin: 10px;
    max-height: calc(100vh - 20px);
  }
  
  .modal-header,
  .modal-body {
    padding: 20px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
