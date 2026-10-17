import { supabase } from "@/lib/supabase";

/* ============================================================
   Vacancies — job postings a consulting agency publishes from
   its own CRM dashboard. Published postings are public (no
   login) on /jobs and on the agency's public profile. Anyone
   can submit an application (no login required); applications
   feed the agency's "Workers" CRM pipeline.
   Tables from migration 0024_consulting_vacancies.sql.

   Local-dev fallback: until that migration is applied to a real
   Supabase project, every read/write below transparently falls
   back to a localStorage mirror (same pattern as
   consulting-test-mode.ts / owner-crm.ts) so the feature is
   usable while building/reviewing the UI. Once the migration
   exists and queries succeed, Supabase takes over automatically.
   ============================================================ */

export type EmploymentType = "full_time" | "part_time" | "remote" | "internship" | "contract";
export type ExperienceLevel = "no_experience" | "junior" | "mid" | "senior" | "any";
export type VacancyStatus = "draft" | "published" | "closed" | "archived";
export type ApplicationStage = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  remote: "Remote",
  internship: "Internship",
  contract: "Contract",
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  no_experience: "No experience",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  any: "Any level",
};

export const APPLICATION_STAGES: { value: ApplicationStage; label: string; accent: string }[] = [
  { value: "new", label: "New", accent: "bg-sky-400" },
  { value: "screening", label: "Screening", accent: "bg-blue-400" },
  { value: "interview", label: "Interview", accent: "bg-purple-400" },
  { value: "offer", label: "Offer", accent: "bg-amber-400" },
  { value: "hired", label: "Hired", accent: "bg-emerald-400" },
  { value: "rejected", label: "Rejected", accent: "bg-rose-400" },
];

export interface Vacancy {
  id: string;
  consulting_company_id: string;
  title: string;
  department: string | null;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  location_city: string | null;
  location_country: string | null;
  description: string;
  requirements: string | null;
  responsibilities: string | null;
  benefits: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  salary_is_negotiable: boolean;
  openings_count: number;
  contact_email: string | null;
  contact_phone: string | null;
  status: VacancyStatus;
  expires_at: string | null;
  views: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Joined company data (public queries only) */
  company?: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string | null;
    country: string | null;
  } | null;
}

export type VacancyInput = Partial<
  Omit<Vacancy, "id" | "consulting_company_id" | "views" | "created_by" | "created_at" | "updated_at" | "company">
> & { title: string; description: string };

export interface VacancyApplication {
  id: string;
  vacancy_id: string;
  consulting_company_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  resume_url: string | null;
  cover_note: string | null;
  stage: ApplicationStage;
  source: string;
  applicant_user_id: string | null;
  created_at: string;
  updated_at: string;
  /** Joined vacancy title (CRM list only) */
  vacancy?: { title: string } | null;
}

export interface VacancyApplicationInput {
  vacancyId: string;
  companyId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  resumeUrl?: string | null;
  coverNote?: string | null;
}

// ── Local-dev fallback store (localStorage) ──

const VACANCIES_KEY = "oxen.vacancies.dev.rows";
const APPLICATIONS_KEY = "oxen.vacancies.dev.applications";

