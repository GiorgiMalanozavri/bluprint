export const mockProfile = {
  name: "Sara Khan",
  university: "University of Chicago",
  degree: "BA Economics",
  yearOfStudy: "Year 2",
  graduating: "2027",
  studentType: "International",
  dreamRole: "Strategy consulting",
  targetIndustries: "Consulting, strategy, tech",
  experiences: [
    {
      title: "Analyst",
      company: "Consulting Club",
      duration: "Sep 2024 - Present",
      bullets: ["Ran workshop research", "Built outreach lists for alumni events"],
    },
  ],
  education: [
    {
      degree: "BA Economics",
      institution: "University of Chicago",
      years: "2023 - 2027",
      grade: "GPA 3.8",
    },
  ],
  skills: ["Excel", "Research", "PowerPoint", "SQL"],
  extracurriculars: ["Consulting club", "Women in Business"],
  languages: ["English", "Hindi"],
};

export const mockRoadmap = {
  semesters: [
    {
      semester: "Spring 2025",
      status: "completed" as const,
      tasks: [
        { id: "s1", title: "Join one career club", category: "NETWORKING", effort: "1 hour", why: "You need early peer and alumni access." },
        { id: "s2", title: "Build your first CV draft", category: "CV", effort: "2 hours", why: "It gives you a base for every later application." },
        { id: "s3", title: "Attend one employer event", category: "INTERNSHIP", effort: "2 hours", why: "It helps you understand timelines early." },
      ],
    },
    {
      semester: "Fall 2025",
      status: "current" as const,
      tasks: [
        { id: "s4", title: "Reach out to 5 alumni", category: "NETWORKING", effort: "1 hour", why: "Networking matters most before deadlines get close." },
        { id: "s5", title: "Rewrite your experience bullets", category: "CV", effort: "45 mins", why: "Your CV needs clearer impact before applications open." },
        { id: "s6", title: "Track internship deadlines", category: "INTERNSHIP", effort: "30 mins", why: "Missing dates is avoidable and costly." },
      ],
    },
    {
      semester: "Spring 2026",
      status: "upcoming" as const,
      tasks: [
        { id: "s7", title: "Practice interviews weekly", category: "SKILLS", effort: "1 hour", why: "Preparation compounds over time." },
        { id: "s8", title: "Target sponsor-friendly firms", category: "VISA", effort: "1 hour", why: "It narrows effort toward realistic options." },
        { id: "s9", title: "Refine application stories", category: "INTERNSHIP", effort: "1 hour", why: "Good stories improve every application." },
      ],
    },
  ],
  monthlyTasks: [
    { id: "m1", title: "Update your LinkedIn summary", category: "CV", effort: "30 mins", why: "Your profile should match the roles you are targeting now." },
    { id: "m2", title: "Reach out to 3 alumni", category: "NETWORKING", effort: "1 hour", why: "Conversations now will shape where you apply later." },
    { id: "m3", title: "Draft one internship story", category: "INTERNSHIP", effort: "45 mins", why: "It makes later applications much faster." },
    { id: "m4", title: "Review visa timeline dates", category: "VISA", effort: "20 mins", why: "International students need to plan earlier." },
  ],
  cvAnalysis: {
    score: 64,
    summary: "Your CV is solid for this stage, but it still needs clearer impact and stronger role targeting.",
    strengths: ["Clear academic background", "Good early leadership signals", "Relevant coursework"],
    improvements: ["Quantify impact in bullets", "Add more target-role keywords", "Make the top section more specific"],
    missing: ["Short target-role summary", "More evidence of ownership"],
    rewrites: [
      { section: "Experience", reason: "Show measurable impact instead of just listing tasks.", after: "Built outreach lists used for 3 alumni events with 120+ student attendees." },
    ],
  },
};

export const mockCvUpload = {
  id: "mock-cv",
  fileName: "Sara_Khan_CV.pdf",
  fileSize: 184000,
  createdAt: new Date().toISOString(),
  extracted: mockProfile,
  analysis: mockRoadmap.cvAnalysis,
};

export const mockChatThreads = [
  {
    id: "mock-thread-1",
    title: "What should I focus on this week?",
    updatedAt: new Date().toISOString(),
    messages: [
      { role: "user", content: "What should I focus on this week?" },
      { role: "assistant", content: "Focus on networking first, then tighten your CV bullets. Those two things will make the biggest difference right now." },
    ],
  },
];
