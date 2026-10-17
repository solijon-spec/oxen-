/* ============================================================
   Knowledge Base articles — real OXEN CRM functionality.
   Easy to maintain: just edit the array below.
   ============================================================ */

export interface KBArticle {
  id: string;
  category: string;
  title: string;
  content: string;
}

export const KB_CATEGORIES = [
  "Getting Started",
  "Agency Profile",
  "Clients",
  "Applications",
  "Tour Packages",
  "Posts",
  "POS",
  "Cashier",
  "Employees",
  "Analytics",
  "Account & Security",
  "Subscription",
] as const;

export const KB_ARTICLES: KBArticle[] = [
  // Getting Started
  {
    id: "gs-1",
    category: "Getting Started",
    title: "How to create your first agency",
    content:
      "Navigate to the CRM workspace from the bottom navigation. If you don't have an agency yet, click 'Add Agency' in the agency switcher. Fill in the 5 required fields: Logo (optional), Agency Name (your public brand name), Official Legal Name (registered company name), Country, and City. After creation, you'll receive a unique 6-character Agency Code that others can use to join your agency. You'll be automatically redirected to your dashboard.",
  },
  {
    id: "gs-2",
    category: "Getting Started",
    title: "Understanding the CRM dashboard",
    content:
      "The dashboard provides an overview of your agency's performance. You'll see stat cards for Total Clients, New This Week/Month, Active Applications, Success/Unsuccessful counts, and Revenue. Charts show client and revenue trends over time, application status distribution, and employee performance. Use the date filter chips to adjust the time range.",
  },
  {
    id: "gs-3",
    category: "Getting Started",
    title: "Switching between multiple agencies",
    content:
      "If you own or belong to multiple agencies, click the agency name in the sidebar to open the agency switcher. Select any agency to instantly switch context — all data (clients, applications, posts, reviews, settings) will reload for the newly active agency. The active agency is remembered per device.",
  },

  // Agency Profile
  {
    id: "ap-1",
    category: "Agency Profile",
    title: "How to edit your agency profile",
    content:
      "Go to CRM → Profile to edit your agency's public profile. You can update: logo, cover image, description, short tagline, contact details (phone, email, WhatsApp, Telegram), website, working hours, social links, map location, agency photos, branch offices, specialties, and license information. Changes are saved to Supabase and reflected on your public agency page immediately after publishing.",
  },
  {
    id: "ap-2",
    category: "Agency Profile",
    title: "Publishing your agency profile",
    content:
      "To make your agency visible publicly on OXEN, go to Profile and toggle 'Publish'. Your agency must have at minimum: name, logo, description, phone/contact, country, and city. Published agencies appear on the Home page under 'Tour Agencies' and can be viewed at /agency/:id by any visitor.",
  },
  {
    id: "ap-3",
    category: "Agency Profile",
    title: "Agency verification process",
    content:
      "Verification is a manual process reviewed by OXEN Owner/Admin. Upload your tourism license and registration documents in the Profile page. Submitting documents changes your status to 'pending' — it does NOT auto-verify. Once OXEN admin reviews and approves, your status changes to 'verified' and a verified badge appears on your public profile and tour posts.",
  },

  // Clients
  {
    id: "cl-1",
    category: "Clients",
    title: "How to add a client",
    content:
      "Go to CRM → Clients and click 'Add Client'. Fill in the client's full name (required), phone, email, destination country, and assign them to a service package and employee if needed. The client is created with status 'new_lead' and payment status 'pending'. You can update their status, add notes, and track their application progress over time.",
  },
  {
    id: "cl-2",
    category: "Clients",
    title: "Managing client statuses",
    content:
      "Clients move through 13 statuses: new_lead → contacted → consultation_scheduled → documents_requested → documents_received → under_review → submitted → waiting_for_result → approved/rejected → travel_completed/cancelled/refunded. Update a client's status from their profile slide-over. Every status change is logged in the status history with timestamp and the employee who made the change.",
  },
  {
    id: "cl-3",
    category: "Clients",
    title: "Adding internal notes to clients",
    content:
      "Open a client's profile slide-over and use the Notes tab. Notes are internal — they are never visible to the client. Use notes to track conversations, document requirements, and internal decisions. Each note shows the author and timestamp.",
  },

  // Applications
  {
    id: "ap-4",
    category: "Applications",
    title: "How to create an application",
    content:
      "Go to CRM → Applications and click 'New Application'. Select a client, optionally assign a service package and destination country. The application starts with status 'new'. You can track required documents, uploaded documents, and add internal notes and client-visible updates.",
  },
  {
    id: "ap-5",
    category: "Applications",
    title: "Using the Kanban board",
    content:
      "Toggle to Kanban view in the Applications page. Drag application cards between columns (New, Documents, Processing, Submitted, Approved, Rejected, Completed) to change their status. Each drag creates a history entry. This is useful for visualizing your pipeline at a glance.",
  },

  // Tour Packages
  {
    id: "tp-1",
    category: "Tour Packages",
    title: "How to create a tour package",
    content:
      "Go to CRM → Posts and click 'Create Package'. Fill in the title, destination country/city, price, currency, departure/return dates, descriptions, cover image, gallery, included/not-included items, itinerary, and contact info. Publish the package when ready to make it visible publicly.",
  },
  {
    id: "tp-2",
    category: "Tour Packages",
    title: "Publishing and unpublishing packages",
    content:
      "Posts have a status (draft, published, archived). Published packages are visible on OXEN at /tour/:id and on your agency's public profile. Draft posts are only visible within your CRM. Use the status controls in the Posts list or editor to publish/unpublish.",
  },
  {
    id: "tp-3",
    category: "Tour Packages",
    title: "Duplicating a package",
    content:
      "In the Posts list, click the Duplicate action on any package. This creates a copy of the package details and all associated media. The duplicated package starts as a draft so you can edit it before publishing.",
  },

  // Posts
  {
    id: "po-1",
    category: "Posts",
    title: "How to create a tour post",
    content:
      "Go to CRM → Posts and click 'Create Tour Package'. The slide-over editor lets you fill in: cover image, gallery, video URL, title, destination country/city, price/currency/old price, departure/return dates, booking deadline, available seats, short + full descriptions, hotel details, inclusion toggles (flight, hotel, visa, transfer, guide, insurance, meals), included/not-included lists, and a daily itinerary. Save as draft or publish immediately.",
  },
  {
    id: "po-2",
    category: "Posts",
    title: "Publishing tour posts to the Home page",
    content:
      "Published tour posts appear on the OXEN Home page below the 3D globe in the 'Tour Packages' section. Each card shows the cover image, destination, title, price, duration, departure date, and your agency's logo and name. Users can click 'View Tour' to see the full detail page at /tour/:postId.",
  },
  {
    id: "po-3",
    category: "Posts",
    title: "Managing post statuses",
    content:
      "Posts have three statuses: draft, published, and archived. Only published posts appear publicly. Use the Posts list to filter by status, search, preview, edit, duplicate, archive, or delete. Archiving a post removes it from public view without deleting it.",
  },

  // POS
  {
    id: "po-4",
    category: "POS",
    title: "Using the Point of Sale",
    content:
      "The POS module lets you process payments for services and packages directly. Select a service, enter the client, and process the payment. Transactions are recorded in the consulting_payments table with status tracking. Use POS for walk-in clients and direct sales.",
  },

  // Cashier
  {
    id: "ca-1",
    category: "Cashier",
    title: "Managing the cashier",
    content:
      "The Cashier module tracks your daily cash flow. Set your opening balance at the start of the day, record cash transactions, and reconcile at end of day. The cashier supports multiple currencies and provides daily summaries.",
  },

  // Employees
  {
    id: "em-1",
    category: "Employees",
    title: "How to invite an employee",
    content:
      "Go to CRM → Employees and click 'Invite Employee'. Enter their email address and select a role (Owner, Administrator, Manager, Consultant, Support Agent, Finance Manager, Content Manager, Read Only). An invitation is created and sent. The invitee can accept via their invitation link.",
  },
  {
    id: "em-2",
    category: "Employees",
    title: "Employee roles and permissions",
    content:
      "Owner and Administrator have full access to all CRM features. Managers can manage clients, applications, packages, POS, and payments. Consultants see only their assigned clients. Finance Managers handle payments, refunds, cashier, and reports. Content Managers handle packages and posts. Read Only members can view data but not modify anything.",
  },
  {
    id: "em-3",
    category: "Employees",
    title: "Assigning clients to employees",
    content:
      "Open a client's profile and use the 'Assign Employee' action. Select from your active team members. The assigned employee will see the client in their list and be responsible for the client's application progress. You can reassign or unassign at any time.",
  },

  // Analytics
  {
    id: "an-1",
    category: "Analytics",
    title: "Understanding analytics",
    content:
      "The Analytics page provides detailed insights: client trends, revenue trends, success rates, application status distribution, clients by destination, and employee performance. Use date range filters to focus on specific periods. All data is real — no synthetic metrics.",
  },

  // Account & Security
  {
    id: "as-1",
    category: "Account & Security",
    title: "Your OXEN account",
    content:
      "Your OXEN account is tied to your Google login. Every Google account has exactly one OXEN profile. Your user ID is permanent and matches your auth.users.id. You can own multiple agencies under the same account.",
  },
  {
    id: "as-2",
    category: "Account & Security",
    title: "Agency isolation and data security",
    content:
      "Each agency's data is isolated by consulting_company_id. When you switch agencies, all CRM data (clients, applications, posts, reviews, settings, support tickets) reloads for the active agency. Supabase Row Level Security (RLS) ensures no cross-agency data leakage at the database level.",
  },

  // Subscription
  {
    id: "su-1",
    category: "Subscription",
    title: "Managing your subscription",
    content:
      "Go to CRM → Subscription to view your current plan, status, start date, and expiration date. The sidebar also shows your plan and expiration. If your subscription expires, you'll see a renewal screen. Online subscription payments are not available yet — contact OXEN support for renewal assistance.",
  },
  {
    id: "su-2",
    category: "Subscription",
    title: "Available plans",
    content:
      "OXEN offers three plans: Monthly ($150/month), Quarterly ($400/3 months — save $50), and Annual ($1,700/year — save $100). Each plan includes full CRM dashboard access, unlimited service packages, client management, and varying employee seat limits. The Quarterly plan is the most popular.",
  },
];
