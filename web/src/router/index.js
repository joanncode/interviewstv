import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMetaStore } from '@/stores/meta'

// Lazy load components for better performance
const Home = () => import('@/views/Home.vue')
const About = () => import('@/views/About.vue')
const Contact = () => import('@/views/Contact.vue')
const Privacy = () => import('@/views/Privacy.vue')
const Terms = () => import('@/views/Terms.vue')
const Help = () => import('@/views/Help.vue')

// Authentication
const Login = () => import('@/views/auth/Login.vue')
const Register = () => import('@/views/auth/Register.vue')
const ForgotPassword = () => import('@/views/auth/ForgotPassword.vue')
const ResetPassword = () => import('@/views/auth/ResetPassword.vue')
const VerifyEmail = () => import('@/views/auth/VerifyEmail.vue')

// User Dashboard
const Dashboard = () => import('@/views/dashboard/Dashboard.vue')
const Profile = () => import('@/views/profile/Profile.vue')
const ProfileEdit = () => import('@/views/profile/ProfileEdit.vue')
const Settings = () => import('@/views/settings/Settings.vue')
const Notifications = () => import('@/views/notifications/Notifications.vue')
const Watchlist = () => import('@/views/watchlist/Watchlist.vue')
const History = () => import('@/views/history/History.vue')

// Interviews
const InterviewsList = () => import('@/views/interviews/InterviewsList.vue')
const InterviewDetail = () => import('@/views/interviews/InterviewDetail.vue')
const InterviewWatch = () => import('@/views/interviews/InterviewWatch.vue')
const InterviewCreate = () => import('@/views/interviews/InterviewCreate.vue')
const InterviewEdit = () => import('@/views/interviews/InterviewEdit.vue')
const InterviewUpload = () => import('@/views/interviews/InterviewUpload.vue')
const InterviewAnalysis = () => import('@/views/interviews/InterviewAnalysis.vue')

// Categories and Topics
const CategoriesList = () => import('@/views/categories/CategoriesList.vue')
const CategoryDetail = () => import('@/views/categories/CategoryDetail.vue')
const TopicsList = () => import('@/views/topics/TopicsList.vue')
const TopicDetail = () => import('@/views/topics/TopicDetail.vue')
const SkillsList = () => import('@/views/skills/SkillsList.vue')
const SkillDetail = () => import('@/views/skills/SkillDetail.vue')

// Search and Discovery
const Search = () => import('@/views/search/Search.vue')
const SearchResults = () => import('@/views/search/SearchResults.vue')
const AdvancedSearch = () => import('@/views/search/AdvancedSearch.vue')
const Recommendations = () => import('@/views/recommendations/Recommendations.vue')
const Trending = () => import('@/views/trending/Trending.vue')
const Featured = () => import('@/views/featured/Featured.vue')

// Community
const UsersList = () => import('@/views/users/UsersList.vue')
const UserProfile = () => import('@/views/users/UserProfile.vue')
const UserInterviews = () => import('@/views/users/UserInterviews.vue')
const UserReviews = () => import('@/views/users/UserReviews.vue')
const UserActivity = () => import('@/views/users/UserActivity.vue')
const Leaderboard = () => import('@/views/leaderboard/Leaderboard.vue')
const Community = () => import('@/views/community/Community.vue')

// Learning
const LearningPaths = () => import('@/views/learning/LearningPaths.vue')
const LearningPathDetail = () => import('@/views/learning/LearningPathDetail.vue')
const Courses = () => import('@/views/courses/Courses.vue')
const CourseDetail = () => import('@/views/courses/CourseDetail.vue')
const Practice = () => import('@/views/practice/Practice.vue')
const PracticeSession = () => import('@/views/practice/PracticeSession.vue')

// Analytics
const Analytics = () => import('@/views/analytics/Analytics.vue')
const Insights = () => import('@/views/insights/Insights.vue')
const Reports = () => import('@/views/reports/Reports.vue')
const Statistics = () => import('@/views/statistics/Statistics.vue')

