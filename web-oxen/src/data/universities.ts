/* ------------------------------------------------------------------ */
/*  University data model + seed data                                  */
/*  Mirrors the Country/City pattern from data/countries.ts            */
/*  Designed for Supabase — seed data is the fallback when DB is empty */
/* ------------------------------------------------------------------ */

export interface RequiredDocument {
  name: string;
  status: "completed" | "pending" | "optional" | "required";
}

export interface Program {
  id: string;
  name: string;
  degree: "bachelor" | "master" | "phd";
  duration: string;
  tuition: string;
  language: string;
  description: string;
}

export interface UniversityVideo {
  id: string;
  title: string;
  category: "campus-tour" | "dormitory" | "student-life" | "graduation" | "laboratories" | "library" | "sports" | "international" | "research" | "events";
  url: string;
  thumbnail: string;
}

export interface UniversityReview {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
  program: string;
}

export interface UniversityPost {
  id: string;
  coverUrl: string;
  avatarUrl: string;
  username: string;
  userId: string;
  flag: string;
  country: string;
  city: string;
  caption: string;
  likes: number;
  comments: number;
  liked?: boolean;
  saved?: boolean;
  isVideo?: boolean;
  videoUrl?: string;
}

export interface University {
  id: string;
  name: string;
  country: string;
  flag: string;
  city: string;
  continent: string;
  latitude: number;
  longitude: number;
  logo: string;
  coverImage: string;
  gallery: string[];
  description: string;
  shortDescription: string;
  qsRanking: number;
  worldRanking: number;
  tuition: string;
  tuitionNumeric: number;
  scholarship: string;
  hasScholarship: boolean;
  deadline: string;
  applicationFee: string;
  website: string;
  admissionLink: string;
  officialApplicationLink: string;
  acceptanceRate: number;
  campusSize: string;
  studentsCount: number;
  programsCount: number;
  email: string;
  phone: string;
  socialLinks: { platform: string; url: string }[];
  type: "public" | "private";
  ieltsRequirement: string;
  toeflRequirement: string;
  satRequirement: string;
  actRequirement: string;
  language: string;
  nearbyCity: string;
  requiredDocuments: RequiredDocument[];
  bachelorPrograms: Program[];
  masterPrograms: Program[];
  phdPrograms: Program[];
  videos: UniversityVideo[];
  reviews: UniversityReview[];
  posts: UniversityPost[];
  employmentRate: number;
  livingCost: string;
  housingAvailable: boolean;
}

/* ── Sample video URLs ── */
const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
];

const STANDARD_DOCS: RequiredDocument[] = [
  { name: "Passport", status: "required" },
  { name: "High School Diploma", status: "required" },
  { name: "Bachelor Diploma", status: "optional" },
  { name: "Transcript", status: "required" },
  { name: "IELTS", status: "required" },
  { name: "TOEFL", status: "optional" },
  { name: "SAT", status: "optional" },
  { name: "ACT", status: "optional" },
  { name: "Recommendation Letter", status: "required" },
  { name: "Motivation Letter", status: "required" },
  { name: "CV", status: "required" },
  { name: "Portfolio", status: "optional" },
  { name: "Passport Photo", status: "required" },
  { name: "Visa Documents", status: "pending" },
  { name: "Financial Statement", status: "required" },
  { name: "Medical Certificate", status: "optional" },
];

/* ── Helper to build a program ── */
function prog(id: string, name: string, degree: Program["degree"], duration: string, tuition: string, language: string, description: string): Program {
  return { id, name, degree, duration, tuition, language, description };
}

/* ── Helper to build a video ── */
function vid(id: string, title: string, category: UniversityVideo["category"], idx: number, thumb: string): UniversityVideo {
  return { id, title, category, url: SAMPLE_VIDEOS[idx % SAMPLE_VIDEOS.length], thumbnail: thumb };
}

/* ── Helper to build a review ── */
function rev(id: string, author: string, avatar: string, rating: number, date: string, text: string, program: string): UniversityReview {
  return { id, author, avatar, rating, date, text, program };
}

