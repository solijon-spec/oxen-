/* ------------------------------------------------------------------ */
/*  Demo users for messaging, profiles, and reporting                  */
/* ------------------------------------------------------------------ */

export interface DemoUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  avatarUrl: string;
  bio: string;
  country: string;
  city: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "prefer-not-say";
  isVerified: boolean;
  joinedDate: string;
}

export const CURRENT_USER_ID = "guest-explorer";

export const DEMO_USERS: DemoUser[] = [
  {
    id: "guest-explorer",
    name: "Guest Explorer",
    username: "guest_explorer",
    email: "explorer@oxen.travel",
    phone: "+1 415 555 0100",
    avatarUrl: "",
    bio: "Wanderlust-driven traveler exploring the world one country at a time. 47 countries and counting.",
    country: "United States",
    city: "San Francisco",
    dateOfBirth: "1995-06-15",
    gender: "prefer-not-say",
    isVerified: true,
    joinedDate: "2024-03-12",
  },
  {
    id: "u-sara",
    name: "Sara Lindqvist",
    username: "wanderlust_sara",
    email: "sara@example.com",
    phone: "+46 70 123 4567",
    avatarUrl: "https://i.pravatar.cc/300?img=12",
    bio: "Travel photographer capturing the world. Japan, Iceland, and New Zealand are home.",
    country: "Sweden",
    city: "Stockholm",
    dateOfBirth: "1992-09-22",
    gender: "female",
    isVerified: true,
    joinedDate: "2023-01-08",
  },
  {
    id: "u-max",
    name: "Max Chen",
    username: "nomad_max",
    email: "max@example.com",
    phone: "+1 212 555 0142",
    avatarUrl: "https://i.pravatar.cc/300?img=24",
    bio: "Digital nomad. 60 countries. Currently in Lisbon. Coffee + code + cultures.",
    country: "United States",
    city: "New York",
    dateOfBirth: "1989-03-10",
    gender: "male",
    isVerified: false,
    joinedDate: "2023-06-20",
  },
  {
    id: "u-dani",
    name: "Daniela Rossi",
    username: "travel_dani",
    email: "dani@example.com",
    phone: "+39 333 555 0188",
    avatarUrl: "https://i.pravatar.cc/300?img=33",
    bio: "Santorini sunset chaser. Mediterranean soul. Food and architecture lover.",
    country: "Italy",
    city: "Milan",
    dateOfBirth: "1994-11-30",
    gender: "female",
    isVerified: true,
    joinedDate: "2023-09-15",
  },
  {
    id: "u-kenji",
    name: "Kenji Tanaka",
    username: "explorer_kenji",
    email: "kenji@example.com",
    phone: "+81 90 5555 0123",
    avatarUrl: "https://i.pravatar.cc/300?img=45",
    bio: "Temple hunter in Southeast Asia. Street food is my love language.",
    country: "Japan",
    city: "Osaka",
    dateOfBirth: "1991-07-04",
    gender: "male",
    isVerified: false,
    joinedDate: "2024-01-10",
  },
  {
    id: "u-ana",
    name: "Ana Müller",
    username: "alpine_ana",
    email: "ana@example.com",
    phone: "+41 76 555 0199",
    avatarUrl: "https://i.pravatar.cc/300?img=15",
    bio: "Alpine enthusiast. Skiing in winter, hiking in summer. Switzerland is home.",
    country: "Switzerland",
    city: "Lucerne",
    dateOfBirth: "1993-12-18",
    gender: "female",
    isVerified: false,
    joinedDate: "2023-11-05",
  },
  {
    id: "u-joe",
    name: "Joe Okonkwo",
    username: "safari_joe",
    email: "joe@example.com",
    phone: "+254 712 555 017",
    avatarUrl: "https://i.pravatar.cc/300?img=51",
    bio: "Wildlife photographer. Africa is my canvas. Lions, elephants, and everything wild.",
    country: "Kenya",
    city: "Nairobi",
    dateOfBirth: "1988-05-25",
    gender: "male",
    isVerified: true,
    joinedDate: "2023-04-18",
  },
  {
    id: "u-hopper",
    name: "Luna Reyes",
    username: "island_hopper",
    email: "luna@example.com",
    phone: "+960 999 555 0",
    avatarUrl: "https://i.pravatar.cc/300?img=5",
    bio: "Island hopper. Maldives, Bali, Seychelles. Saltwater in my veins.",
    country: "Spain",
    city: "Barcelona",
    dateOfBirth: "1996-02-14",
    gender: "female",
    isVerified: true,
    joinedDate: "2023-08-01",
  },
];

/** Get a user by ID, or null */
export function getUserById(id: string): DemoUser | null {
  return DEMO_USERS.find((u) => u.id === id) ?? null;
}

/** Get all users except the current user */
export function getOtherUsers(currentUserId: string): DemoUser[] {
  return DEMO_USERS.filter((u) => u.id !== currentUserId);
}