// Integrations
const Integrations = () => import('@/views/integrations/Integrations.vue')
const IntegrationConnect = () => import('@/views/integrations/IntegrationConnect.vue')
const IntegrationCallback = () => import('@/views/integrations/IntegrationCallback.vue')

// Admin
const AdminDashboard = () => import('@/views/admin/AdminDashboard.vue')
const AdminUsers = () => import('@/views/admin/AdminUsers.vue')
const AdminInterviews = () => import('@/views/admin/AdminInterviews.vue')
const AdminAnalytics = () => import('@/views/admin/AdminAnalytics.vue')
const AdminSettings = () => import('@/views/admin/AdminSettings.vue')

// Blog
const Blog = () => import('@/views/blog/Blog.vue')
const BlogPost = () => import('@/views/blog/BlogPost.vue')
const BlogCategory = () => import('@/views/blog/BlogCategory.vue')
const BlogTag = () => import('@/views/blog/BlogTag.vue')
const News = () => import('@/views/news/News.vue')
const Resources = () => import('@/views/resources/Resources.vue')

// Error pages
const NotFound = () => import('@/views/errors/NotFound.vue')
const ServerError = () => import('@/views/errors/ServerError.vue')
const Forbidden = () => import('@/views/errors/Forbidden.vue')

const routes = [
  // Homepage and main sections
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      title: 'Master Your Interview Skills',
      description: 'Practice and improve your interview skills with real interview videos, AI-powered analysis, and expert feedback.',
      requiresAuth: false,
      layout: 'default'
    }
  },
  {
    path: '/about',
    name: 'about',
    component: About,
    meta: {
      title: 'About Interviews.tv',
      description: 'Learn about our mission to help professionals master their interview skills.',
      requiresAuth: false
    }
  },
  {
    path: '/contact',
    name: 'contact',
    component: Contact,
    meta: {
      title: 'Contact Us',
      description: 'Get in touch with the Interviews.tv team.',
      requiresAuth: false
    }
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: Privacy,
    meta: {
      title: 'Privacy Policy',
      description: 'Our privacy policy and data protection practices.',
      requiresAuth: false
    }
  },
  {
    path: '/terms',
    name: 'terms',
    component: Terms,
    meta: {
      title: 'Terms of Service',
      description: 'Terms and conditions for using Interviews.tv.',
      requiresAuth: false
    }
  },
  {
    path: '/help',
    name: 'help',
    component: Help,
    meta: {
      title: 'Help Center',
      description: 'Find answers to frequently asked questions.',
      requiresAuth: false
    }
  },

  // Authentication routes
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: 'Login',
      description: 'Sign in to your Interviews.tv account.',
      requiresAuth: false,
      guestOnly: true,
      layout: 'auth'
    }
  },
  {
    path: '/register',
    name: 'register',
    component: Register,
    meta: {
      title: 'Create Account',
      description: 'Join Interviews.tv and start improving your interview skills.',
      requiresAuth: false,
      guestOnly: true,
      layout: 'auth'
    }
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPassword,
    meta: {
      title: 'Forgot Password',
      description: 'Reset your Interviews.tv password.',
      requiresAuth: false,
      guestOnly: true,
      layout: 'auth'
    }
  },
  {
    path: '/reset-password/:token',
    name: 'reset-password',
    component: ResetPassword,
    meta: {
      title: 'Reset Password',
      description: 'Create a new password for your account.',
      requiresAuth: false,
      guestOnly: true,
      layout: 'auth'
    }
  },
  {
    path: '/verify-email/:token',
    name: 'verify-email',
    component: VerifyEmail,
    meta: {
      title: 'Verify Email',
      description: 'Verify your email address.',
      requiresAuth: false,
      layout: 'auth'
    }
  },

  // User dashboard and profile
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard,
    meta: {
      title: 'Dashboard',
      description: 'Your personal interview practice dashboard.',
      requiresAuth: true,
      layout: 'dashboard'
    }
  },
  {
    path: '/profile',
    name: 'profile',
    component: Profile,
    meta: {
      title: 'My Profile',
      description: 'View and manage your profile.',
      requiresAuth: true
    }
  },
  {
    path: '/profile/edit',
    name: 'profile-edit',
    component: ProfileEdit,
    meta: {
      title: 'Edit Profile',
      description: 'Update your profile information.',
      requiresAuth: true
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: {
      title: 'Settings',
      description: 'Manage your account settings and preferences.',
      requiresAuth: true
    }
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: Notifications,
    meta: {
      title: 'Notifications',
      description: 'View your notifications and alerts.',
      requiresAuth: true
    }
  },
  {
    path: '/watchlist',
    name: 'watchlist',
    component: Watchlist,
    meta: {
      title: 'My Watchlist',
      description: 'Interviews you want to watch later.',
      requiresAuth: true
    }
  },
  {
    path: '/history',
    name: 'history',
    component: History,
    meta: {
      title: 'Watch History',
      description: 'Your interview viewing history.',
      requiresAuth: true
    }
  },

  // Interview routes
  {
    path: '/interviews',
    name: 'interviews',
    component: InterviewsList,
    meta: {
      title: 'Interview Library',
      description: 'Browse our comprehensive library of interview videos.',
      requiresAuth: false
    }
  },
  {
    path: '/interviews/:slug',
    name: 'interview-detail',
    component: InterviewDetail,
    meta: {
      title: 'Interview Details',
      description: 'View interview details and analysis.',
      requiresAuth: false,
      dynamicMeta: true
    }
  },
  {
    path: '/watch/:slug',
    name: 'interview-watch',
    component: InterviewWatch,
    meta: {
      title: 'Watch Interview',
      description: 'Watch and learn from this interview.',
      requiresAuth: false,
      dynamicMeta: true,
      layout: 'player'
    }
  },
  {
    path: '/create-interview',
    name: 'interview-create',
    component: InterviewCreate,
    meta: {
      title: 'Create Interview',
      description: 'Share your interview experience with the community.',
      requiresAuth: true,
      requiresVerified: true
    }
  },
  {
    path: '/interviews/:slug/edit',
    name: 'interview-edit',
    component: InterviewEdit,
    meta: {
      title: 'Edit Interview',
      description: 'Edit your interview details.',
      requiresAuth: true,
      requiresOwnership: true
    }
  },
  {
    path: '/interviews/:slug/upload',
    name: 'interview-upload',
    component: InterviewUpload,
    meta: {
      title: 'Upload Video',
      description: 'Upload your interview video.',
      requiresAuth: true,
      requiresOwnership: true
    }
  },
  {
    path: '/interviews/:slug/analysis',
    name: 'interview-analysis',
    component: InterviewAnalysis,
    meta: {
      title: 'Interview Analysis',
      description: 'AI-powered analysis of your interview performance.',
      requiresAuth: true,
      dynamicMeta: true
    }
  },

  // Categories and topics
  {
    path: '/categories',
    name: 'categories',
    component: CategoriesList,
    meta: {
      title: 'Interview Categories',
      description: 'Browse interviews by category and industry.',
      requiresAuth: false
    }
  },
  {
    path: '/categories/:slug',
    name: 'category-detail',
    component: CategoryDetail,
    meta: {
      title: 'Category',
      description: 'Interviews in this category.',
      requiresAuth: false,
      dynamicMeta: true
    }
  },
  {
    path: '/topics',
    name: 'topics',
    component: TopicsList,
    meta: {
      title: 'Interview Topics',
      description: 'Explore interviews by topic and subject.',
      requiresAuth: false
    }
  },
  {
    path: '/topics/:slug',
    name: 'topic-detail',
    component: TopicDetail,
    meta: {
      title: 'Topic',
      description: 'Interviews about this topic.',
      requiresAuth: false,
      dynamicMeta: true
    }
  },
  {
    path: '/skills',
    name: 'skills',
    component: SkillsList,
    meta: {
      title: 'Skills Development',
      description: 'Develop specific interview skills.',
      requiresAuth: false
    }
  },
  {
    path: '/skills/:slug',
    name: 'skill-detail',
    component: SkillDetail,
    meta: {
      title: 'Skill',
      description: 'Learn and practice this skill.',
      requiresAuth: false,
      dynamicMeta: true
    }
  },

  // Search and discovery
  {
    path: '/search',
    name: 'search',
    component: Search,
    meta: {
      title: 'Search Interviews',
      description: 'Find interviews, users, and content.',
      requiresAuth: false
    }
  },
  {
    path: '/search/:query',
    name: 'search-results',
    component: SearchResults,
    meta: {
      title: 'Search Results',
      description: 'Search results for your query.',
      requiresAuth: false,
      dynamicMeta: true
    }
  },
  {
    path: '/search/advanced',
    name: 'advanced-search',
    component: AdvancedSearch,
    meta: {
      title: 'Advanced Search',
      description: 'Advanced search with filters and options.',
      requiresAuth: false
    }
  },
  {
    path: '/recommendations',
    name: 'recommendations',
    component: Recommendations,
    meta: {
      title: 'Recommendations',
      description: 'Personalized interview recommendations.',
      requiresAuth: true
    }
  },
  {
    path: '/trending',
    name: 'trending',
    component: Trending,
    meta: {
      title: 'Trending Interviews',
      description: 'Popular and trending interviews.',
      requiresAuth: false
    }
  },
  {
    path: '/featured',
    name: 'featured',
    component: Featured,
    meta: {
      title: 'Featured Content',
      description: 'Hand-picked featured interviews and content.',
      requiresAuth: false
    }
  },

  // Admin routes
  {
    path: '/admin',
    redirect: '/admin/dashboard'
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: AdminDashboard,
    meta: {
      title: 'Admin Dashboard',
      description: 'Administrative dashboard.',
      requiresAuth: true,
      requiresAdmin: true,
      layout: 'admin'
    }
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: AdminUsers,
    meta: {
      title: 'User Management',
      description: 'Manage users and accounts.',
      requiresAuth: true,
      requiresAdmin: true,
      layout: 'admin'
    }
  },
  {
    path: '/admin/interviews',
    name: 'admin-interviews',
    component: AdminInterviews,
    meta: {
      title: 'Interview Management',
      description: 'Manage interviews and content.',
      requiresAuth: true,
      requiresAdmin: true,
      layout: 'admin'
    }
  },
  {
    path: '/admin/analytics',
    name: 'admin-analytics',
    component: AdminAnalytics,
    meta: {
      title: 'Analytics Dashboard',
      description: 'Platform analytics and insights.',
      requiresAuth: true,
      requiresAdmin: true,
      layout: 'admin'
    }
  },
  {
    path: '/admin/settings',
    name: 'admin-settings',
    component: AdminSettings,
    meta: {
      title: 'System Settings',
      description: 'System configuration and settings.',
      requiresAuth: true,
      requiresAdmin: true,
      layout: 'admin'
    }
  },

  // Error pages
  {
    path: '/403',
    name: 'forbidden',
    component: Forbidden,
    meta: {
      title: 'Access Forbidden',
      description: 'You do not have permission to access this page.',
      requiresAuth: false,
      layout: 'error'
    }
  },
  {
    path: '/500',
    name: 'server-error',
    component: ServerError,
    meta: {
      title: 'Server Error',
      description: 'An internal server error occurred.',
      requiresAuth: false,
      layout: 'error'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound,
    meta: {
      title: 'Page Not Found',
      description: 'The page you are looking for does not exist.',
      requiresAuth: false,
      layout: 'error'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const metaStore = useMetaStore()
  
  // Check authentication requirements
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }
  
  // Check guest-only routes
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
    return
  }
  
  // Check admin requirements
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'forbidden' })
    return
  }
  
  // Check email verification
  if (to.meta.requiresVerified && !authStore.user?.email_verified_at) {
    next({ name: 'verify-email' })
    return
  }
  
  // Update meta tags
  if (to.meta.dynamicMeta) {
    await metaStore.updateDynamicMeta(to)
  } else {
    metaStore.updateMeta(to.meta)
  }
  
  next()
})

router.afterEach((to, from) => {
  // Track page views
  if (typeof gtag !== 'undefined') {
    gtag('config', 'GA_MEASUREMENT_ID', {
      page_title: to.meta.title,
      page_location: window.location.href
    })
  }
})

export default router
