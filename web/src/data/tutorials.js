/**
 * Tutorial Content and Step-by-Step Guides
 * 
 * Comprehensive tutorials for all platform features and user types
 */

export const tutorialCategories = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Essential tutorials for new users',
    icon: 'fas fa-rocket',
    color: '#FF0000'
  },
  {
    id: 'creating-content',
    name: 'Creating Content',
    description: 'Learn to create amazing interviews',
    icon: 'fas fa-video',
    color: '#FF4444'
  },
  {
    id: 'growing-audience',
    name: 'Growing Your Audience',
    description: 'Tips to expand your reach',
    icon: 'fas fa-chart-line',
    color: '#FF6666'
  },
  {
    id: 'monetization',
    name: 'Monetization',
    description: 'Turn your content into revenue',
    icon: 'fas fa-dollar-sign',
    color: '#FF8888'
  },
  {
    id: 'business-features',
    name: 'Business Features',
    description: 'Tools for business users',
    icon: 'fas fa-building',
    color: '#FFAAAA'
  }
]

export const tutorials = [
  // Getting Started Tutorials
  {
    id: 'platform-overview',
    title: 'Platform Overview - Your First Steps',
    description: 'A complete walkthrough of Interviews.tv and its key features',
    category: 'getting-started',
    difficulty: 'Beginner',
    duration: 480, // 8 minutes
    thumbnail: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop',
    videoUrl: '/tutorials/platform-overview.mp4',
    views: 12543,
    rating: 4.8,
    steps: [
      {
        title: 'Welcome to Interviews.tv',
        content: 'Learn about the platform\'s mission and core features',
        duration: 60
      },
      {
        title: 'Navigation Basics',
        content: 'Understand the main navigation and key sections',
        duration: 90
      },
      {
        title: 'User Roles Explained',
        content: 'Discover the differences between viewer, creator, and business accounts',
        duration: 120
      },
      {
        title: 'Profile Setup',
        content: 'Complete your profile for maximum impact',
        duration: 150
      },
      {
        title: 'Next Steps',
        content: 'Plan your journey on the platform',
        duration: 60
      }
    ],
    transcript: `Welcome to Interviews.tv, the premier platform for sharing expertise through interviews. In this tutorial, we'll walk you through everything you need to know to get started...`,
    relatedTutorials: ['profile-setup', 'first-interview', 'content-discovery']
  },
  
  {
    id: 'profile-setup',
    title: 'Complete Profile Setup Guide',
    description: 'Create a compelling profile that attracts followers and opportunities',
    category: 'getting-started',
    difficulty: 'Beginner',
    duration: 360, // 6 minutes
    thumbnail: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=450&fit=crop',
    videoUrl: '/tutorials/profile-setup.mp4',
    views: 8932,
    rating: 4.7,
    steps: [
      {
        title: 'Profile Photo Best Practices',
        content: 'Choose and upload a professional profile photo',
        duration: 90
      },
      {
        title: 'Writing Your Bio',
        content: 'Craft a compelling bio that showcases your expertise',
        duration: 120
      },
      {
        title: 'Adding Professional Information',
        content: 'Include your work experience, education, and skills',
        duration: 90
      },
      {
        title: 'Social Links and Contact Info',
        content: 'Connect your social profiles and contact information',
        duration: 60
      }
    ],
    transcript: `Your profile is your digital business card on Interviews.tv. Let's make sure it represents you professionally...`,
    relatedTutorials: ['platform-overview', 'personal-branding', 'networking-tips']
  },

  // Creating Content Tutorials
  {
    id: 'first-interview',
    title: 'Creating Your First Interview',
    description: 'Step-by-step guide to uploading and publishing your first interview',
    category: 'creating-content',
    difficulty: 'Beginner',
    duration: 720, // 12 minutes
    thumbnail: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800&h=450&fit=crop',
    videoUrl: '/tutorials/first-interview.mp4',
    views: 15678,
    rating: 4.9,
    steps: [
      {
        title: 'Planning Your Interview',
        content: 'Choose your topic and prepare your content',
        duration: 120
      },
      {
        title: 'Recording Setup',
        content: 'Set up your recording environment for best quality',
        duration: 150
      },
      {
        title: 'Upload Process',
        content: 'Upload your video or audio file to the platform',
        duration: 180
      },
      {
        title: 'Adding Metadata',
        content: 'Write compelling titles, descriptions, and tags',
        duration: 150
      },
      {
        title: 'Publishing and Promotion',
        content: 'Publish your interview and share it with your network',
        duration: 120
      }
    ],
    transcript: `Creating your first interview can feel overwhelming, but we'll break it down into simple steps...`,
    relatedTutorials: ['video-best-practices', 'audio-recording', 'content-optimization']
  },

  {
    id: 'video-best-practices',
    title: 'Video Interview Best Practices',
    description: 'Professional tips for creating high-quality video content',
    category: 'creating-content',
    difficulty: 'Intermediate',
    duration: 900, // 15 minutes
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop',
    videoUrl: '/tutorials/video-best-practices.mp4',
    views: 9876,
    rating: 4.8,
    steps: [
      {
        title: 'Lighting Fundamentals',
        content: 'Master lighting techniques for professional-looking videos',
        duration: 180
      },
      {
        title: 'Audio Quality',
        content: 'Ensure crystal-clear audio in your video interviews',
        duration: 150
      },
      {
        title: 'Camera Positioning',
        content: 'Frame your shots for maximum visual impact',
        duration: 120
      },
      {
        title: 'Background and Environment',
        content: 'Create a professional backdrop for your interviews',
        duration: 150
      },
      {
        title: 'Editing Basics',
        content: 'Simple editing techniques to polish your content',
        duration: 180
      },
      {
        title: 'Export Settings',
        content: 'Optimize your video files for web delivery',
        duration: 120
      }
    ],
    transcript: `Quality video production doesn't require expensive equipment. Let's explore the fundamentals...`,
    relatedTutorials: ['first-interview', 'live-streaming', 'equipment-guide']
  },

  {
    id: 'audio-recording',
    title: 'Professional Audio Recording Guide',
    description: 'Create podcast-quality audio interviews with any setup',
    category: 'creating-content',
    difficulty: 'Intermediate',
    duration: 600, // 10 minutes
    thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&h=450&fit=crop',
    videoUrl: '/tutorials/audio-recording.mp4',
    views: 7234,
    rating: 4.6,
    steps: [
      {
        title: 'Microphone Selection',
        content: 'Choose the right microphone for your needs and budget',
        duration: 120
      },
      {
        title: 'Recording Environment',
        content: 'Optimize your space for clean audio recording',
        duration: 90
      },
      {
        title: 'Recording Software',
        content: 'Set up and use recording software effectively',
        duration: 150
      },
      {
        title: 'Audio Levels and Monitoring',
        content: 'Monitor and adjust audio levels during recording',
        duration: 120
      },
      {
        title: 'Post-Processing',
        content: 'Basic audio editing and enhancement techniques',
        duration: 120
      }
    ],
    transcript: `Great audio quality is essential for engaging interviews. Here's how to achieve professional results...`,
    relatedTutorials: ['first-interview', 'equipment-guide', 'podcast-tips']
  },

  // Growing Audience Tutorials
  {
    id: 'content-optimization',
    title: 'SEO and Content Optimization',
    description: 'Optimize your interviews for maximum discoverability',
    category: 'growing-audience',
    difficulty: 'Intermediate',
    duration: 540, // 9 minutes
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
    videoUrl: '/tutorials/content-optimization.mp4',
    views: 6543,
    rating: 4.7,
    steps: [
      {
        title: 'Keyword Research',
        content: 'Find the right keywords for your content',
        duration: 120
      },
      {
        title: 'Title Optimization',
        content: 'Write compelling, SEO-friendly titles',
        duration: 90
      },
      {
        title: 'Description Best Practices',
        content: 'Craft descriptions that engage and inform',
        duration: 120
      },
      {
        title: 'Tag Strategy',
        content: 'Use tags effectively to improve discoverability',
        duration: 90
      },
      {
        title: 'Thumbnail Design',
        content: 'Create eye-catching thumbnails that drive clicks',
        duration: 120
      }
    ],
    transcript: `Making your content discoverable is crucial for growing your audience. Let's explore optimization strategies...`,
    relatedTutorials: ['social-media-promotion', 'analytics-insights', 'audience-engagement']
  },

  {
    id: 'social-media-promotion',
    title: 'Social Media Promotion Strategies',
    description: 'Leverage social platforms to grow your interview audience',
    category: 'growing-audience',
    difficulty: 'Intermediate',
    duration: 480, // 8 minutes
    thumbnail: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=450&fit=crop',
    videoUrl: '/tutorials/social-media-promotion.mp4',
    views: 5432,
    rating: 4.5,
    steps: [
      {
        title: 'Platform Selection',
        content: 'Choose the right social platforms for your audience',
        duration: 90
      },
      {
        title: 'Content Adaptation',
        content: 'Adapt your interviews for different social formats',
        duration: 120
      },
      {
        title: 'Posting Strategy',
        content: 'Develop a consistent posting schedule and strategy',
        duration: 90
      },
      {
        title: 'Engagement Tactics',
        content: 'Build community and encourage interaction',
        duration: 120
      },
      {
        title: 'Cross-Platform Integration',
        content: 'Create a cohesive presence across platforms',
        duration: 60
      }
    ],
    transcript: `Social media can significantly amplify your interview content. Here's how to use it effectively...`,
    relatedTutorials: ['content-optimization', 'community-building', 'influencer-collaboration']
  },

  // Monetization Tutorials
  {
    id: 'monetization-basics',
    title: 'Monetization Fundamentals',
    description: 'Turn your expertise into revenue streams',
    category: 'monetization',
    difficulty: 'Intermediate',
    duration: 660, // 11 minutes
    thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop',
    videoUrl: '/tutorials/monetization-basics.mp4',
    views: 8765,
    rating: 4.8,
    steps: [
      {
        title: 'Revenue Streams Overview',
        content: 'Understand different ways to monetize your content',
        duration: 120
      },
      {
        title: 'Subscription Setup',
        content: 'Create subscription tiers for your audience',
        duration: 150
      },
      {
        title: 'Premium Content Strategy',
        content: 'Develop exclusive content for paying subscribers',
        duration: 120
      },
      {
        title: 'Pricing Strategy',
        content: 'Set competitive and fair pricing for your content',
        duration: 90
      },
      {
        title: 'Payment Processing',
        content: 'Set up payment methods and manage transactions',
        duration: 120
      },
      {
        title: 'Tax Considerations',
        content: 'Understand tax implications of content monetization',
        duration: 60
      }
    ],
    transcript: `Monetizing your expertise requires strategy and planning. Let's explore the fundamentals...`,
    relatedTutorials: ['premium-content', 'sponsorship-guide', 'financial-planning']
  },

  // Business Features Tutorials
  {
    id: 'business-profile-setup',
    title: 'Business Profile Optimization',
    description: 'Create a compelling business presence on the platform',
    category: 'business-features',
    difficulty: 'Beginner',
    duration: 420, // 7 minutes
    thumbnail: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=450&fit=crop',
    videoUrl: '/tutorials/business-profile-setup.mp4',
    views: 4321,
    rating: 4.6,
    steps: [
      {
        title: 'Company Information',
        content: 'Add comprehensive company details and description',
        duration: 90
      },
      {
        title: 'Visual Branding',
        content: 'Upload logos, banners, and brand assets',
        duration: 90
      },
      {
        title: 'Service Listings',
        content: 'Showcase your products and services',
        duration: 120
      },
      {
        title: 'Contact and Location',
        content: 'Make it easy for customers to reach you',
        duration: 60
      },
      {
        title: 'Verification Process',
        content: 'Get your business verified for credibility',
        duration: 60
      }
    ],
    transcript: `A strong business profile builds trust and attracts customers. Here's how to optimize yours...`,
    relatedTutorials: ['business-networking', 'lead-generation', 'corporate-interviews']
  }
]