function readArr<T>(k: string): T[] {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArr<T>(k: string, rows: T[]): void {
  try {
    localStorage.setItem(k, JSON.stringify(rows));
  } catch {
    // ignore (private browsing / quota)
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildVacancyRow(companyId: string, input: VacancyInput, createdBy: string, id?: string): Vacancy {
  const now = nowIso();
  return {
    id: id ?? uid("vacancy"),
    consulting_company_id: companyId,
    title: input.title,
    department: input.department ?? null,
    employment_type: input.employment_type ?? "full_time",
    experience_level: input.experience_level ?? "any",
    location_city: input.location_city ?? null,
    location_country: input.location_country ?? null,
    description: input.description,
    requirements: input.requirements ?? null,
    responsibilities: input.responsibilities ?? null,
    benefits: input.benefits ?? null,
    salary_min: input.salary_min ?? null,
    salary_max: input.salary_max ?? null,
    currency: input.currency ?? "UZS",
    salary_is_negotiable: input.salary_is_negotiable ?? false,
    openings_count: input.openings_count ?? 1,
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    status: input.status ?? "draft",
    expires_at: input.expires_at ?? null,
    views: 0,
    created_by: createdBy || null,
    created_at: now,
    updated_at: now,
  };
}

/** Dev-only: seeds a few sample vacancies the first time the local fallback is used for this company. */
function seedLocalDevVacanciesIfEmpty(companyId: string): Vacancy[] {
  const all = readArr<Vacancy>(VACANCIES_KEY);
  if (all.some((v) => v.consulting_company_id === companyId) || !import.meta.env.DEV) {
    return all.filter((v) => v.consulting_company_id === companyId);
  }
  const samples: VacancyInput[] = [
    {
      title: "Ingliz tili o'qituvchisi / Consultant",
      department: "Education",
      employment_type: "full_time",
      experience_level: "junior",
      location_city: "Toshkent",
      location_country: "O'zbekiston",
      description: "Talabalarga xorijda o'qish bo'yicha maslahat berish va IELTS/SAT tayyorlov darslarini olib borish.",
      requirements: "IELTS 7.0+, kamida 1 yillik tajriba, mas'uliyatli va muloqotchan.",
      responsibilities: "Mijozlar bilan uchrashuv, dars o'tish, hujjatlarni tayyorlashda yordam berish.",
      benefits: "Rasmiy shartnoma, oylik bonus, malaka oshirish kurslari.",
      salary_min: 6000000,
      salary_max: 9000000,
      currency: "UZS",
      openings_count: 2,
      status: "published",
    },
    {
      title: "Marketing menejeri",
      department: "Marketing",
      employment_type: "full_time",
      experience_level: "mid",
      location_city: "Toshkent",
      location_country: "O'zbekiston",
      description: "Ijtimoiy tarmoqlarda agentlikni targ'ib qilish va lead generatsiya bo'yicha ishlash.",
      requirements: "SMM/performance marketing tajribasi, Figma/Canva bilimi.",
      responsibilities: "Kontent reja tuzish, reklama kampaniyalarini boshqarish, natijalarni tahlil qilish.",
      salary_min: 7000000,
      salary_max: 12000000,
      currency: "UZS",
      salary_is_negotiable: true,
      openings_count: 1,
      status: "published",
    },
    {
      title: "Mijozlar bilan ishlash bo'yicha mutaxassis (remote)",
      employment_type: "remote",
      experience_level: "no_experience",
      location_country: "O'zbekiston",
      description: "Mijozlarning so'rovlarini qabul qilish va ularni mutaxassislarga yo'naltirish.",
      requirements: "Kompyuter savodxonligi, telefon orqali muloqot qila olish.",
      salary_min: 4000000,
      currency: "UZS",
      openings_count: 3,
      status: "draft",
    },
  ];
  const rows = samples.map((s) => buildVacancyRow(companyId, s, "dev-seed"));
  writeArr(VACANCIES_KEY, [...all, ...rows]);
  return rows;
}

function localFetchAgencyVacancies(companyId: string): Vacancy[] {
  return seedLocalDevVacanciesIfEmpty(companyId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

const DEV_LOCAL_COMPANY_ID = "dev-local-company";

function localFetchPublishedVacancies(): Vacancy[] {
  // Dev convenience: if /jobs is opened before any agency dashboard has
  // seeded local data, seed the same dev-local company so the public
  // listing isn't empty.
  seedLocalDevVacanciesIfEmpty(DEV_LOCAL_COMPANY_ID);
  return readArr<Vacancy>(VACANCIES_KEY)
    .filter((v) => v.status === "published")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ── CRM: agency-side ──

export async function fetchAgencyVacancies(companyId: string): Promise<Vacancy[]> {
  const { data, error } = await supabase
    .from("consulting_vacancies")
    .select("*")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("consulting_vacancies unavailable, using local-dev fallback:", error.message);
    return localFetchAgencyVacancies(companyId);
  }
  return (data ?? []) as unknown as Vacancy[];
}

export async function fetchVacancyById(vacancyId: string, companyId?: string): Promise<Vacancy | null> {
  let query = supabase.from("consulting_vacancies").select("*").eq("id", vacancyId);
  if (companyId) query = query.eq("consulting_company_id", companyId);
  const { data, error } = await query.maybeSingle();
  if (error) {
    return readArr<Vacancy>(VACANCIES_KEY).find((v) => v.id === vacancyId) ?? null;
  }
  return data as unknown as Vacancy | null;
}

export async function upsertVacancy(
  companyId: string,
  createdBy: string,
  input: VacancyInput,
  existingId?: string,
): Promise<{ vacancy: Vacancy | null; error: string | null }> {
  const row = {
    consulting_company_id: companyId,
    title: input.title,
    department: input.department ?? null,
    employment_type: input.employment_type ?? "full_time",
    experience_level: input.experience_level ?? "any",
    location_city: input.location_city ?? null,
    location_country: input.location_country ?? null,
    description: input.description,
    requirements: input.requirements ?? null,
    responsibilities: input.responsibilities ?? null,
    benefits: input.benefits ?? null,
    salary_min: input.salary_min ?? null,
    salary_max: input.salary_max ?? null,
    currency: input.currency ?? "UZS",
    salary_is_negotiable: input.salary_is_negotiable ?? false,
    openings_count: input.openings_count ?? 1,
    contact_email: input.contact_email ?? null,
    contact_phone: input.contact_phone ?? null,
    status: input.status ?? "draft",
    expires_at: input.expires_at ?? null,
    created_by: createdBy,
  };

  if (existingId) {
    const { data, error } = await supabase
      .from("consulting_vacancies")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .select("*")
      .single();
    if (error) {
      const rows = readArr<Vacancy>(VACANCIES_KEY);
      const idx = rows.findIndex((v) => v.id === existingId);
      if (idx === -1) return { vacancy: null, error: error.message };
      rows[idx] = { ...rows[idx], ...input, updated_at: nowIso() } as Vacancy;
      writeArr(VACANCIES_KEY, rows);
      return { vacancy: rows[idx], error: null };
    }
    return { vacancy: data as unknown as Vacancy, error: null };
  }

  const { data, error } = await supabase.from("consulting_vacancies").insert(row).select("*").single();
  if (error) {
    const rows = readArr<Vacancy>(VACANCIES_KEY);
    const created = buildVacancyRow(companyId, input, createdBy);
    rows.push(created);
    writeArr(VACANCIES_KEY, rows);
    return { vacancy: created, error: null };
  }
  return { vacancy: data as unknown as Vacancy, error: null };
}

export async function deleteVacancy(vacancyId: string, companyId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_vacancies")
    .delete()
    .eq("id", vacancyId)
    .eq("consulting_company_id", companyId);
  if (error) {
    writeArr(VACANCIES_KEY, readArr<Vacancy>(VACANCIES_KEY).filter((v) => v.id !== vacancyId));
    writeArr(APPLICATIONS_KEY, readArr<VacancyApplication>(APPLICATIONS_KEY).filter((a) => a.vacancy_id !== vacancyId));
    return true;
  }
  return true;
}

export async function setVacancyStatus(vacancyId: string, status: VacancyStatus, companyId: string): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_vacancies")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", vacancyId)
    .eq("consulting_company_id", companyId);
  if (error) {
    const rows = readArr<Vacancy>(VACANCIES_KEY);
    const idx = rows.findIndex((v) => v.id === vacancyId);
    if (idx === -1) return false;
    rows[idx] = { ...rows[idx], status, updated_at: nowIso() };
    writeArr(VACANCIES_KEY, rows);
    return true;
  }
  return true;
}

// ── Public ──

export async function fetchPublishedVacancies(opts: { limit?: number } = {}): Promise<Vacancy[]> {
  let query = supabase
    .from("consulting_vacancies")
    .select(
      "*, company:consulting_companies!consulting_vacancies_consulting_company_id_fkey(id,name,logo_url,city,country)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) {
    console.warn("consulting_vacancies (public) unavailable, using local-dev fallback:", error.message);
    return localFetchPublishedVacancies();
  }
  return (data ?? []) as unknown as Vacancy[];
}

export async function fetchPublicVacancy(vacancyId: string): Promise<Vacancy | null> {
  const { data, error } = await supabase
    .from("consulting_vacancies")
    .select(
      "*, company:consulting_companies!consulting_vacancies_consulting_company_id_fkey(id,name,logo_url,city,country)",
    )
    .eq("id", vacancyId)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    return localFetchPublishedVacancies().find((v) => v.id === vacancyId) ?? null;
  }
  return data as unknown as Vacancy | null;
}

export async function fetchPublishedVacanciesByCompany(companyId: string): Promise<Vacancy[]> {
  const { data, error } = await supabase
    .from("consulting_vacancies")
    .select("*")
    .eq("consulting_company_id", companyId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) {
    return localFetchPublishedVacancies().filter((v) => v.consulting_company_id === companyId);
  }
  return (data ?? []) as unknown as Vacancy[];
}

export async function incrementVacancyViews(vacancyId: string): Promise<void> {
  try {
    await supabase.rpc("increment_vacancy_views", { p_vacancy_id: vacancyId });
  } catch {
    // Silent — views are best-effort
  }
}

// ── Applications ("Workers" CRM) ──

export async function submitVacancyApplication(input: VacancyApplicationInput): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from("consulting_vacancy_applications").insert({
    vacancy_id: input.vacancyId,
    consulting_company_id: input.companyId,
    full_name: input.fullName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    resume_url: input.resumeUrl ?? null,
    cover_note: input.coverNote ?? null,
  });
  if (error) {
    const now = nowIso();
    const rows = readArr<VacancyApplication>(APPLICATIONS_KEY);
    rows.push({
      id: uid("app"),
      vacancy_id: input.vacancyId,
      consulting_company_id: input.companyId,
      full_name: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      resume_url: input.resumeUrl ?? null,
      cover_note: input.coverNote ?? null,
      stage: "new",
      source: "website",
      applicant_user_id: null,
      created_at: now,
      updated_at: now,
    });
    writeArr(APPLICATIONS_KEY, rows);
    return { ok: true, error: null };
  }
  return { ok: true, error: null };
}

/** Dev-only: seeds a few sample applications the first time the local fallback is used for this company. */
function seedLocalDevApplicationsIfEmpty(companyId: string, vacancies: Vacancy[]): VacancyApplication[] {
  const all = readArr<VacancyApplication>(APPLICATIONS_KEY);
  if (all.some((a) => a.consulting_company_id === companyId) || !import.meta.env.DEV || vacancies.length === 0) {
    return all.filter((a) => a.consulting_company_id === companyId);
  }
  const target = vacancies[0];
  const samples: { full_name: string; email: string; phone: string; stage: ApplicationStage; cover_note?: string }[] = [
    { full_name: "Sevinch Qobilova", email: "sevinch.q@example.uz", phone: "+998 90 222 33 44", stage: "new" },
    { full_name: "Islom Berdiyev", email: "islom.b@example.uz", phone: "+998 93 333 44 55", stage: "screening" },
    { full_name: "Gulnoza Shukurova", email: "gulnoza.s@example.uz", phone: "+998 97 444 55 66", stage: "interview", cover_note: "3 yillik tajribam bor, jamoada ishlashni yaxshi ko'raman." },
    { full_name: "Rustam Qarshiyev", email: "rustam.q@example.uz", phone: "+998 91 555 66 77", stage: "offer" },
    { full_name: "Mohira Alimova", email: "mohira.a@example.uz", phone: "+998 99 666 77 88", stage: "hired" },
  ];
  const now = Date.now();
  const rows: VacancyApplication[] = samples.map((s, i) => {
    const ts = new Date(now - (samples.length - i) * 43_200_000).toISOString();
    return {
      id: uid("app"),
      vacancy_id: target.id,
      consulting_company_id: companyId,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      resume_url: null,
      cover_note: s.cover_note ?? null,
      stage: s.stage,
      source: "website",
      applicant_user_id: null,
      created_at: ts,
      updated_at: ts,
    };
  });
  writeArr(APPLICATIONS_KEY, [...all, ...rows]);
  return rows;
}

export async function fetchCompanyApplications(companyId: string): Promise<VacancyApplication[]> {
  const { data, error } = await supabase
    .from("consulting_vacancy_applications")
    .select("*, vacancy:consulting_vacancies!consulting_vacancy_applications_vacancy_id_fkey(title)")
    .eq("consulting_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("consulting_vacancy_applications unavailable, using local-dev fallback:", error.message);
    const vacancies = localFetchAgencyVacancies(companyId);
    const rows = seedLocalDevApplicationsIfEmpty(companyId, vacancies);
    const byId = new Map(vacancies.map((v) => [v.id, v.title]));
    return rows
      .map((a) => ({ ...a, vacancy: { title: byId.get(a.vacancy_id) ?? "Vacancy" } }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return (data ?? []) as unknown as VacancyApplication[];
}

export async function updateApplicationStage(id: string, stage: ApplicationStage): Promise<boolean> {
  const { error } = await supabase
    .from("consulting_vacancy_applications")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    const rows = readArr<VacancyApplication>(APPLICATIONS_KEY);
    const idx = rows.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    rows[idx] = { ...rows[idx], stage, updated_at: nowIso() };
    writeArr(APPLICATIONS_KEY, rows);
    return true;
  }
  return true;
}

export async function deleteApplication(id: string): Promise<boolean> {
  const { error } = await supabase.from("consulting_vacancy_applications").delete().eq("id", id);
  if (error) {
    writeArr(APPLICATIONS_KEY, readArr<VacancyApplication>(APPLICATIONS_KEY).filter((a) => a.id !== id));
    return true;
  }
  return true;
}
