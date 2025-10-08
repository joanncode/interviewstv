/**
 * Sample Content Data for Frontend Display
 * 
 * High-quality sample content for demonstrations, onboarding,
 * and marketing purposes
 */

export const sampleUsers = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'creator',
    bio: 'Tech entrepreneur and startup advisor. Former VP of Engineering at TechCorp. Passionate about helping founders build scalable teams and products.',
    location: 'San Francisco, CA',
    company: 'Chen Ventures',
    website: 'https://sarahchen.com',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop',
    stats: {
      interviews: 12,
      followers: 2847,
      following: 156,
      views: 45230
    },
    verified: true,
    featured: true
  },
  {
    id: 2,
    name: 'Marcus Johnson',
    role: 'creator',
    bio: 'Award-winning documentary filmmaker and storyteller. 15+ years capturing human stories that matter. Emmy nominee for "Voices of Change" series.',
    location: 'New York, NY',
    company: 'Johnson Films',
    website: 'https://marcusjohnsonfilms.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    banner: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=1200&h=400&fit=crop',
    stats: {
      interviews: 8,
      followers: 1923,
      following: 89,
      views: 32150
    },
    verified: true,
    featured: true
  },
  {
    id: 3,
    name: 'Dr. Elena Rodriguez',
    role: 'creator',
    bio: 'Clinical psychologist and bestselling author. Specializes in workplace mental health and leadership psychology. TEDx speaker with 2M+ views.',
    location: 'Austin, TX',
    company: 'MindWell Institute',
    website: 'https://drrodriguez.com',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face',
    banner: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&h=400&fit=crop',
    stats: {
      interviews: 15,
      followers: 3421,
      following: 203,
      views: 67890
    },
    verified: true,
    featured: true
  }
]

export const sampleInterviews = [
  {
    id: 1,
    title: 'Building Scalable Startups: Lessons from Silicon Valley',
    description: 'Sarah Chen shares her journey from engineer to VP of Engineering, discussing the challenges of scaling teams, building product culture, and the mistakes that taught her the most valuable lessons.',
    type: 'video',
    category: 'Technology',
    tags: ['startup', 'leadership', 'engineering', 'scaling', 'silicon-valley'],
    duration: 2340, // 39 minutes
    thumbnail: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop',
    creator: sampleUsers[0],
    stats: {
      views: 12450,
      likes: 387,
      comments: 42,
      shares: 89
    },
    publishedAt: '2025-01-15T10:00:00Z',
    featured: true,
    trending: true
  },
  {
    id: 2,
    title: 'The Art of Documentary Storytelling',
    description: 'Emmy-nominated filmmaker Marcus Johnson discusses his approach to capturing authentic human stories, the evolution of documentary filmmaking, and his latest project "Voices of Change".',
    type: 'video',
    category: 'Arts & Media',
    tags: ['documentary', 'filmmaking', 'storytelling', 'emmy', 'voices-of-change'],
    duration: 1980, // 33 minutes
    thumbnail: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800&h=450&fit=crop',
    creator: sampleUsers[1],
    stats: {
      views: 8920,
      likes: 234,
      comments: 28,
      shares: 56
    },
    publishedAt: '2025-01-12T14:30:00Z',
    featured: true
  },
  {
    id: 3,
    title: 'Mental Health in the Modern Workplace',
    description: 'Dr. Elena Rodriguez explores the growing mental health crisis in corporate environments, practical strategies for leaders, and how to build psychologically safe workplaces.',
    type: 'audio',
    category: 'Health & Wellness',
    tags: ['mental-health', 'workplace', 'psychology', 'leadership', 'wellness'],
    duration: 2760, // 46 minutes
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=450&fit=crop',
    creator: sampleUsers[2],
    stats: {
      views: 15670,
      likes: 456,
      comments: 67,
      shares: 123
    },
    publishedAt: '2025-01-10T09:15:00Z',
    featured: true,
    trending: true
  }
]

export const sampleBusinesses = [
  {
    id: 1,
    name: 'TechFlow Solutions',
    description: 'Leading provider of cloud infrastructure and DevOps consulting services. Helping companies scale their technology operations efficiently.',
    industry: 'Technology',
    website: 'https://techflowsolutions.com',
    email: 'contact@techflowsolutions.com',
    phone: '+1-555-0201',
    address: '123 Innovation Drive, San Francisco, CA 94105',
    logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
    banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=400&fit=crop',
    stats: {
      interviews: 5,
      followers: 892,
      rating: 4.8,
      reviews: 47
    },
    verified: true,
    featured: true
  },
  {
    id: 2,
    name: 'Green Earth Consulting',
    description: 'Environmental consulting firm specializing in sustainability strategies and carbon footprint reduction for businesses of all sizes.',
    industry: 'Environmental',
    website: 'https://greenearthconsulting.com',
    email: 'info@greenearthconsulting.com',
    phone: '+1-555-0202',
    address: '456 Eco Boulevard, Portland, OR 97201',
    logo: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop',
    banner: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=400&fit=crop',
    stats: {
      interviews: 3,
      followers: 567,
      rating: 4.9,
      reviews: 23
    },
    verified: true
  }
]

export const sampleComments = [
  {
    id: 1,
    content: 'This is incredibly insightful! The part about scaling engineering teams really resonated with my experience. Thank you for sharing these lessons.',
    author: {
      name: 'Lisa Thompson',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
    },
    createdAt: '2025-01-16T08:30:00Z',
    likes: 12,
    replies: 2
  },
  {
    id: 2,
    content: 'As someone who\'s been through a similar journey, I can confirm everything Sarah says here is spot on. The culture piece is especially critical.',
    author: {
      name: 'James Mitchell',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    },
    createdAt: '2025-01-16T10:15:00Z',
    likes: 8,
    replies: 1
  }
]