export const quickTips = [
  {
    id: 'lighting-tip',
    title: 'Quick Lighting Fix',
    description: 'Face a window for instant professional lighting',
    category: 'creating-content',
    duration: 30,
    tip: 'Position yourself facing a large window during daytime for natural, flattering lighting that rivals expensive equipment.'
  },
  {
    id: 'audio-tip',
    title: 'Improve Audio Instantly',
    description: 'Use a closet full of clothes as a recording booth',
    category: 'creating-content',
    duration: 15,
    tip: 'Record in a walk-in closet or surround yourself with soft materials to reduce echo and improve audio quality.'
  },
  {
    id: 'engagement-tip',
    title: 'Boost Engagement',
    description: 'Ask questions in your content to encourage comments',
    category: 'growing-audience',
    duration: 20,
    tip: 'End your interviews with a question for your audience. This simple technique can double your comment engagement.'
  },
  {
    id: 'seo-tip',
    title: 'SEO Quick Win',
    description: 'Include your main keyword in the first 25 words',
    category: 'growing-audience',
    duration: 10,
    tip: 'Mention your primary keyword within the first 25 words of your description for better search visibility.'
  },
  {
    id: 'monetization-tip',
    title: 'Start Monetizing Early',
    description: 'Build your email list from day one',
    category: 'monetization',
    duration: 25,
    tip: 'Start collecting email addresses immediately. Your email list is your most valuable asset for future monetization.'
  }
]

