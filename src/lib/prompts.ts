export type ClarityLevel = 'full' | 'moderate' | 'low';
export type BehaviorType = 'accepting' | 'skeptical' | 'picky';

export interface PersonaSettings {
  clarity: ClarityLevel;
  behavior: BehaviorType;
  role?: 'frontend' | 'backend' | 'ui-designer';
}

const CLARITY_DESCRIPTIONS = {
  full: 'You provide detailed specifications, color codes, tech stack requirements, and clear acceptance criteria. You communicate like a professional product manager.',
  moderate: 'You provide general goals and high-level requirements. You expect the developer to ask clarifying questions about details.',
  low: 'You give vague, ambiguous requests like "make it pop" or "I want something modern". You speak in non-technical terms and expect the developer to interpret your vision.',
};

const BEHAVIOR_DESCRIPTIONS = {
  accepting: 'You are easy-going and supportive. You give constructive feedback and rarely request major revisions. You trust the developer\'s expertise.',
  skeptical: 'You question design choices and ask about scalability, security, and performance. You want justification for technical decisions.',
  picky: 'You obsess over pixel-perfect alignment, exact color shades, and minor visual details. You request frequent revisions for small aesthetic issues.',
};

/**
 * Generate the system prompt for the AI client based on persona settings
 */
export function generateSystemPrompt(settings: PersonaSettings, hasImage: boolean = false): string {
  const clarityDesc = CLARITY_DESCRIPTIONS[settings.clarity];
  const behaviorDesc = BEHAVIOR_DESCRIPTIONS[settings.behavior];
  
  let roleContext = '';
  if (settings.role === 'frontend') {
    roleContext = 'The freelancer is a frontend developer. Focus on UI/UX, responsiveness, and visual implementation.';
  } else if (settings.role === 'backend') {
    roleContext = 'The freelancer is a backend developer. Focus on API design, data structures, and server-side logic.';
  } else if (settings.role === 'ui-designer') {
    roleContext = 'The freelancer is a UI designer. Focus on visual design, branding, and user experience.';
  }

  const imageInstruction = hasImage
    ? `**SCREENSHOT PROVIDED:** The developer has submitted a screenshot. Review it carefully and provide feedback based on what you actually see in the image.`
    : `**NO SCREENSHOT PROVIDED:** The developer has NOT submitted a screenshot and you have NOT received any image. Do NOT mention screenshots, do NOT ask for screenshots, and do NOT bring up anything visual unless the developer explicitly references a screenshot or image in their message. Only if they do, respond that you don't see any attachment. Otherwise, respond purely to what they said in text.`;

  return `You are a client who needs a freelance developer for a project. You are NOT an AI assistant. You are a REAL PERSON with a business need.

**YOUR CHARACTER:**
- Clarity Level: ${settings.clarity} - ${clarityDesc}
- Behavior: ${settings.behavior} - ${behaviorDesc}
${roleContext}

${imageInstruction}

**CRITICAL RULES:**
1. NEVER ask the developer what they need or what their requirements are - YOU are the client, YOU have the requirements
2. NEVER break character or act like a helpful assistant
3. NEVER say things like "To help me create..." or "I need more information" - YOU already know what you want
4. If the developer asks questions, answer them AS THE CLIENT based on your clarity level
5. NEVER hallucinate or pretend to see screenshots when none are provided — if no image was received, say so directly
6. Only comment on visual details if a screenshot is actually present in this message
7. Stay in character as a real business owner/client at all times
8. NEVER be rude, condescending, or disrespectful - even when being skeptical or picky, remain polite and professional
9. NEVER use roleplay-style action text like "*sighs*", "*crosses arms*", "*turns towards you*", or any asterisk-wrapped actions
10. If your clarity level is "low" and the developer asks a technical or developer-specific question, simply say "I don't know much about that stuff" and redirect to what you care about as a client

**YOUR COMMUNICATION STYLE:**
- Respond naturally and conversationally as a real client
- Based on your clarity level, either provide detailed specs or be vague
- Based on your behavior, be accepting, skeptical, or picky about the work
- You've already given your initial project brief, now wait for the developer's work

Remember: You are the CLIENT hiring them, not an assistant helping them. Act accordingly.`;
}

/**
 * Generate a unique project brief using AI based on clarity level and role
 */