export const sampleEvents = [
  {
    id: 1,
    title: 'Tech Leadership Summit 2025',
    description: 'Join industry leaders for a day of insights on building and scaling technology teams in the modern era.',
    type: 'virtual',
    date: '2025-02-15T10:00:00Z',
    location: 'Virtual Event',
    organizer: sampleUsers[0],
    attendees: 234,
    maxAttendees: 500,
    price: 0,
    featured: true
  },
  {
    id: 2,
    title: 'Documentary Filmmaking Workshop',
    description: 'Hands-on workshop covering the fundamentals of documentary storytelling, from concept to distribution.',
    type: 'in_person',
    date: '2025-03-01T09:00:00Z',
    location: 'New York Film Academy, NY',
    organizer: sampleUsers[1],
    attendees: 45,
    maxAttendees: 50,
    price: 299
  }
]

export const testimonials = [
  {
    id: 1,
    content: 'Interviews.tv has transformed how I share my expertise. The platform makes it easy to create professional content and connect with my audience.',
    author: 'Sarah Chen',
    role: 'Tech Entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    rating: 5
  },
  {
    id: 2,
    content: 'As a filmmaker, I appreciate the quality and simplicity of the platform. It\'s become my go-to for sharing behind-the-scenes insights.',
    author: 'Marcus Johnson',
    role: 'Documentary Filmmaker',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    rating: 5
  },
  {
    id: 3,
    content: 'The engagement I get on Interviews.tv is incredible. It\'s helped me reach a wider audience and build meaningful professional relationships.',
    author: 'Dr. Elena Rodriguez',
    role: 'Clinical Psychologist',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face',
    rating: 5
  }
]

export const platformStats = {
  totalUsers: 12847,
  totalInterviews: 3421,
  totalBusinesses: 892,
  totalViews: 2847392,
  monthlyGrowth: 23.5,
  averageRating: 4.8
}

export const featuredCategories = [
  {
    name: 'Technology',
    description: 'Insights from tech leaders, entrepreneurs, and innovators',
    icon: 'fas fa-laptop-code',
    color: '#FF0000',
    interviewCount: 234,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop'
  },
  {
    name: 'Business',
    description: 'Entrepreneurship, strategy, and business development',
    icon: 'fas fa-chart-line',
    color: '#FF4444',
    interviewCount: 189,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop'
  },
  {
    name: 'Health & Wellness',
    description: 'Mental health, fitness, and personal development',
    icon: 'fas fa-heart',
    color: '#FF6666',
    interviewCount: 156,
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'
  },
  {
    name: 'Arts & Media',
    description: 'Creative professionals sharing their craft and insights',
    icon: 'fas fa-palette',
    color: '#FF8888',
    interviewCount: 123,
    image: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=300&fit=crop'
  }
]

export const onboardingSteps = {
  viewer: [
    {
      title: 'Welcome to Interviews.tv',
      description: 'Discover insights from industry leaders and experts',
      action: 'Get Started'
    },
    {
      title: 'Explore Content',
      description: 'Browse interviews by category or search for specific topics',
      action: 'Browse Interviews'
    },
    {
      title: 'Follow Creators',
      description: 'Stay updated with your favorite creators and experts',
      action: 'Find Creators'
    },
    {
      title: 'Engage & Learn',
      description: 'Like, comment, and share interviews that inspire you',
      action: 'Start Watching'
    }
  ],
  creator: [
    {
      title: 'Welcome, Creator!',
      description: 'Share your expertise and build your audience',
      action: 'Set Up Profile'
    },
    {
      title: 'Complete Your Profile',
      description: 'Add your bio, expertise, and professional information',
      action: 'Edit Profile'
    },
    {
      title: 'Create Your First Interview',
      description: 'Upload a video, audio, or text-based interview',
      action: 'Create Interview'
    },
    {
      title: 'Grow Your Audience',
      description: 'Share your content and engage with your community',
      action: 'Share Content'
    }
  ],
  business: [
    {
      title: 'Welcome, Business Owner!',
      description: 'Showcase your company and connect with professionals',
      action: 'Create Business Profile'
    },
    {
      title: 'Set Up Your Business',
      description: 'Add company information, services, and contact details',
      action: 'Complete Profile'
    },
    {
      title: 'Connect with Experts',
      description: 'Find and connect with industry experts for interviews',
      action: 'Find Experts'
    },
    {
      title: 'Host Events',
      description: 'Create virtual or in-person events to engage your audience',
      action: 'Create Event'
    }
  ]
}

export const helpTopics = [
  {
    category: 'Getting Started',
    articles: [
      { title: 'How to create your first interview', views: 1234 },
      { title: 'Setting up your profile', views: 987 },
      { title: 'Understanding user roles', views: 756 },
      { title: 'Platform overview and features', views: 654 }
    ]
  },
  {
    category: 'Creating Content',
    articles: [
      { title: 'Video interview best practices', views: 543 },
      { title: 'Audio recording tips', views: 432 },
      { title: 'Writing engaging descriptions', views: 321 },
      { title: 'Using tags effectively', views: 234 }
    ]
  },
  {
    category: 'Growing Your Audience',
    articles: [
      { title: 'Promoting your interviews', views: 876 },
      { title: 'Engaging with your community', views: 654 },
      { title: 'Collaboration strategies', views: 543 },
      { title: 'Analytics and insights', views: 432 }
    ]
  }
]

export default {
  sampleUsers,
  sampleInterviews,
  sampleBusinesses,
  sampleComments,
  sampleEvents,
  testimonials,
  platformStats,
  featuredCategories,
  onboardingSteps,
  helpTopics
}