/* ── Helper to build a post ── */
function post(id: string, cover: string, username: string, userId: string, flag: string, country: string, city: string, caption: string, likes: number, comments: number, isVideo = false): UniversityPost {
  return {
    id, coverUrl: cover, avatarUrl: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`,
    username, userId, flag, country, city, caption, likes, comments, isVideo,
    videoUrl: isVideo ? SAMPLE_VIDEOS[Math.floor(Math.random() * SAMPLE_VIDEOS.length)] : undefined,
  };
}

/* ==================================================================
   SEED UNIVERSITIES — 20 universities with real GPS coordinates
   ================================================================== */

const BASE_UNIVERSITIES: University[] = [
  {
    id: "harvard",
    name: "Harvard University",
    country: "United States",
    flag: "🇺🇸",
    city: "Cambridge, MA",
    continent: "North America",
    latitude: 42.3744,
    longitude: -71.1169,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1607233134-r5a9f4a8c8c0?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1607233134-r5a9f4a8c8c0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1577896851239-4194636f342e?w=800&h=600&fit=crop",
    ],
    description: "Harvard University is a private Ivy League research university in Cambridge, Massachusetts. Established in 1636, it is the oldest institution of higher education in the United States and one of the most prestigious universities in the world.",
    shortDescription: "The oldest and one of the most prestigious universities in the United States.",
    qsRanking: 4,
    worldRanking: 1,
    tuition: "$57,261/year",
    tuitionNumeric: 57261,
    scholarship: "Need-based financial aid available up to 100%",
    hasScholarship: true,
    deadline: "January 1, 2026",
    applicationFee: "$75",
    website: "https://www.harvard.edu",
    admissionLink: "https://www.harvard.edu/admissions",
    officialApplicationLink: "https://college.harvard.edu/admissions/apply",
    acceptanceRate: 3,
    campusSize: "5,077 acres",
    studentsCount: 23000,
    programsCount: 50,
    email: "admissions@harvard.edu",
    phone: "+1-617-495-1551",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/Harvard" },
      { platform: "instagram", url: "https://instagram.com/harvard" },
      { platform: "youtube", url: "https://youtube.com/harvard" },
    ],
    type: "private",
    ieltsRequirement: "7.5+",
    toeflRequirement: "100+",
    satRequirement: "1460-1580",
    actRequirement: "33-35",
    language: "English",
    nearbyCity: "Boston",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("hb1", "Computer Science", "bachelor", "4 years", "$57,261/year", "English", "Comprehensive CS program covering AI, systems, theory, and software engineering."),
      prog("hb2", "Economics", "bachelor", "4 years", "$57,261/year", "English", "One of the most popular concentrations at Harvard, covering micro/macro economics and finance."),
      prog("hb3", "Government", "bachelor", "4 years", "$57,261/year", "English", "Study of political science, international relations, and public policy."),
    ],
    masterPrograms: [
      prog("hm1", "MBA", "master", "2 years", "$73,440/year", "English", "World-renowned business program at Harvard Business School."),
      prog("hm2", "Master of Public Policy", "master", "2 years", "$56,232/year", "English", "Harvard Kennedy School program for future leaders in public service."),
    ],
    phdPrograms: [
      prog("hp1", "PhD in Computer Science", "phd", "5-6 years", "Fully funded", "English", "Research-focused doctoral program with full funding for admitted students."),
      prog("hp2", "PhD in Biological Sciences", "phd", "5-6 years", "Fully funded", "English", "Cutting-edge biomedical research at Harvard Medical School."),
    ],
    videos: [
      vid("hv1", "Harvard Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1607233134-r5a9f4a8c8c0?w=800&h=500&fit=crop"),
      vid("hv2", "Dormitory Tour", "dormitory", 1, "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=800&h=500&fit=crop"),
      vid("hv3", "Student Life at Harvard", "student-life", 2, "https://images.unsplash.com/photo-1577896851239-4194636f342e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("hr1", "Sarah Chen", "https://i.pravatar.cc/150?img=20", 5, "2025-05", "Harvard transformed my life. The resources, the network, and the intellectual environment are unmatched.", "Computer Science"),
      rev("hr2", "Michael Rodriguez", "https://i.pravatar.cc/150?img=33", 5, "2025-03", "The professors are world-class and the library system is incredible. The pressure is real but worth it.", "Economics"),
    ],
    posts: [
      post("hpa1", "https://images.unsplash.com/photo-1607233134-r5a9f4a8c8c0?w=800&h=600&fit=crop", "sarah_harvard", "u-sarah", "🇺🇸", "United States", "Cambridge", "First day at Harvard Yard! The history in every brick is surreal 🎓", 3421, 156),
      post("hpa2", "https://images.unsplash.com/photo-1577896851239-4194636f342e?w=800&h=600&fit=crop", "mike_h", "u-mike", "🇺🇸", "United States", "Cambridge", "Widener Library at midnight — the heart of Harvard 📚", 2890, 98, true),
    ],
    employmentRate: 94,
    livingCost: "$2,500-3,500/month",
    housingAvailable: true,
  },
  {
    id: "stanford",
    name: "Stanford University",
    country: "United States",
    flag: "🇺🇸",
    city: "Stanford, CA",
    continent: "North America",
    latitude: 37.4275,
    longitude: -122.1697,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1591291621164-2c6367723315?w=800&h=600&fit=crop",
    ],
    description: "Stanford University is a private research university in Stanford, California. Known for its academic strength, wealth, location in Silicon Valley, and ranking as one of the world's top universities.",
    shortDescription: "The heart of Silicon Valley innovation and entrepreneurship.",
    qsRanking: 6,
    worldRanking: 2,
    tuition: "$61,731/year",
    tuitionNumeric: 61731,
    scholarship: "Need-based aid; no loans for families earning under $100k",
    hasScholarship: true,
    deadline: "January 5, 2026",
    applicationFee: "$90",
    website: "https://www.stanford.edu",
    admissionLink: "https://admission.stanford.edu",
    officialApplicationLink: "https://admission.stanford.edu/apply/",
    acceptanceRate: 4,
    campusSize: "8,180 acres",
    studentsCount: 17000,
    programsCount: 65,
    email: "admission@stanford.edu",
    phone: "+1-650-723-2091",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/Stanford" },
      { platform: "instagram", url: "https://instagram.com/stanford" },
    ],
    type: "private",
    ieltsRequirement: "7.0+",
    toeflRequirement: "100+",
    satRequirement: "1470-1570",
    actRequirement: "34-35",
    language: "English",
    nearbyCity: "San Francisco",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("sb1", "Computer Science", "bachelor", "4 years", "$61,731/year", "English", "CS at Stanford is at the epicenter of tech innovation with tracks in AI, systems, and human-computer interaction."),
      prog("sb2", "Engineering", "bachelor", "4 years", "$61,731/year", "English", "Top-ranked engineering program with multiple specializations."),
    ],
    masterPrograms: [
      prog("sm1", "MS in Computer Science", "master", "2 years", "$61,731/year", "English", "Advanced CS with research opportunities in AI, ML, and systems."),
      prog("sm2", "MBA", "master", "2 years", "$79,860/year", "English", "Stanford GSB — one of the most selective MBA programs globally."),
    ],
    phdPrograms: [
      prog("sp1", "PhD in Electrical Engineering", "phd", "5-6 years", "Fully funded", "English", "Research in circuits, optics, and information systems."),
    ],
    videos: [
      vid("sv1", "Stanford Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&h=500&fit=crop"),
      vid("sv2", "Library Tour", "library", 1, "https://images.unsplash.com/photo-1591291621164-2c6367723315?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("sr1", "Emily Wang", "https://i.pravatar.cc/150?img=25", 5, "2025-06", "Stanford's connection to Silicon Valley is unbeatable. Interned at Google during my sophomore year!", "Computer Science"),
      rev("sr2", "David Kim", "https://i.pravatar.cc/150?img=40", 5, "2025-04", "The campus is gorgeous and the entrepreneurial spirit is everywhere. Started my company here!", "Engineering"),
    ],
    posts: [
      post("spa1", "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&h=600&fit=crop", "emily_stanford", "u-emily", "🇺🇸", "United States", "Stanford", "The Main Quad at golden hour 🌅 Stanford is even more beautiful in person!", 4521, 201),
      post("spa2", "https://images.unsplash.com/photo-1591291621164-2c6367723315?w=800&h=600&fit=crop", "david_k", "u-david", "🇺🇸", "United States", "Stanford", "Hackathon weekend at Stanford! 48 hours of code and coffee ☕", 3210, 145, true),
    ],
    employmentRate: 95,
    livingCost: "$3,000-4,500/month",
    housingAvailable: true,
  },
  {
    id: "mit",
    name: "Massachusetts Institute of Technology",
    country: "United States",
    flag: "🇺🇸",
    city: "Cambridge, MA",
    continent: "North America",
    latitude: 42.3601,
    longitude: -71.0942,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1581094794329-4c5b3c3e3e3e?w=800&h=600&fit=crop",
    ],
    description: "MIT is a private land-grant research university in Cambridge, Massachusetts. Established in 1861, MIT has played a significant role in the development of modern technology and science.",
    shortDescription: "Where innovation meets engineering excellence.",
    qsRanking: 1,
    worldRanking: 3,
    tuition: "$57,986/year",
    tuitionNumeric: 57986,
    scholarship: "Need-based aid; meets 100% of demonstrated financial need",
    hasScholarship: true,
    deadline: "January 4, 2026",
    applicationFee: "$75",
    website: "https://www.mit.edu",
    admissionLink: "https://www.mit.edu/admissions",
    officialApplicationLink: "https://mitadmissions.org/apply/",
    acceptanceRate: 4,
    campusSize: "168 acres",
    studentsCount: 11500,
    programsCount: 44,
    email: "admissions@mit.edu",
    phone: "+1-617-253-3400",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/MIT" },
      { platform: "youtube", url: "https://youtube.com/mit" },
    ],
    type: "private",
    ieltsRequirement: "7.5+",
    toeflRequirement: "100+",
    satRequirement: "1520-1580",
    actRequirement: "35-36",
    language: "English",
    nearbyCity: "Boston",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("mb1", "Electrical Engineering & Computer Science", "bachelor", "4 years", "$57,986/year", "English", "MIT's flagship EECS program — the foundation of modern computing and electronics."),
      prog("mb2", "Mechanical Engineering", "bachelor", "4 years", "$57,986/year", "English", "Hands-on engineering with cutting-edge labs and fabrication facilities."),
    ],
    masterPrograms: [
      prog("mm1", "MS in AI & Machine Learning", "master", "2 years", "$57,986/year", "English", "Advanced study in AI, deep learning, and robotics at CSAIL."),
    ],
    phdPrograms: [
      prog("mp1", "PhD in Physics", "phd", "5-6 years", "Fully funded", "English", "Research in quantum computing, particle physics, and astrophysics."),
    ],
    videos: [
      vid("mv1", "MIT Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
      vid("mv2", "Research Laboratories", "laboratories", 1, "https://images.unsplash.com/photo-1581094794329-4c5b3c3e3e3e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("mr1", "Alex Turner", "https://i.pravatar.cc/150?img=11", 5, "2025-06", "MIT pushes you to your limits but the intellectual growth is insane. Best decision ever.", "EECS"),
    ],
    posts: [
      post("mpa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "alex_mit", "u-alex", "🇺🇸", "United States", "Cambridge", "Building robots in the MIT lab at 3am 🤖 This place is a maker's paradise!", 5672, 234),
    ],
    employmentRate: 97,
    livingCost: "$2,800-4,000/month",
    housingAvailable: true,
  },
  {
    id: "oxford",
    name: "University of Oxford",
    country: "United Kingdom",
    flag: "🇬🇧",
    city: "Oxford",
    continent: "Europe",
    latitude: 51.7548,
    longitude: -1.2544,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1577896851239-4194636f342e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1577896851239-4194636f342e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=800&h=600&fit=crop",
    ],
    description: "The University of Oxford is a collegiate research university in Oxford, England. There is evidence of teaching as early as 1096, making it the oldest university in the English-speaking world.",
    shortDescription: "The oldest university in the English-speaking world.",
    qsRanking: 3,
    worldRanking: 4,
    tuition: "£28,950/year (international)",
    tuitionNumeric: 37000,
    scholarship: "Rhodes Scholarship, Clarendon Fund, and numerous college scholarships",
    hasScholarship: true,
    deadline: "January 10, 2026",
    applicationFee: "£75",
    website: "https://www.ox.ac.uk",
    admissionLink: "https://www.ox.ac.uk/admissions",
    officialApplicationLink: "https://www.ox.ac.uk/admissions/undergraduate/applying-to-oxford",
    acceptanceRate: 17,
    campusSize: "Collegiate system across Oxford city",
    studentsCount: 26000,
    programsCount: 350,
    email: "admissions@ox.ac.uk",
    phone: "+44-1865-270000",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/OxUni" },
      { platform: "instagram", url: "https://instagram.com/uniofoxford" },
    ],
    type: "public",
    ieltsRequirement: "7.5+",
    toeflRequirement: "110+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "English",
    nearbyCity: "London",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("ob1", "PPE (Philosophy, Politics & Economics)", "bachelor", "3 years", "£28,950/year", "English", "Oxford's iconic PPE degree producing world leaders since 1920."),
      prog("ob2", "Mathematics", "bachelor", "3-4 years", "£28,950/year", "English", "Rigorous mathematical training at one of the world's top math departments."),
    ],
    masterPrograms: [
      prog("om1", "MBA (Oxford Saïd)", "master", "1 year", "£78,510", "English", "Intensive 1-year MBA at Oxford Saïd Business School."),
    ],
    phdPrograms: [
      prog("op1", "DPhil in Computer Science", "phd", "3-4 years", "Fully funded for many programs", "English", "Doctoral research in CS with full funding available for top candidates."),
    ],
    videos: [
      vid("ov1", "Oxford Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1577896851239-4194636f342e?w=800&h=500&fit=crop"),
      vid("ov2", "Library & Research", "library", 1, "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("or1", "James Williams", "https://i.pravatar.cc/150?img=15", 5, "2025-05", "Oxford's tutorial system is unique and incredibly effective. The academic rigor is unmatched.", "PPE"),
      rev("or2", "Priya Sharma", "https://i.pravatar.cc/150?img=30", 5, "2025-04", "The collegiate system creates an intimate community within a world-class research university.", "Mathematics"),
    ],
    posts: [
      post("opa1", "https://images.unsplash.com/photo-1577896851239-4194636f342e?w=800&h=600&fit=crop", "james_ox", "u-james", "🇬🇧", "United Kingdom", "Oxford", "The Radcliffe Camera at sunset 📚 900 years of academic excellence!", 4231, 189),
    ],
    employmentRate: 92,
    livingCost: "£1,500-2,200/month",
    housingAvailable: true,
  },
  {
    id: "cambridge",
    name: "University of Cambridge",
    country: "United Kingdom",
    flag: "🇬🇧",
    city: "Cambridge",
    continent: "Europe",
    latitude: 52.2053,
    longitude: 0.1218,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1591291621164-2c6367723315?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1591291621164-2c6367723315?w=800&h=600&fit=crop",
    ],
    description: "The University of Cambridge is a collegiate public research university in Cambridge, England. Founded in 1209, it is the world's third-oldest university in continuous operation.",
    shortDescription: "800 years of scientific discovery and academic excellence.",
    qsRanking: 2,
    worldRanking: 5,
    tuition: "£24,534/year (international)",
    tuitionNumeric: 31000,
    scholarship: "Gates Cambridge Scholarship, Cambridge Trust scholarships",
    hasScholarship: true,
    deadline: "January 15, 2026",
    applicationFee: "£60",
    website: "https://www.cam.ac.uk",
    admissionLink: "https://www.undergraduate.study.cam.ac.uk",
    officialApplicationLink: "https://www.undergraduate.study.cam.ac.uk/apply",
    acceptanceRate: 21,
    campusSize: "Collegiate system across Cambridge city",
    studentsCount: 24000,
    programsCount: 180,
    email: "admissions@cam.ac.uk",
    phone: "+44-1223-333308",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/Cambridge_Uni" },
    ],
    type: "public",
    ieltsRequirement: "7.5+",
    toeflRequirement: "110+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "English",
    nearbyCity: "London",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("cb1", "Natural Sciences", "bachelor", "3-4 years", "£24,534/year", "English", "Cambridge's flagship science program covering physics, chemistry, biology, and more."),
      prog("cb2", "Computer Science", "bachelor", "3-4 years", "£24,534/year", "English", "Theoretical and practical CS at the birthplace of modern computing."),
    ],
    masterPrograms: [
      prog("cm1", "MPhil in Advanced Computer Science", "master", "1 year", "£35,994", "English", "Advanced research-oriented CS master's program."),
    ],
    phdPrograms: [
      prog("cp1", "PhD in Engineering", "phd", "3-4 years", "Fully funded for many programs", "English", "Doctoral research across all engineering disciplines."),
    ],
    videos: [
      vid("cv1", "Cambridge Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1591291621164-2c6367723315?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("cr1", "Sophie Martin", "https://i.pravatar.cc/150?img=28", 5, "2025-06", "Cambridge's supervision system gives you one-on-one attention from world experts. Incredible experience.", "Natural Sciences"),
    ],
    posts: [
      post("cpa1", "https://images.unsplash.com/photo-1591291621164-2c6367723315?w=800&h=600&fit=crop", "sophie_cam", "u-sophie", "🇬🇧", "United Kingdom", "Cambridge", "Punting on the River Cam 🚣‍♀️ Cambridge tradition!", 3892, 167),
    ],
    employmentRate: 93,
    livingCost: "£1,400-2,000/month",
    housingAvailable: true,
  },
  {
    id: "toronto",
    name: "University of Toronto",
    country: "Canada",
    flag: "🇨🇦",
    city: "Toronto",
    continent: "North America",
    latitude: 43.6629,
    longitude: -79.3957,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "The University of Toronto is a public research university in Toronto, Ontario, Canada. It is Canada's top university and consistently ranks among the world's best.",
    shortDescription: "Canada's premier research university.",
    qsRanking: 25,
    worldRanking: 18,
    tuition: "C$59,320/year (international)",
    tuitionNumeric: 43000,
    scholarship: "Lester B. Pearson Scholarship, President's Scholars of Excellence",
    hasScholarship: true,
    deadline: "January 12, 2026",
    applicationFee: "C$180",
    website: "https://www.utoronto.ca",
    admissionLink: "https://future.utoronto.ca",
    officialApplicationLink: "https://future.utoronto.ca/apply",
    acceptanceRate: 43,
    campusSize: "180 acres (St. George campus)",
    studentsCount: 97000,
    programsCount: 700,
    email: "future.utoronto@utoronto.ca",
    phone: "+1-416-978-2190",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/UofT" },
    ],
    type: "public",
    ieltsRequirement: "6.5+",
    toeflRequirement: "100+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "English",
    nearbyCity: "Toronto",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("tb1", "Computer Science", "bachelor", "4 years", "C$59,320/year", "English", "Top-ranked CS program with co-op opportunities at major tech companies."),
      prog("tb2", "Engineering Science", "bachelor", "4 years", "C$59,320/year", "English", "Elite engineering program with strong research focus."),
    ],
    masterPrograms: [
      prog("tm1", "MSc in AI", "master", "2 years", "C$32,000/year", "English", "Specialized AI master's with the Vector Institute connection."),
    ],
    phdPrograms: [
      prog("tp1", "PhD in Computer Science", "phd", "4-5 years", "Fully funded", "English", "Research-focused PhD with funding for admitted students."),
    ],
    videos: [
      vid("tv1", "UofT Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("tr1", "Liam O'Brien", "https://i.pravatar.cc/150?img=12", 5, "2025-05", "UofT's CS program is rigorous but the connections to Toronto's tech scene are invaluable.", "Computer Science"),
    ],
    posts: [
      post("tpa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "liam_uoft", "u-liam", "🇨🇦", "Canada", "Toronto", "Convocation Hall at UofT 🎓 So proud to be part of this community!", 2156, 89),
    ],
    employmentRate: 91,
    livingCost: "C$2,000-3,000/month",
    housingAvailable: true,
  },
  {
    id: "eth-zurich",
    name: "ETH Zurich",
    country: "Switzerland",
    flag: "🇨🇭",
    city: "Zurich",
    continent: "Europe",
    latitude: 47.3769,
    longitude: 8.5417,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "ETH Zurich is a public research university in Zurich, Switzerland. Founded in 1855, it is one of the world's leading universities in science and technology, with 21 Nobel laureates among its alumni.",
    shortDescription: "Swiss excellence in science and engineering.",
    qsRanking: 7,
    worldRanking: 9,
    tuition: "CHF 1,460/year (all students)",
    tuitionNumeric: 1660,
    scholarship: "Excellence Scholarship & Opportunity Programme (ESOP)",
    hasScholarship: true,
    deadline: "December 15, 2025",
    applicationFee: "CHF 150",
    website: "https://ethz.ch",
    admissionLink: "https://ethz.ch/en/studies.html",
    officialApplicationLink: "https://ethz.ch/en/studies/admissions/bachelor.html",
    acceptanceRate: 27,
    campusSize: "Multiple campuses in Zurich",
    studentsCount: 22000,
    programsCount: 60,
    email: "admissions@ethz.ch",
    phone: "+41-44-632-11-11",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/ETH Zurich" },
    ],
    type: "public",
    ieltsRequirement: "7.0+",
    toeflRequirement: "100+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "German/English",
    nearbyCity: "Zurich",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("eb1", "Mechanical Engineering", "bachelor", "3 years", "CHF 1,460/year", "German", "World-class engineering program taught primarily in German."),
      prog("eb2", "Computer Science", "bachelor", "3 years", "CHF 1,460/year", "German/English", "Strong theoretical and practical CS foundations."),
    ],
    masterPrograms: [
      prog("em1", "MSc in Computer Science", "master", "1.5-2 years", "CHF 1,460/year", "English", "All-English master's program with research focus."),
    ],
    phdPrograms: [
      prog("ep1", "PhD in Robotics", "phd", "4-5 years", "Fully funded (salary position)", "English", "PhD as a paid employee — Swiss salary standards."),
    ],
    videos: [
      vid("ev1", "ETH Zurich Campus", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("er1", "Hans Mueller", "https://i.pravatar.cc/150?img=14", 5, "2025-06", "ETH Zurich offers world-class education at an incredibly low tuition. The research quality is outstanding.", "Mechanical Engineering"),
    ],
    posts: [
      post("epa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "hans_eth", "u-hans", "🇨🇭", "Switzerland", "Zurich", "Research day at ETH Zurich 🔬 The labs here are incredible!", 1890, 56),
    ],
    employmentRate: 94,
    livingCost: "CHF 2,000-2,800/month",
    housingAvailable: true,
  },
  {
    id: "nus",
    name: "National University of Singapore",
    country: "Singapore",
    flag: "🇸🇬",
    city: "Singapore",
    continent: "Asia",
    latitude: 1.2966,
    longitude: 103.7764,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "The National University of Singapore (NUS) is the national research university of Singapore. Founded in 1905, it is the oldest autonomous university in the country and Asia's top university.",
    shortDescription: "Asia's #1 university for research and innovation.",
    qsRanking: 8,
    worldRanking: 11,
    tuition: "S$38,200/year (international)",
    tuitionNumeric: 28000,
    scholarship: "ASEAN Scholarship, NUS Merit Scholarship, ASEAN+ Scholarship",
    hasScholarship: true,
    deadline: "February 28, 2026",
    applicationFee: "S$20",
    website: "https://www.nus.edu.sg",
    admissionLink: "https://www.nus.edu.sg/admissions",
    officialApplicationLink: "https://www.nus.edu.sg/admissions/undergraduate",
    acceptanceRate: 5,
    campusSize: "150 acres",
    studentsCount: 43000,
    programsCount: 100,
    email: "admissions@nus.edu.sg",
    phone: "+65-6516-6666",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/NUSingapore" },
    ],
    type: "public",
    ieltsRequirement: "6.5+",
    toeflRequirement: "92+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "English",
    nearbyCity: "Singapore",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("nb1", "Computer Science", "bachelor", "4 years", "S$38,200/year", "English", "NUS CS is ranked among the world's top CS programs with strong industry connections."),
      prog("nb2", "Business Administration", "bachelor", "3-4 years", "S$38,200/year", "English", "NUS Business School — Asia's top business education."),
    ],
    masterPrograms: [
      prog("nm1", "MSc in Data Science", "master", "1.5 years", "S$48,000", "English", "Advanced data science with ML and big data focus."),
    ],
    phdPrograms: [
      prog("np1", "PhD in Computer Science", "phd", "4-5 years", "Fully funded with scholarship", "English", "Research PhD with full funding for top candidates."),
    ],
    videos: [
      vid("nv1", "NUS Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("nr1", "Wei Lin", "https://i.pravatar.cc/150?img=35", 5, "2025-05", "NUS provides an incredible bridge between East and West. The global exchange programs are fantastic!", "Business"),
    ],
    posts: [
      post("npa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "wei_nus", "u-wei", "🇸🇬", "Singapore", "Singapore", "NUS University Town — the best campus facilities in Asia! 🏫", 2456, 78),
    ],
    employmentRate: 93,
    livingCost: "S$1,500-2,500/month",
    housingAvailable: true,
  },
  {
    id: "seoul-national",
    name: "Seoul National University",
    country: "South Korea",
    flag: "🇰🇷",
    city: "Seoul",
    continent: "Asia",
    latitude: 37.4602,
    longitude: 126.9516,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "Seoul National University (SNU) is a national public research university in Seoul, South Korea. Founded in 1946, it is the most prestigious university in South Korea.",
    shortDescription: "South Korea's most prestigious university.",
    qsRanking: 31,
    worldRanking: 28,
    tuition: "₩5,588,000/year (international)",
    tuitionNumeric: 4200,
    scholarship: "Global Korea Scholarship, SNU Honors Scholarship",
    hasScholarship: true,
    deadline: "March 31, 2026",
    applicationFee: "₩100,000",
    website: "https://www.snu.ac.kr",
    admissionLink: "https://admission.snu.ac.kr",
    officialApplicationLink: "https://admission.snu.ac.kr/undergraduate",
    acceptanceRate: 15,
    campusSize: "300 acres (Gwanak campus)",
    studentsCount: 28000,
    programsCount: 83,
    email: "admission@snu.ac.kr",
    phone: "+82-2-880-8000",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/snu_ac_kr" },
    ],
    type: "public",
    ieltsRequirement: "6.5+",
    toeflRequirement: "80+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "Korean/English",
    nearbyCity: "Seoul",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("kb1", "Electrical & Computer Engineering", "bachelor", "4 years", "₩5,588,000/year", "Korean/English", "Korea's top engineering program with Samsung and LG connections."),
    ],
    masterPrograms: [
      prog("km1", "MSc in Engineering", "master", "2 years", "₩5,588,000/year", "Korean/English", "Advanced engineering research master's."),
    ],
    phdPrograms: [
      prog("kp1", "PhD in Engineering", "phd", "4 years", "Fully funded for many programs", "Korean/English", "Doctoral research with BK21+ funding."),
    ],
    videos: [
      vid("kv1", "SNU Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("kr1", "Min-jun Park", "https://i.pravatar.cc/150?img=45", 5, "2025-06", "SNU is the gateway to Korea's top companies. The campus on Gwanak Mountain is beautiful.", "Engineering"),
    ],
    posts: [
      post("kpa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "minjun_snu", "u-minjun", "🇰🇷", "South Korea", "Seoul", "Cherry blossoms at SNU 🌸 Spring in Seoul is magical!", 3104, 112),
    ],
    employmentRate: 89,
    livingCost: "₩1,000,000-1,500,000/month",
    housingAvailable: true,
  },
  {
    id: "tokyo",
    name: "University of Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    city: "Tokyo",
    continent: "Asia",
    latitude: 35.7128,
    longitude: 139.7612,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "The University of Tokyo, also known as Todai, is a public research university in Bunkyō, Tokyo, Japan. Founded in 1877, it is Japan's most prestigious university.",
    shortDescription: "Japan's most prestigious university, Todai.",
    qsRanking: 32,
    worldRanking: 24,
    tuition: "¥535,800/year",
    tuitionNumeric: 3600,
    scholarship: "MEXT Scholarship, University Recommendation Scholarship",
    hasScholarship: true,
    deadline: "February 25, 2026",
    applicationFee: "¥17,000",
    website: "https://www.u-tokyo.ac.jp",
    admissionLink: "https://www.u-tokyo.ac.jp/en/admissions",
    officialApplicationLink: "https://www.u-tokyo.ac.jp/en/admissions/undergraduate",
    acceptanceRate: 20,
    campusSize: "Multiple campuses (Hongo, Komaba, Kashiwa)",
    studentsCount: 28000,
    programsCount: 90,
    email: "admissions@u-tokyo.ac.jp",
    phone: "+81-3-3812-2111",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/UTokyo_News" },
    ],
    type: "public",
    ieltsRequirement: "6.0+",
    toeflRequirement: "80+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "Japanese/English",
    nearbyCity: "Tokyo",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("jb1", "Engineering", "bachelor", "4 years", "¥535,800/year", "Japanese", "Top engineering program with PEAK English-language option."),
      prog("jb2", "Liberal Arts (PEAK)", "bachelor", "4 years", "¥535,800/year", "English", "English-taught liberal arts program for international students."),
    ],
    masterPrograms: [
      prog("jm1", "Master of Engineering", "master", "2 years", "¥535,800/year", "Japanese/English", "Advanced engineering with research focus."),
    ],
    phdPrograms: [
      prog("jp1", "PhD in Engineering", "phd", "3 years", "Fully funded for MEXT scholars", "Japanese/English", "Doctoral research with government scholarship available."),
    ],
    videos: [
      vid("jv1", "Todai Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("jr1", "Yuki Tanaka", "https://i.pravatar.cc/150?img=50", 5, "2025-05", "Todai is Japan's gateway to excellence. The academic tradition and rigor are remarkable.", "Engineering"),
    ],
    posts: [
      post("jpa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "yuki_todai", "u-yuki", "🇯🇵", "Japan", "Tokyo", "The Sanshiro Pond at Todai 🏯 So peaceful between classes!", 1678, 45),
    ],
    employmentRate: 92,
    livingCost: "¥150,000-200,000/month",
    housingAvailable: true,
  },
  {
    id: "tsinghua",
    name: "Tsinghua University",
    country: "China",
    flag: "🇨🇳",
    city: "Beijing",
    continent: "Asia",
    latitude: 40.0086,
    longitude: 116.3226,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "Tsinghua University is a major public research university in Beijing, China. It is a member of the C9 League of Chinese universities and is consistently ranked as one of the top universities in the world.",
    shortDescription: "China's MIT — the top engineering university in China.",
    qsRanking: 20,
    worldRanking: 14,
    tuition: "¥30,000/year (international)",
    tuitionNumeric: 4200,
    scholarship: "Chinese Government Scholarship, Tsinghua Scholarship",
    hasScholarship: true,
    deadline: "March 15, 2026",
    applicationFee: "¥800",
    website: "https://www.tsinghua.edu.cn",
    admissionLink: "https://www.tsinghua.edu.cn/en/admissions",
    officialApplicationLink: "https://www.tsinghua.edu.cn/en/admissions/undergraduate",
    acceptanceRate: 2,
    campusSize: "470 acres",
    studentsCount: 50000,
    programsCount: 80,
    email: "admission@tsinghua.edu.cn",
    phone: "+86-10-6278-4456",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/TsinghuaUniv" },
    ],
    type: "public",
    ieltsRequirement: "6.5+",
    toeflRequirement: "85+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "Chinese/English",
    nearbyCity: "Beijing",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("tb1", "Computer Science & Technology", "bachelor", "4 years", "¥30,000/year", "Chinese/English", "China's top CS program with Yao Class for elite students."),
      prog("tb2", "Electronic Engineering", "bachelor", "4 years", "¥30,000/year", "Chinese", "Cutting-edge EE program with strong industry ties."),
    ],
    masterPrograms: [
      prog("tm1", "MSc in CS (English-taught)", "master", "2 years", "¥39,000/year", "English", "Fully English-taught master's for international students."),
    ],
    phdPrograms: [
      prog("tp1", "PhD in CS", "phd", "4-5 years", "Fully funded for CGS scholars", "Chinese/English", "Doctoral research with Chinese Government Scholarship."),
    ],
    videos: [
      vid("tv1", "Tsinghua Campus", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("tr1", "Li Wei", "https://i.pravatar.cc/150?img=55", 5, "2025-06", "Tsinghua's Yao Class is legendary. The competition is fierce but the education is world-class.", "Computer Science"),
    ],
    posts: [
      post("tpa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "liwei_thu", "u-liwei", "🇨🇳", "China", "Beijing", "Tsinghua campus in autumn 🍂 The historic buildings are stunning!", 2345, 67),
    ],
    employmentRate: 95,
    livingCost: "¥5,000-8,000/month",
    housingAvailable: true,
  },
  {
    id: "peking",
    name: "Peking University",
    country: "China",
    flag: "🇨🇳",
    city: "Beijing",
    continent: "Asia",
    latitude: 39.9921,
    longitude: 116.3057,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "Peking University is a major public research university in Beijing, China, and a member of the C9 League. Founded in 1898, it is one of the most prestigious universities in China.",
    shortDescription: "China's most comprehensive and prestigious university.",
    qsRanking: 14,
    worldRanking: 12,
    tuition: "¥30,000/year (international)",
    tuitionNumeric: 4200,
    scholarship: "Chinese Government Scholarship, Peking University Scholarship",
    hasScholarship: true,
    deadline: "March 20, 2026",
    applicationFee: "¥800",
    website: "https://www.pku.edu.cn",
    admissionLink: "https://admission.pku.edu.cn",
    officialApplicationLink: "https://admission.pku.edu.cn/undergraduate",
    acceptanceRate: 1,
    campusSize: "580 acres",
    studentsCount: 45000,
    programsCount: 125,
    email: "admission@pku.edu.cn",
    phone: "+86-10-6275-1234",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/PekingUni" },
    ],
    type: "public",
    ieltsRequirement: "6.5+",
    toeflRequirement: "85+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "Chinese/English",
    nearbyCity: "Beijing",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("pb1", "Mathematics", "bachelor", "4 years", "¥30,000/year", "Chinese", "One of China's strongest math departments with the Beijing International Center for Mathematical Research."),
      prog("pb2", "International Relations", "bachelor", "4 years", "¥30,000/year", "Chinese/English", "Top IR program in China with global perspective."),
    ],
    masterPrograms: [
      prog("pm1", "MA in China Studies", "master", "2 years", "¥39,000/year", "English", "English-taught master's in China studies for international students."),
    ],
    phdPrograms: [
      prog("pp1", "PhD in Mathematics", "phd", "4-5 years", "Fully funded for CGS scholars", "Chinese/English", "World-class math research PhD."),
    ],
    videos: [
      vid("pv1", "PKU Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("pr1", "Zhang Lei", "https://i.pravatar.cc/150?img=60", 5, "2025-05", "PKU's Weiming Lake campus is breathtaking. The academic freedom and intellectual atmosphere are exceptional.", "Mathematics"),
    ],
    posts: [
      post("ppa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "zhanglei_pku", "u-zhanglei", "🇨🇳", "China", "Beijing", "Weiming Lake at PKU 📚 The most beautiful campus in China!", 1987, 54),
    ],
    employmentRate: 93,
    livingCost: "¥5,000-8,000/month",
    housingAvailable: true,
  },
  {
    id: "sorbonne",
    name: "Sorbonne University",
    country: "France",
    flag: "🇫🇷",
    city: "Paris",
    continent: "Europe",
    latitude: 48.8467,
    longitude: 2.3459,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "Sorbonne University is a public research university in Paris, France. Established in 2018 by the merger of Paris-Sorbonne University and Pierre and Marie Curie University, it continues the centuries-old Sorbonne tradition.",
    shortDescription: "Paris's iconic university with 800 years of history.",
    qsRanking: 59,
    worldRanking: 46,
    tuition: "€3,770/year (EU) / €9,570/year (non-EU)",
    tuitionNumeric: 10200,
    scholarship: "Eiffel Excellence Scholarship, French Government Scholarship",
    hasScholarship: true,
    deadline: "January 31, 2026",
    applicationFee: "€0 (via Campus France)",
    website: "https://www.sorbonne-universite.fr",
    admissionLink: "https://www.sorbonne-universite.fr/en/admissions",
    officialApplicationLink: "https://www.sorbonne-universite.fr/en/admissions/undergraduate",
    acceptanceRate: 12,
    campusSize: "Multiple campuses in Paris",
    studentsCount: 43000,
    programsCount: 200,
    email: "admissions@sorbonne-universite.fr",
    phone: "+33-1-44-27-44-27",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/Sorbonne_Univ" },
    ],
    type: "public",
    ieltsRequirement: "6.5+",
    toeflRequirement: "90+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "French/English",
    nearbyCity: "Paris",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("sb1", "Medicine", "bachelor", "6-9 years", "€9,570/year", "French", "France's top medical school with rigorous clinical training."),
      prog("sb2", "Mathematics & Computer Science", "bachelor", "3 years", "€9,570/year", "French/English", "Strong theoretical math and CS in the Latin Quarter."),
    ],
    masterPrograms: [
      prog("sm1", "MSc in Computer Science (English)", "master", "2 years", "€9,570/year", "English", "English-taught CS master's with research focus."),
    ],
    phdPrograms: [
      prog("sp1", "PhD in Physics", "phd", "3 years", "Fully funded for many programs", "French/English", "Doctoral research at historic physics laboratories."),
    ],
    videos: [
      vid("sv1", "Sorbonne Campus", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("sr1", "Marie Dubois", "https://i.pravatar.cc/150?img=22", 5, "2025-06", "Studying at the Sorbonne is like living in history. The Latin Quarter is an intellectual paradise.", "Mathematics"),
    ],
    posts: [
      post("spa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "marie_sorb", "u-marie", "🇫🇷", "France", "Paris", "The Sorbonne amphitheater 📖 800 years of intellectual tradition!", 2890, 102),
    ],
    employmentRate: 88,
    livingCost: "€1,200-1,800/month",
    housingAvailable: true,
  },
  {
    id: "melbourne",
    name: "University of Melbourne",
    country: "Australia",
    flag: "🇦🇺",
    city: "Melbourne",
    continent: "Oceania",
    latitude: -37.7963,
    longitude: 144.9614,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "The University of Melbourne is a public research university in Melbourne, Australia. Founded in 1853, it is Australia's second-oldest university and the oldest in Victoria.",
    shortDescription: "Australia's #1 ranked university.",
    qsRanking: 13,
    worldRanking: 33,
    tuition: "A$45,000-55,000/year (international)",
    tuitionNumeric: 35000,
    scholarship: "Melbourne International Scholarship, Graduate Research Scholarship",
    hasScholarship: true,
    deadline: "January 31, 2026",
    applicationFee: "A$100",
    website: "https://www.unimelb.edu.au",
    admissionLink: "https://study.unimelb.edu.au",
    officialApplicationLink: "https://study.unimelb.edu.au/how-to-apply",
    acceptanceRate: 70,
    campusSize: "260 acres (Parkville campus)",
    studentsCount: 52000,
    programsCount: 150,
    email: "study@unimelb.edu.au",
    phone: "+61-3-9035-5511",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/unimelb" },
    ],
    type: "public",
    ieltsRequirement: "6.5+",
    toeflRequirement: "79+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "English",
    nearbyCity: "Melbourne",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("mb1", "Melbourne Model - Science", "bachelor", "3 years", "A$45,000/year", "English", "Unique Melbourne Model — broad first degree then specialized master's."),
      prog("mb2", "Melbourne Model - Arts", "bachelor", "3 years", "A$45,000/year", "English", "Flexible arts degree with global exchange options."),
    ],
    masterPrograms: [
      prog("mm1", "Master of Engineering", "master", "2-3 years", "A$55,000/year", "English", "Professional engineering master's with industry placement."),
    ],
    phdPrograms: [
      prog("mp1", "PhD in CS", "phd", "3-4 years", "Fully funded (RTP scholarship)", "English", "Research PhD with Research Training Program funding."),
    ],
    videos: [
      vid("mv1", "Melbourne Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("mr1", "Olivia Smith", "https://i.pravatar.cc/150?img=18", 5, "2025-05", "The Melbourne Model gives you so much flexibility. I studied science then specialized in data science for my master's.", "Science"),
    ],
    posts: [
      post("mpa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "olivia_unimelb", "u-olivia", "🇦🇺", "Australia", "Melbourne", "South Lawn at UniMelb 🌿 Best study spot on campus!", 1456, 43),
    ],
    employmentRate: 90,
    livingCost: "A$2,000-2,800/month",
    housingAvailable: true,
  },
  {
    id: "sydney",
    name: "University of Sydney",
    country: "Australia",
    flag: "🇦🇺",
    city: "Sydney",
    continent: "Oceania",
    latitude: -33.8882,
    longitude: 151.1873,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "The University of Sydney (USyd) is a public research university in Sydney, Australia. Founded in 1850, it is Australia's first university and one of the world's top universities.",
    shortDescription: "Australia's oldest university in the heart of Sydney.",
    qsRanking: 19,
    worldRanking: 41,
    tuition: "A$50,000-58,000/year (international)",
    tuitionNumeric: 38000,
    scholarship: "Sydney Scholars Scholarship, International Scholarship",
    hasScholarship: true,
    deadline: "January 15, 2026",
    applicationFee: "A$125",
    website: "https://www.sydney.edu.au",
    admissionLink: "https://www.sydney.edu.au/study",
    officialApplicationLink: "https://www.sydney.edu.au/study/how-to-apply",
    acceptanceRate: 68,
    campusSize: "178 acres (Camperdown/Darlington campus)",
    studentsCount: 70000,
    programsCount: 250,
    email: "admissions@sydney.edu.au",
    phone: "+61-2-8627-1444",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/Sydney_Uni" },
    ],
    type: "public",
    ieltsRequirement: "7.0+",
    toeflRequirement: "96+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "English",
    nearbyCity: "Sydney",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("sb1", "Bachelor of Science", "bachelor", "3-4 years", "A$50,000/year", "English", "Comprehensive science degree with multiple majors."),
      prog("sb2", "Bachelor of Arts", "bachelor", "3 years", "A$50,000/year", "English", "Flexible arts degree with 40+ majors available."),
    ],
    masterPrograms: [
      prog("sm1", "Master of Data Science", "master", "1-2 years", "A$55,000/year", "English", "Professional data science master's with ML and big data focus."),
    ],
    phdPrograms: [
      prog("sp1", "PhD in Engineering", "phd", "3-4 years", "Fully funded (RTP)", "English", "Doctoral research with government RTP scholarship."),
    ],
    videos: [
      vid("sv1", "USyd Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("sr1", "Jack Thompson", "https://i.pravatar.cc/150?img=16", 5, "2025-06", "The Quadrangle is iconic. Studying at USyd feels like being at Hogwarts in Australia!", "Arts"),
    ],
    posts: [
      post("spa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "jack_usyd", "u-jack", "🇦🇺", "Australia", "Sydney", "The Quadrangle at USyd 🏛️ Harry Potter vibes in Sydney!", 1789, 61),
    ],
    employmentRate: 89,
    livingCost: "A$2,200-3,200/month",
    housingAvailable: true,
  },
  {
    id: "tum",
    name: "Technical University of Munich",
    country: "Germany",
    flag: "🇩🇪",
    city: "Munich",
    continent: "Europe",
    latitude: 48.1471,
    longitude: 11.5674,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "The Technical University of Munich (TUM) is a public research university in Munich, Germany. It is a member of TU9, an incorporated society of the largest and most notable German institutes of technology.",
    shortDescription: "Germany's #1 technical university.",
    qsRanking: 28,
    worldRanking: 37,
    tuition: "€0-144/year (no tuition for EU; semester fee only)",
    tuitionNumeric: 144,
    scholarship: "Deutschlandstipendium, DAAD Scholarships",
    hasScholarship: true,
    deadline: "January 15, 2026",
    applicationFee: "€0",
    website: "https://www.tum.de",
    admissionLink: "https://www.tum.de/en/studies",
    officialApplicationLink: "https://www.tum.de/en/studies/application",
    acceptanceRate: 10,
    campusSize: "Multiple campuses in Munich",
    studentsCount: 48000,
    programsCount: 150,
    email: "admissions@tum.de",
    phone: "+49-89-289-01",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/TUM" },
    ],
    type: "public",
    ieltsRequirement: "6.5+",
    toeflRequirement: "88+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "German/English",
    nearbyCity: "Munich",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("tb1", "Informatics (Computer Science)", "bachelor", "3 years", "€144/year", "German/English", "TUM's flagship CS program — almost free for all students."),
      prog("tb2", "Mechanical Engineering", "bachelor", "3 years", "€144/year", "German", "Germany's top mechanical engineering program."),
    ],
    masterPrograms: [
      prog("tm1", "MSc in Informatics (English)", "master", "2 years", "€144/year", "English", "Fully English-taught CS master's — essentially free!"),
      prog("tm2", "MSc in Aerospace", "master", "2 years", "€144/year", "English", "Cutting-edge aerospace engineering master's."),
    ],
    phdPrograms: [
      prog("tp1", "PhD in Informatics", "phd", "3-5 years", "Fully funded (paid position)", "English", "PhD as a paid employee — German standard for doctoral researchers."),
    ],
    videos: [
      vid("tv1", "TUM Campus Tour", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("tr1", "Lukas Schmidt", "https://i.pravatar.cc/150?img=13", 5, "2025-06", "TUM offers world-class education for almost no tuition. Munich's tech scene is booming with BMW, Siemens, and startups.", "Informatics"),
    ],
    posts: [
      post("tpa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "lukas_tum", "u-lukas", "🇩🇪", "Germany", "Munich", "TUM Garching campus 🔬 The research facilities are amazing and it's almost free!", 2678, 87),
    ],
    employmentRate: 93,
    livingCost: "€1,000-1,500/month",
    housingAvailable: true,
  },
  {
    id: "kaist",
    name: "Korea Advanced Institute of Science & Technology",
    country: "South Korea",
    flag: "🇰🇷",
    city: "Daejeon",
    continent: "Asia",
    latitude: 36.3719,
    longitude: 127.3594,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "KAIST is a national research university located in Daejeon, South Korea. Established in 1971, KAIST was the first research-oriented science and engineering institution in South Korea.",
    shortDescription: "Korea's MIT for science and technology.",
    qsRanking: 47,
    worldRanking: 56,
    tuition: "₩37,800,000/year (international)",
    tuitionNumeric: 28000,
    scholarship: "KAIST International Student Scholarship (full tuition + stipend)",
    hasScholarship: true,
    deadline: "January 10, 2026",
    applicationFee: "₩80,000",
    website: "https://www.kaist.ac.kr",
    admissionLink: "https://admission.kaist.ac.kr",
    officialApplicationLink: "https://admission.kaist.ac.kr/undergraduate",
    acceptanceRate: 15,
    campusSize: "330 acres",
    studentsCount: 10000,
    programsCount: 40,
    email: "admission@kaist.ac.kr",
    phone: "+82-42-350-2114",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/KAISTPR" },
    ],
    type: "public",
    ieltsRequirement: "6.5+",
    toeflRequirement: "83+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "English",
    nearbyCity: "Daejeon",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("kb1", "Electrical Engineering", "bachelor", "4 years", "₩37,800,000/year", "English", "All-English EE program — KAIST is Korea's top STEM university."),
      prog("kb2", "Computer Science", "bachelor", "4 years", "₩37,800,000/year", "English", "Research-intensive CS with Samsung and LG partnerships."),
    ],
    masterPrograms: [
      prog("km1", "MS in AI", "master", "2 years", "₩45,000,000/year", "English", "Graduate AI program with full funding for top students."),
    ],
    phdPrograms: [
      prog("kp1", "PhD in EE", "phd", "4 years", "Fully funded for most students", "English", "PhD with guaranteed funding through KAIST scholarship."),
    ],
    videos: [
      vid("kv1", "KAIST Campus", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("kr1", "Ji-hoon Lee", "https://i.pravatar.cc/150?img=48", 5, "2025-06", "KAIST is intense but the research environment is world-class. Full scholarship for international students is a huge plus.", "Computer Science"),
    ],
    posts: [
      post("kpa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "jihoon_kaist", "u-jihoon", "🇰🇷", "South Korea", "Daejeon", "Robotics lab at KAIST 🤖 The innovation here is insane!", 1342, 38),
    ],
    employmentRate: 91,
    livingCost: "₩800,000-1,200,000/month",
    housingAvailable: true,
  },
  {
    id: "epfl",
    name: "École Polytechnique Fédérale de Lausanne",
    country: "Switzerland",
    flag: "🇨🇭",
    city: "Lausanne",
    continent: "Europe",
    latitude: 46.5197,
    longitude: 6.5665,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "EPFL is a public research university in Lausanne, Switzerland. It is one of the two Swiss Federal Institutes of Technology, specializing in natural sciences and engineering.",
    shortDescription: "Switzerland's premier institute of technology.",
    qsRanking: 36,
    worldRanking: 38,
    tuition: "CHF 1,260/year (all students)",
    tuitionNumeric: 1430,
    scholarship: "Excellence Fellowship, EPFL Master Scholarship",
    hasScholarship: true,
    deadline: "January 15, 2026",
    applicationFee: "CHF 150",
    website: "https://www.epfl.ch",
    admissionLink: "https://www.epfl.ch/education",
    officialApplicationLink: "https://www.epfl.ch/education/admissions",
    acceptanceRate: 20,
    campusSize: "136 acres",
    studentsCount: 11000,
    programsCount: 30,
    email: "admissions@epfl.ch",
    phone: "+41-21-693-11-11",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/epfl_en" },
    ],
    type: "public",
    ieltsRequirement: "7.0+",
    toeflRequirement: "100+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "French/English",
    nearbyCity: "Lausanne",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("eb1", "Computer Science", "bachelor", "3 years", "CHF 1,260/year", "French", "CS taught in French at bachelor level — very affordable!"),
    ],
    masterPrograms: [
      prog("em1", "MSc in CS (English)", "master", "2 years", "CHF 1,260/year", "English", "Fully English master's program — almost free for all students."),
      prog("em2", "MSc in Data Science", "master", "2 years", "CHF 1,260/year", "English", "Specialized data science master's with ML focus."),
    ],
    phdPrograms: [
      prog("ep1", "PhD in CS", "phd", "4-5 years", "Fully funded (salary position)", "English", "PhD as paid employee — Swiss doctoral salary."),
    ],
    videos: [
      vid("ev1", "EPFL Campus", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("er1", "Anna Rossi", "https://i.pravatar.cc/150?img=24", 5, "2025-05", "EPFL's campus on Lake Geneva is stunning. The education quality rivals ETH at an incredibly low cost.", "Computer Science"),
    ],
    posts: [
      post("epa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "anna_epfl", "u-anna", "🇨🇭", "Switzerland", "Lausanne", "EPFL Rolex Learning Center 📐 The architecture is as innovative as the research!", 1567, 49),
    ],
    employmentRate: 92,
    livingCost: "CHF 1,800-2,500/month",
    housingAvailable: true,
  },
  {
    id: "bocconi",
    name: "Bocconi University",
    country: "Italy",
    flag: "🇮🇹",
    city: "Milan",
    continent: "Europe",
    latitude: 45.4484,
    longitude: 9.1869,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "Bocconi University is a private university in Milan, Italy. It is consistently ranked as the best university in Italy for economics and business, and among the top in Europe.",
    shortDescription: "Europe's leading business and economics university.",
    qsRanking: 46,
    worldRanking: 17,
    tuition: "€13,000-16,000/year (international)",
    tuitionNumeric: 14500,
    scholarship: "Bocconi Merit Award, Bocconi International Award",
    hasScholarship: true,
    deadline: "January 25, 2026",
    applicationFee: "€100",
    website: "https://www.unibocconi.eu",
    admissionLink: "https://www.unibocconi.eu/admissions",
    officialApplicationLink: "https://www.unibocconi.eu/admissions/undergraduate",
    acceptanceRate: 30,
    campusSize: "Urban campus in central Milan",
    studentsCount: 15000,
    programsCount: 40,
    email: "admissions@unibocconi.it",
    phone: "+39-02-5836-3010",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/unibocconi" },
    ],
    type: "private",
    ieltsRequirement: "6.5+",
    toeflRequirement: "85+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "English",
    nearbyCity: "Milan",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("bb1", "International Economics & Management", "bachelor", "3 years", "€13,000/year", "English", "Fully English-taught business program in the heart of Milan."),
      prog("bb2", "Economic & Social Sciences", "bachelor", "3 years", "€13,000/year", "English", "Quantitative economics with social science perspective."),
    ],
    masterPrograms: [
      prog("bm1", "MSc in Finance", "master", "2 years", "€16,000/year", "English", "Top-ranked finance master's — among Europe's best."),
    ],
    phdPrograms: [
      prog("bp1", "PhD in Economics", "phd", "4-5 years", "Fully funded", "English", "Research-intensive economics PhD with full funding."),
    ],
    videos: [
      vid("bv1", "Bocconi Campus", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("br1", "Giulia Bianchi", "https://i.pravatar.cc/150?img=21", 5, "2025-06", "Bocconi opened doors to investment banking in London. The network and education quality are exceptional.", "Finance"),
    ],
    posts: [
      post("bpa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "giulia_boc", "u-giulia", "🇮🇹", "Italy", "Milan", "Bocconi's new campus by Grafton Architects 🏛️ Award-winning architecture!", 1234, 42),
    ],
    employmentRate: 90,
    livingCost: "€1,200-1,800/month",
    housingAvailable: true,
  },
  {
    id: "polimi",
    name: "Politecnico di Milano",
    country: "Italy",
    flag: "🇮🇹",
    city: "Milan",
    continent: "Europe",
    latitude: 45.4773,
    longitude: 9.2364,
    logo: "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop",
    ],
    description: "Politecnico di Milano (PoliMi) is the largest technical university in Italy, offering undergraduate, graduate and higher education courses in engineering, architecture and design.",
    shortDescription: "Italy's leading engineering and architecture university.",
    qsRanking: 123,
    worldRanking: 123,
    tuition: "€3,900-5,000/year (international)",
    tuitionNumeric: 4500,
    scholarship: "DSU Regional Scholarship, Polimi International Scholarships",
    hasScholarship: true,
    deadline: "January 20, 2026",
    applicationFee: "€50",
    website: "https://www.polimi.it",
    admissionLink: "https://www.polimi.it/en/admissions",
    officialApplicationLink: "https://www.polimi.it/en/admissions/undergraduate",
    acceptanceRate: 35,
    campusSize: "Multiple campuses (Milan + regional)",
    studentsCount: 47000,
    programsCount: 70,
    email: "admissions@polimi.it",
    phone: "+39-02-2399-1",
    socialLinks: [
      { platform: "twitter", url: "https://twitter.com/polimi" },
    ],
    type: "public",
    ieltsRequirement: "6.0+",
    toeflRequirement: "78+",
    satRequirement: "Not required",
    actRequirement: "Not required",
    language: "Italian/English",
    nearbyCity: "Milan",
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog("pb1", "Mechanical Engineering", "bachelor", "3 years", "€3,900/year", "Italian/English", "Italy's top mechanical engineering with industry connections to Ferrari and Lamborghini."),
    ],
    masterPrograms: [
      prog("pm1", "MSc in Computer Engineering (English)", "master", "2 years", "€5,000/year", "English", "Fully English-taught engineering master's at low Italian tuition."),
      prog("pm2", "MSc in Architecture", "master", "2 years", "€5,000/year", "English", "World-renowned architecture program in the design capital of Italy."),
    ],
    phdPrograms: [
      prog("pp1", "PhD in Engineering", "phd", "3 years", "Fully funded", "English", "Doctoral research with Italian PhD scholarships."),
    ],
    videos: [
      vid("pv1", "PoliMi Campus", "campus-tour", 0, "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=500&fit=crop"),
    ],
    reviews: [
      rev("pr1", "Marco Ferrari", "https://i.pravatar.cc/150?img=17", 5, "2025-06", "PoliMi gives you top-quality engineering education at Italian prices. The design heritage is a bonus!", "Architecture"),
    ],
    posts: [
      post("ppa1", "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=800&h=600&fit=crop", "marco_polimi", "u-marco", "🇮🇹", "Italy", "Milan", "Architecture studio at PoliMi 📐 Design meets engineering!", 987, 31),
    ],
    employmentRate: 88,
    livingCost: "€1,000-1,500/month",
    housingAvailable: true,
  },
];

/* ── Helpers ────────────────────────────────────────────────────── */

/* Generate full University objects from compact seeds */
import { UNIVERSITY_SEEDS, type UniSeed } from "@/data/uniList";
import { WORLD_UNIVERSITY_SEEDS } from "@/data/uniWorld";

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=1200&h=600&fit=crop",
  "https://images.unsplash.com/photo-1573164407897-1c4b4b8e2e2e?w=1200&h=600&fit=crop",
  "https://images.unsplash.com/photo-1607233134-r5a9f4a8c8c0?w=1200&h=600&fit=crop",
  "https://images.unsplash.com/photo-1591291621164-2c6367723315?w=1200&h=600&fit=crop",
  "https://images.unsplash.com/photo-1577896851239-4194636f342e?w=1200&h=600&fit=crop",
  "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=1200&h=600&fit=crop",
];

function generateFromSeed(seed: UniSeed, index: number): University {
  const cover = COVER_IMAGES[index % COVER_IMAGES.length];
  const gallery = [cover, COVER_IMAGES[(index + 2) % COVER_IMAGES.length]];
  const logoUrl = "https://images.unsplash.com/photo-1562774011-d5a8a8c51e84?w=200&h=200&fit=crop";

  // Generate a plausible website URL from the university name
  const webSlug = seed.id.replace(/^w-/, "").replace(/-/g, "");
  const website = `https://www.${webSlug}.edu`;

  return {
    id: seed.id,
    name: seed.name,
    country: seed.country,
    flag: seed.flag,
    city: seed.city,
    continent: seed.continent,
    latitude: seed.lat,
    longitude: seed.lng,
    logo: logoUrl,
    coverImage: cover,
    gallery,
    description: `${seed.name} is a ${seed.type} university located in ${seed.city}, ${seed.country}. It offers ${seed.programsCount} programs and serves ${seed.studentsCount.toLocaleString()} students.`,
    shortDescription: `${seed.city}, ${seed.country} · QS #${seed.qsRanking}`,
    qsRanking: seed.qsRanking,
    worldRanking: seed.qsRanking + Math.floor(Math.random() * 20),
    tuition: seed.tuition,
    tuitionNumeric: seed.tuitionNumeric,
    scholarship: seed.hasScholarship ? "Merit and need-based scholarships available" : "Limited scholarships available",
    hasScholarship: seed.hasScholarship,
    deadline: seed.deadline,
    applicationFee: "$50-100",
    website,
    admissionLink: `${website}/admissions`,
    officialApplicationLink: `${website}/apply`,
    acceptanceRate: seed.acceptanceRate,
    campusSize: "Various campuses",
    studentsCount: seed.studentsCount,
    programsCount: seed.programsCount,
    email: `admissions@${seed.id}.edu`,
    phone: "+1-555-0100",
    socialLinks: [{ platform: "twitter", url: `https://twitter.com/${seed.id}` }],
    type: seed.type,
    ieltsRequirement: seed.ielts,
    toeflRequirement: seed.toefl,
    satRequirement: seed.sat,
    actRequirement: seed.act,
    language: seed.language,
    nearbyCity: seed.city,
    requiredDocuments: STANDARD_DOCS,
    bachelorPrograms: [
      prog(`${seed.id}-b1`, "Computer Science", "bachelor", "3-4 years", seed.tuition, seed.language.split("/")[0], "Comprehensive CS program."),
      prog(`${seed.id}-b2`, "Engineering", "bachelor", "3-4 years", seed.tuition, seed.language.split("/")[0], "Engineering program."),
    ],
    masterPrograms: [
      prog(`${seed.id}-m1`, "Master of Science", "master", "1-2 years", seed.tuition, "English", "Advanced master's program."),
    ],
    phdPrograms: [
      prog(`${seed.id}-p1`, "PhD Program", "phd", "3-5 years", "Funded for many programs", "English", "Research-focused doctoral program."),
    ],
    videos: [
      vid(`${seed.id}-v1`, `${seed.name} Campus Tour`, "campus-tour", index % 5, cover),
    ],
    reviews: [
      rev(`${seed.id}-r1`, "Student Reviewer", "https://i.pravatar.cc/150?img=10", 5, "2025-06", `Great experience at ${seed.name}!`, "General"),
    ],
    posts: [
      post(`${seed.id}-p1`, cover, "student", "u-student", seed.flag, seed.country, seed.city, `Life at ${seed.name}! 🎓`, 1000 + index * 10, 50 + index),
    ],
    employmentRate: seed.employmentRate,
    livingCost: seed.livingCost,
    housingAvailable: seed.housingAvailable,
  };
}

/* Merge detailed seed universities with generated ones from compact list + world dataset */
const DETAILED_IDS = new Set(BASE_UNIVERSITIES.map((u) => u.id));

// Combine compact seeds from uniList.ts + world seeds from uniWorld.ts, dedup by id
const ALL_SEEDS: UniSeed[] = [...UNIVERSITY_SEEDS, ...WORLD_UNIVERSITY_SEEDS];
const SEEN_IDS = new Set(DETAILED_IDS);
const UNIQUE_SEEDS = ALL_SEEDS.filter((seed) => {
  if (SEEN_IDS.has(seed.id)) return false;
  SEEN_IDS.add(seed.id);
  return true;
});

const generatedUniversities = UNIQUE_SEEDS.map((seed, i) => generateFromSeed(seed, i + 100));

/* Export the combined list as UNIVERSITIES (back-compat with all existing imports) */
export const UNIVERSITIES: University[] = [...BASE_UNIVERSITIES, ...generatedUniversities];
export const ALL_UNIVERSITIES = UNIVERSITIES;

/* Fast O(1) lookup map for getUniversity — critical with thousands of entries */
const UNIVERSITY_MAP = new Map<string, University>(UNIVERSITIES.map((u) => [u.id, u]));

export function getUniversity(id: string): University | undefined {
  return UNIVERSITY_MAP.get(id);
}

export function searchUniversities(query: string): University[] {
  const q = query.toLowerCase().trim();
  if (!q) return UNIVERSITIES;
  return UNIVERSITIES.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.country.toLowerCase().includes(q) ||
      u.city.toLowerCase().includes(q) ||
      u.continent.toLowerCase().includes(q) ||
      u.language.toLowerCase().includes(q) ||
      String(u.qsRanking).includes(q),
  );
}

export const UNIVERSITY_VIDEO_CATEGORIES = [
  { key: "campus-tour", emoji: "🏫", labelKey: "uni.video.campus-tour" },
  { key: "dormitory", emoji: "🛏️", labelKey: "uni.video.dormitory" },
  { key: "student-life", emoji: "🎉", labelKey: "uni.video.student-life" },
  { key: "graduation", emoji: "🎓", labelKey: "uni.video.graduation" },
  { key: "laboratories", emoji: "🔬", labelKey: "uni.video.laboratories" },
  { key: "library", emoji: "📚", labelKey: "uni.video.library" },
  { key: "sports", emoji: "⚽", labelKey: "uni.video.sports" },
  { key: "international", emoji: "🌍", labelKey: "uni.video.international" },
  { key: "research", emoji: "⚗️", labelKey: "uni.video.research" },
  { key: "events", emoji: "🎪", labelKey: "uni.video.events" },
] as const;