export const tutorialPlaylists = [
  {
    id: 'complete-beginner',
    title: 'Complete Beginner\'s Guide',
    description: 'Everything you need to start creating interviews',
    tutorials: ['platform-overview', 'profile-setup', 'first-interview', 'content-optimization'],
    totalDuration: 2100, // 35 minutes
    difficulty: 'Beginner'
  },
  {
    id: 'creator-mastery',
    title: 'Creator Mastery Series',
    description: 'Advanced techniques for serious content creators',
    tutorials: ['video-best-practices', 'audio-recording', 'social-media-promotion', 'monetization-basics'],
    totalDuration: 2520, // 42 minutes
    difficulty: 'Intermediate'
  },
  {
    id: 'business-success',
    title: 'Business Success Track',
    description: 'Leverage interviews for business growth',
    tutorials: ['business-profile-setup', 'content-optimization', 'social-media-promotion'],
    totalDuration: 1440, // 24 minutes
    difficulty: 'Beginner'
  }
]

export const achievements = [
  {
    id: 'first-tutorial',
    title: 'Learning Begins',
    description: 'Completed your first tutorial',
    icon: 'fas fa-graduation-cap',
    points: 10
  },
  {
    id: 'tutorial-streak',
    title: 'Knowledge Seeker',
    description: 'Completed 5 tutorials in a row',
    icon: 'fas fa-fire',
    points: 50
  },
  {
    id: 'category-master',
    title: 'Category Expert',
    description: 'Completed all tutorials in a category',
    icon: 'fas fa-trophy',
    points: 100
  },
  {
    id: 'tutorial-completionist',
    title: 'Tutorial Master',
    description: 'Completed all available tutorials',
    icon: 'fas fa-crown',
    points: 500
  }
]

export default {
  tutorialCategories,
  tutorials,
  quickTips,
  tutorialPlaylists,
  achievements
}