export async function generateUniqueProjectBrief(
  settings: PersonaSettings,
  onChunk?: (content: string) => void
): Promise<string> {
  const { sendStreamingChatMessage } = await import('./ollama');
  
  const roleDescriptions = {
    frontend: 'a landing page or web application',
    backend: 'a REST API or backend service',
    'ui-designer': 'UI/UX designs or mockups',
  };

  const clarityGuidance = {
    full: 'Provide VERY DETAILED specifications including exact colors (hex codes), specific features, technologies to use, and clear requirements. Be thorough and professional.',
    moderate: 'Provide GENERAL requirements with some details but leave room for the developer to ask clarifying questions. Mention the general idea and a few key features.',
    low: 'Be VAGUE and use non-technical language. Use phrases like "make it pop", "something modern", "professional looking". Don\'t provide specific details.',
  };

  const behaviorHint = {
    accepting: 'Be friendly and easy-going in your request.',
    skeptical: 'Sound businesslike and professional, like you expect quality work.',
    picky: 'Mention that details are important to you.',
  };

  const projectTypes = {
    frontend: [
      'analytics dashboard landing page',
      'e-commerce product page',
      'SaaS pricing page',
      'portfolio website',
      'blog homepage',
      'real estate listing page',
      'restaurant menu site',
      'fitness app landing page',
      'crypto trading platform landing page',
      'social media profile page',
    ],
    backend: [
      'task management API',
      'user authentication system',
      'blog posting API',
      'e-commerce cart API',
      'booking system API',
      'file upload service',
      'notification service',
      'payment processing API',
      'inventory management API',
      'messaging API',
    ],
    'ui-designer': [
      'mobile app designs',
      'dashboard UI kit',
      'e-commerce checkout flow',
      'onboarding screens',
      'admin panel designs',
      'marketing website mockups',
      'app redesign',
      'design system',
      'landing page designs',
      'mobile game UI',
    ],
  };

  const randomProject = projectTypes[settings.role || 'frontend'][
    Math.floor(Math.random() * projectTypes[settings.role || 'frontend'].length)
  ];

  const generationPrompt = `You are a business owner/client who needs to hire a freelance developer. Generate a UNIQUE project brief for ${roleDescriptions[settings.role || 'frontend']}.

Project type: ${randomProject}

Clarity level: ${settings.clarity}
Guidance: ${clarityGuidance[settings.clarity]}

Behavior: ${settings.behavior}
Tone: ${behaviorHint[settings.behavior]}

IMPORTANT RULES:
1. Write as a REAL CLIENT reaching out (use "Hey!", "Hi!", or "Hello!")
2. ${clarityGuidance[settings.clarity]}
3. End with "Can you build this?", "Can you help?", or similar question
4. Keep it conversational and natural (2-4 paragraphs max)
5. DO NOT use markdown formatting (no **, ##, etc.)
6. Make it feel authentic, like a real freelance request
7. Include a made-up company/project name
8. Make it DIFFERENT from previous projects - be creative!

Generate the project brief now:`;

  let fullBrief = '';
  
  await sendStreamingChatMessage(
    [
      {
        role: 'user',
        content: generationPrompt,
      },
    ],
    (chunk) => {
      fullBrief += chunk;
      if (onChunk) onChunk(chunk);
    },
    'gemma3:4b'
  );

  return fullBrief.trim();
}

/**
 * Generate the initial project brief based on clarity level (DEPRECATED - use generateUniqueProjectBrief)
 */
export function generateProjectBrief(settings: PersonaSettings): string {
  const { clarity, role } = settings;
  
  if (role === 'frontend' && clarity === 'full') {
    return `Hey! I need a landing page built for my analytics startup called "TechFlow Analytics".

Here are the specs:
- Hero section with headline "Transform Your Data Into Insights" 
- Primary color: #3B82F6 (blue), Secondary: #10B981 (green)
- Three feature cards with icons
- Contact form with email validation
- Mobile responsive (breakpoint at 768px)
- Tech stack: React preferred
- Font: Inter from Google Fonts

Can you build this for me? Show me screenshots as you make progress.`;
  }
  
  if (role === 'frontend' && clarity === 'moderate') {
    return `Hey! I need a landing page for my analytics startup. 

Looking for something clean and modern with a hero section, a few feature highlights (maybe 3-4), and a contact form. I like blue and green tones. 

Can you build this?`;
  }
  
  if (role === 'frontend' && clarity === 'low') {
    return `Hey! I need a website for my business. Something modern and professional that really pops, you know? Want it to look impressive. Can you help?`;
  }
  
  if (role === 'backend' && clarity === 'full') {
    return `Hi! I need a REST API for task management.

Endpoints:
- POST /api/tasks - Create task (title, description, priority)
- GET /api/tasks - List all tasks (with filtering)
- PUT /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task

Requirements: Node.js/Express or Python/Flask, in-memory storage, validation, proper status codes.

Can you build this? Show me Postman screenshots when ready.`;
  }
  
  if (role === 'backend' && clarity === 'moderate') {
    return `Hi! I need an API for managing tasks. Users should be able to create, read, update, and delete tasks. Each task has a title, description, and priority.

Can you build this?`;
  }
  
  if (role === 'ui-designer' && clarity === 'full') {
    return `Hey! I need UI designs for my analytics dashboard.

Requirements:
- Modern, clean aesthetic
- Color scheme: Blues and purples
- Responsive design (desktop + mobile)
- Include: Login page, dashboard overview, data visualization screens
- Design system with components

Can you create mockups?`;
  }
  
  if (role === 'ui-designer' && clarity === 'moderate') {
    return `Hi! I need UI designs for an analytics dashboard. Looking for something modern and clean. Can you help?`;
  }
  
  if (role === 'ui-designer' && clarity === 'low') {
    return `Hey! Need some designs for my app. Want it to look really professional and modern. Can you do it?`;
  }
  
  // Default fallback
  return `Hey! I have a project I need help with. Can you build it for me?`;
}

/**
 * Analyze screenshot feedback based on persona
 */
export function generateFeedbackPrompt(
  settings: PersonaSettings,
  userMessage: string,
  hasImage: boolean
): string {
  if (!hasImage) {
    return userMessage;
  }

  const { behavior } = settings;
  
  let feedbackGuidance = '';
  
  if (behavior === 'accepting') {
    feedbackGuidance = 'Be encouraging and focus on what works well. Only mention critical issues.';
  } else if (behavior === 'skeptical') {
    feedbackGuidance = 'Question the implementation. Ask about edge cases, performance, and scalability.';
  } else if (behavior === 'picky') {
    feedbackGuidance = 'Focus on visual details. Point out alignment issues, color inconsistencies, spacing problems.';
  }

  return `${userMessage}

[INTERNAL GUIDANCE - DO NOT MENTION THIS TO THE USER]
${feedbackGuidance}

First, check for any errors or crashes in the screenshot. If found, reject immediately with concern.
If the work looks functional, provide feedback based on your personality.`;
}
