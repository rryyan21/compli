"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info,
  Newspaper,
  Users,
  MessageCircle,
  Briefcase,
  Loader2,
  Mail,
  Clipboard,
  CheckCircle,
  XCircle,
  Search as SearchIcon,
} from "lucide-react";
import { auth, provider, db } from "@/lib/firebase";
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { useLLM } from '@/hooks/useLLM';

const popularCompanies = [
  "Google",
  "Amazon",
  "Apple",
  "Netflix",
  "OpenAI",
  "NVIDIA",
];

interface InterviewData {
  employer: string;
  difficulty: string;
  experience: string;
  jobTitle: string;
  outcome: string;
  process: string;
  questions: string[];
  interviewCount?: number;
  hasCompanyInfo?: boolean;
  note?: string;
  error?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface CompanyNotes {
  notes: string;
  questions: string;
  saved: boolean;
}

interface PrepDay {
  title: string;
  tasks: string[];
  resources?: string[];
}

interface PrepPlan {
  [key: string]: PrepDay;
}

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
}

// Loading skeleton components
const SkeletonLine = ({ width = "100%" }: { width?: string }) => (
  <div className="h-4 bg-white/10 rounded animate-pulse" style={{ width }} />
);

const SkeletonCard = () => (
  <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
    <SkeletonLine width="60%" />
    <SkeletonLine width="40%" />
  </div>
);

const SkeletonQuestion = () => (
  <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
    <SkeletonLine width="90%" />
  </div>
);

// Safe localStorage utilities
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail if localStorage is not available
    }
  },
};

// Add debounce utility
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Predefined prep plans for different roles
const prepPlans: Record<string, PrepPlan> = {
  "Software Engineer": {
    "Day 1: Technical Fundamentals": {
      title: "Data Structures & Algorithms",
      tasks: [
        "Review core data structures (Arrays, Linked Lists, Trees, Graphs)",
        "Practice basic algorithms (Sorting, Searching, BFS/DFS)",
        "Solve 2-3 LeetCode easy/medium problems"
      ],
      resources: [
        "https://leetcode.com/problemset/all/",
        "https://www.geeksforgeeks.org/data-structures/"
      ]
    },
    "Day 2: System Design": {
      title: "System Design Basics",
      tasks: [
        "Study system design fundamentals",
        "Practice designing a simple system (e.g., URL shortener)",
        "Review scalability concepts"
      ],
      resources: [
        "https://github.com/donnemartin/system-design-primer",
        "https://www.educative.io/courses/grokking-the-system-design-interview"
      ]
    },
    "Day 3: Coding Practice": {
      title: "Advanced Problem Solving",
      tasks: [
        "Focus on dynamic programming problems",
        "Practice tree/graph algorithms",
        "Review time/space complexity analysis"
      ]
    },
    "Day 4: System Architecture": {
      title: "Distributed Systems",
      tasks: [
        "Study distributed systems concepts",
        "Review database design patterns",
        "Practice system design questions"
      ]
    },
    "Day 5: Behavioral Prep": {
      title: "Behavioral & Leadership",
      tasks: [
        "Prepare STAR format responses",
        "Practice leadership questions",
        "Review past projects for examples"
      ]
    },
    "Day 6: Mock Interviews": {
      title: "Practice Interviews",
      tasks: [
        "Schedule mock technical interviews",
        "Practice coding on a whiteboard",
        "Record and review your performance"
      ]
    },
    "Day 7: Final Review": {
      title: "Comprehensive Review",
      tasks: [
        "Review all technical concepts",
        "Practice time management",
        "Prepare questions for interviewers"
      ]
    }
  },
  "Product Manager": {
    "Day 1: Product Fundamentals": {
      title: "Core Product Concepts",
      tasks: [
        "Review product development lifecycle",
        "Study product metrics and KPIs",
        "Practice product sense questions"
      ],
      resources: [
        "https://www.productplan.com/learn/product-management-basics/",
        "https://www.mindtheproduct.com/"
      ]
    },
    "Day 2: Strategy & Vision": {
      title: "Product Strategy",
      tasks: [
        "Practice product strategy questions",
        "Study market analysis frameworks",
        "Review competitive analysis techniques"
      ]
    },
    "Day 3: User Research": {
      title: "User-Centric Design",
      tasks: [
        "Study user research methodologies",
        "Practice user interview questions",
        "Review user feedback analysis"
      ]
    },
    "Day 4: Technical Understanding": {
      title: "Technical Knowledge",
      tasks: [
        "Review basic technical concepts",
        "Study system architecture basics",
        "Practice technical PM questions"
      ]
    },
    "Day 5: Execution & Leadership": {
      title: "Execution Excellence",
      tasks: [
        "Study agile methodologies",
        "Practice prioritization frameworks",
        "Review stakeholder management"
      ]
    },
    "Day 6: Analytics & Metrics": {
      title: "Data-Driven Decisions",
      tasks: [
        "Study product analytics tools",
        "Practice metrics-based questions",
        "Review A/B testing concepts"
      ]
    },
    "Day 7: Final Preparation": {
      title: "Comprehensive Review",
      tasks: [
        "Review all product concepts",
        "Practice case studies",
        "Prepare questions for interviewers"
      ]
    }
  }
};

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [news, setNews] = useState<{ title: string; link: string }[]>([]);
  const [linkedins, setLinkedins] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "news" | "interviews" | "contacts" | "prep"
  >("overview");
  const [isClient, setIsClient] = useState(false);
  const [googleResults, setGoogleResults] = useState<GoogleSearchResult[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [university, setUniversity] = useState("");
  const [universityResults, setUniversityResults] = useState<GoogleSearchResult[]>([]);
  const [loadingUniversity, setLoadingUniversity] = useState(false);
  const [searchCache, setSearchCache] = useState<Record<string, GoogleSearchResult[]>>({});
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [companyNotes, setCompanyNotes] = useState<CompanyNotes>({
    notes: "",
    questions: "",
    saved: false
  });
  const [selectedRole, setSelectedRole] = useState<string>("Software Engineer");
  const { generateResponse } = useLLM();
  const [toast, setToast] = useState<string | null>(null);

  /* ------------------------------------------------------------------
   * Google Authentication (used for locked Interview / Contacts tabs)
   * ------------------------------------------------------------------ */
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithPopup(auth, provider);
      // onAuthStateChanged listener will update `user` state automatically.
      // Refresh page to sync server-side data if required.
      window.location.reload();
    } catch (err) {
      console.error("Error signing in with Google:", err);
      setToast("Sign-in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  // Dynamic loading messages to keep users engaged during longer load times
  const loadingMessages = [
    "Fetching the most up-to-date information…",
    "Our AI helper is working…",
    "Almost done…"
  ];
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Cycle through loading messages whenever a loading state is active
  useEffect(() => {
    if (loading) {
      setLoadingMessageIndex(0); // reset when a new loading phase starts
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000); // update every 3 seconds
      return () => clearInterval(interval);
    }
  }, [loading]);

  const resultRef = useRef<HTMLDivElement>(null);
  const debouncedUniversity = useDebounce(university, 500);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  const validTabs = ["overview", "news", "interviews", "contacts", "prep"];

  useEffect(() => {
    // On mount, check for ?tab= in the URL and set the active tab if valid
    const tabParam = searchParams.get("tab");
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    }
  }, [searchParams]);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Track user sign in (only one record per user, updated on each sign-in)
  useEffect(() => {
    if (user) {
      const logUserSignIn = async () => {
        try {
          await setDoc(
            doc(db, "userSignIns", user.uid), // Use UID as doc ID
            {
              email: user.email,
              name: user.displayName,
              image: user.photoURL,
              timestamp: serverTimestamp(),
            },
            { merge: true }
          );
          console.log("✅ Firestore log successful");
        } catch (err) {
          console.error("❌ Firestore log failed:", err);
        }
      };
      logUserSignIn();
    }
  }, [user]);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
    const stored = safeLocalStorage.getItem("searchHistory");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        // If parsing fails, start with empty history
        setHistory([]);
      }
    }
  }, []);

  const updateHistory = async (name: string) => {
    const normalized = name.toLowerCase(); // or use .trim().toLowerCase() for extra safety
    const updated = [
      normalized,
      ...history.filter((h) => h.toLowerCase() !== normalized),
    ].slice(0, 8);
    setHistory(updated);
    safeLocalStorage.setItem("searchHistory", JSON.stringify(updated));

    // Retrieve mission cache object
    let missionCache: Record<string, string> = {};
    const rawCache = safeLocalStorage.getItem('missionCache');
    if (rawCache) {
      try {
        missionCache = JSON.parse(rawCache);
      } catch {
        missionCache = {};
      }
    }

    // Return cached summary if available
    if (missionCache[normalized]) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[SearchClient] Using cached mission summary for', name);
      }
      setSummary(missionCache[normalized]);
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[SearchClient] Requesting mission summary for', name);
    }

    // Generate mission & values summary using LLM
    try {
      const response = await generateResponse([
        {
          role: 'user',
          content: `In 2–3 concise sentences and without any additional commentary or internal reasoning, describe the core mission and values of the company \"${name}\" so an applicant can reference them before interviews. Respond plainly.`
        }
      ]);

      if (process.env.NODE_ENV !== 'production') {
        console.log('[SearchClient] Mission summary received:', response);
      }

      if (response) {
        // Remove any tags like <think>, trim quotes, shorten to 3 sentences max
        let cleaned = response.replace(/<[^>]+>/g, '').trim();
        cleaned = cleaned.replace(/^"+|"+$/g, ''); // strip wrapping quotes

        // Split into sentences and keep the first 3 for brevity
        const sentences = cleaned.split(/(?<=[.!?])\s+/).slice(0, 3);
        cleaned = sentences.join('\n');

        // Cache for future visits (single object)
        missionCache[normalized] = cleaned;
        safeLocalStorage.setItem('missionCache', JSON.stringify(missionCache));

        setSummary(cleaned);
      }
    } catch (err) {
      console.error('LLM mission generation failed:', err);
    }
  };

  const searchCompany = async (input?: string) => {
    const query = input || company;
    if (!query) return;

    setLoading(true);
    setLoadingInterviews(true);
    setLoadingContacts(true);

    // Reset previous data
    setUrl("");
    setSummary("");
    setNews([]);
    setLinkedins([]);
    setQuestions([]);
    setInterviewData(null);
    setGoogleResults([]);

    try {
      // Fetch company overview and website
      const res = await fetch(
        `/api/search?company=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      const uniqueNews = (data.news || []).filter(
        (item: { title: string; link: string }, index: number, self: any[]) =>
          index === self.findIndex((t) => t.title === item.title)
      );
      setUrl(data.url);
      setNews(uniqueNews);
      setLinkedins(data.linkedins || []);
      setActiveTab("overview");
      await updateHistory(query);

      // Fetch interview data
      const qRes = await fetch(
        `/api/questions?company=${encodeURIComponent(query)}`
      );
      const qData = await qRes.json();
      setInterviewData(qData);
      setQuestions(qData.questions || []);
      setLoadingInterviews(false);

      // Fetch Google search results for contacts
      const googleRes = await fetch(
        `/api/google-search?company=${encodeURIComponent(query)}&university=${encodeURIComponent(university)}`
      );
      const googleData = await googleRes.json();
      setGoogleResults(googleData.results || []);
      setLoadingContacts(false);
    } catch (error) {
      console.error("Error fetching company data:", error);
      setLoading(false);
      setLoadingInterviews(false);
      setLoadingContacts(false);
    } finally {
      setLoading(false);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Live search as user types university
  useEffect(() => {
    if (!debouncedUniversity) {
      setUniversityResults([]);
      setLoadingUniversity(false);
      return;
    }
    if (!company) return;
    const cacheKey = `${company}-${debouncedUniversity}`;
    if (searchCache[cacheKey]) {
      setUniversityResults(searchCache[cacheKey]);
      setLoadingUniversity(false);
      return;
    }
    setLoadingUniversity(true);
    fetch(`/api/university-search?company=${encodeURIComponent(company)}&university=${encodeURIComponent(debouncedUniversity)}`)
      .then(res => res.json())
      .then(data => {
        if (data.results) {
          setUniversityResults(data.results);
          setSearchCache(prev => ({ ...prev, [cacheKey]: data.results }));
        } else {
          setUniversityResults([]);
        }
      })
      .catch(err => {
        setUniversityResults([]);
      })
      .finally(() => setLoadingUniversity(false));
  }, [debouncedUniversity, company]);

  // Only clear university search state when company changes
  useEffect(() => {
    setUniversityResults([]);
    setSearchCache({});
    setUniversity("");
  }, [company]);

  // Load checklist from localStorage when company changes
  useEffect(() => {
    if (company) {
      const stored = safeLocalStorage.getItem(`checklist-${company}`);
      if (stored) {
        try {
          setChecklist(JSON.parse(stored));
        } catch {
          // If parsing fails, initialize with default items
          setChecklist([
            { id: "resume", label: "Resume tailored", done: false },
            { id: "mock", label: "Mock interview completed", done: false },
            { id: "referral", label: "Reached out to alumni/referral", done: false },
          ]);
        }
      } else {
        // Initialize with default items
        setChecklist([
          { id: "resume", label: "Resume tailored", done: false },
          { id: "mock", label: "Mock interview completed", done: false },
          { id: "referral", label: "Reached out to alumni/referral", done: false },
        ]);
      }
    }
  }, [company]);

  // Save checklist to localStorage when it changes
  useEffect(() => {
    if (company && checklist.length > 0) {
      safeLocalStorage.setItem(`checklist-${company}`, JSON.stringify(checklist));
    }
  }, [checklist, company]);

  // Load notes from localStorage when company changes
  useEffect(() => {
    if (company) {
      const stored = safeLocalStorage.getItem(`notes-${company}`);
      if (stored) {
        try {
          setCompanyNotes(JSON.parse(stored));
        } catch {
          // If parsing fails, initialize with empty notes
          setCompanyNotes({ notes: "", questions: "", saved: false });
        }
      } else {
        setCompanyNotes({ notes: "", questions: "", saved: false });
      }
    }
  }, [company]);

  // Save notes to localStorage when they change
  useEffect(() => {
    if (company) {
      safeLocalStorage.setItem(`notes-${company}`, JSON.stringify(companyNotes));
    }
  }, [companyNotes, company]);

  const updateNotes = (field: keyof Omit<CompanyNotes, 'saved'>, value: string) => {
    setCompanyNotes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleSaveCompany = () => {
    setCompanyNotes(prev => ({
      ...prev,
      saved: !prev.saved
    }));
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  const buttonStyle = "btn-chip";

  const tabStyle = (tab: string) =>
    `px-4 py-1 rounded-full text-sm font-medium transition ${
      activeTab === tab
        ? "bg-[var(--accent)] text-[var(--button-text)] shadow"
        : "bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--foreground)]/80 hover:bg-[var(--surface)]/70"
    }`;

  const renderContacts = () => {
    return (
      <div className="space-y-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by university..."
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[var(--accent)]"
          />
          {loadingContacts && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
        </div>

        {loadingContacts ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : googleResults.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            {university ? "No contacts found for this university." : "No contacts found for this company."}
          </div>
        ) : (
          <div className="space-y-4">
            {googleResults.map((result, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition"
              >
                <a
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <h3 className="text-lg font-medium mb-2 hover:text-[var(--accent)] transition">
                    {result.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {result.snippet}
                  </p>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputLike = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Focus search: press '/'
      if (e.key === '/' && !isInputLike) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Tab switching only when results visible
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && url) {
        const order = ['overview','news','interviews','contacts','prep'];
        const idx = order.indexOf(activeTab);
        if (idx !== -1) {
          const nextIdx = e.key === 'ArrowLeft' ? (idx - 1 + order.length) % order.length : (idx + 1) % order.length;
          setActiveTab(order[nextIdx] as typeof activeTab);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, url]);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>{loadingMessages[loadingMessageIndex]}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-24 px-4 text-center bg-[var(--background)] text-[var(--foreground)]">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center gap-1 mb-4 -ml-2"
      >
        <img
          src="/CompliIcon.png"
          alt="Compli Icon"
          className="w-[90px] h-[90px] -mb-1"
        />
        <h1 className="text-5xl font-semibold tracking-tight">Compli</h1>
      </motion.div>

      {/* Fancy search bar */}
      <div className="relative w-full max-w-md">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground)]/60" />
        <input
          type="text"
          placeholder="Enter a company name"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchCompany()}
          ref={searchInputRef}
          className="w-full pl-10 pr-4 py-3 rounded-full bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--foreground)] placeholder-[var(--foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-sm"
        />
      </div>

      <button
        onClick={() => searchCompany()}
        disabled={!company || loading}
        className="btn-primary mt-4 flex items-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? "Searching..." : "Find Website"}
      </button>

      {/* Popular Companies */}
      <div className="mt-10">
        <h2 className="font-semibold text-lg mb-2">Popular Companies</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {popularCompanies.map((name) => (
            <button
              key={name}
              onClick={() => {
                setCompany(name);
                searchCompany(name);
              }}
              disabled={loading}
              className={`${buttonStyle} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches - Only render on client side */}
      {isClient && history.length > 0 && (
        <div className="mt-10">
          <h2 className="font-semibold text-lg mb-2">Recent Searches</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {history.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setCompany(name);
                  searchCompany(name);
                }}
                disabled={loading}
                className={`${buttonStyle} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !url && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mt-16 p-6 shadow-xl max-w-4xl w-full text-[var(--text-primary)] space-y-6 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-md animate-pulse" />
            <div className="space-y-2 flex-1">
              <SkeletonLine width="200px" />
              <SkeletonLine width="300px" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">
                {loadingMessages[loadingMessageIndex]}
              </span>
            </div>
            <SkeletonLine width="100%" />
            <SkeletonLine width="80%" />
            <SkeletonLine width="60%" />
          </div>
        </motion.div>
      )}

      {/* Results */}
      {url && (
        <motion.div
          ref={resultRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card mt-16 p-6 shadow-xl max-w-4xl w-full text-[var(--text-primary)] space-y-6 text-left"
        >
          {url && url.startsWith("http") && (
            <div className="flex items-center gap-4">
              <img
                src={`https://logo.clearbit.com/${new URL(url).hostname}`}
                alt="Company Logo"
                className="w-12 h-12 object-contain rounded-md border"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div>
                <p className="text-lg font-semibold">
                  {new URL(url).hostname.replace("www.", "")}
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/50 break-all hover:text-white/70 transition"
                >
                  {url}
                </a>
              </div>
              <button
                onClick={() => {
                  toggleSaveCompany();
                  setToast(companyNotes.saved ? 'Company unsaved.' : 'Company saved!');
                }}
                className={`ml-4 btn-secondary ${companyNotes.saved ? '!bg-[var(--accent)] !text-[var(--button-text)]' : ''}`}
              >
                {companyNotes.saved ? 'Saved' : 'Save Company'}
              </button>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setActiveTab("overview")}
              className={tabStyle("overview")}
            >
              <Info size={14} className="inline mr-1" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("news")}
              className={tabStyle("news")}
            >
              <Newspaper size={14} className="inline mr-1" />
              News
            </button>
            <button
              onClick={() => user ? setActiveTab("interviews") : setActiveTab("interviews")}
              className={`${tabStyle("interviews")} ${
                loadingInterviews ? "opacity-70" : ""
              }`}
            >
              <Users size={14} className="inline mr-1" />
              Interviews
              {loadingInterviews && (
                <Loader2 size={12} className="inline ml-1 animate-spin" />
              )}
            </button>
            <button
              onClick={() => user ? setActiveTab("contacts") : setActiveTab("contacts")}
              className={tabStyle("contacts")}
            >
              <Mail size={14} className="inline mr-1" /> Contacts
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Info size={16} />
                  <h4 className="font-semibold text-base tracking-wide">Mission & Values</h4>
                  {summary && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(summary);
                        setToast('Copied to clipboard!');
                      }}
                      title="Copy to clipboard"
                      className="ml-1 p-1 rounded hover:bg-white/10 transition"
                    >
                      <Clipboard size={14} />
                    </button>
                  )}
                </div>
                <p className="text-base leading-relaxed italic">"{summary}"</p>
              </motion.div>
            )}

            {activeTab === "news" && (
              <motion.div
                key="news"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <Newspaper size={16} />
                    <span className="tracking-wide">Recent News</span>
                  </h4>
                </div>

                {news.length > 0 ? (
                  news.map((item, index) => (
                    <motion.a
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white/5 border border-white/10 hover:border-[var(--accent)] hover:bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl transition text-left"
                    >
                      <p className="text-sm font-medium leading-snug">
                        {item.title}
                      </p>
                    </motion.a>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--text-secondary)] italic">
                    The algorithm's on a coffee break. Stay tuned for updates!
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "interviews" && !user && (
              <motion.div
                key="interviews-locked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-center py-8"
              >
                <div className="bg-white/5 border border-white/10 p-6 rounded-xl max-w-sm mx-auto">
                  <p className="text-white/60 mb-4">Please sign in to view interview insights</p>
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="btn-primary flex items-center gap-2 mx-auto text-sm"
                  >
                    <img src="/google.svg" alt="Google logo" className="w-4 h-4" />
                    {isSigningIn ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "interviews" && user && (
              <motion.div
                key="interviews"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <h4 className="font-semibold text-base mb-4 flex items-center gap-2">
                  <Users size={16} />
                  <span className="tracking-wide">Interview Insights</span>
                  {loadingInterviews && (
                    <Loader2
                      size={16}
                      className="animate-spin text-[var(--accent)]"
                    />
                  )}
                </h4>

                {loadingInterviews ? (
                  <>
                    {/* Loading state for interview data */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SkeletonCard />
                      <SkeletonCard />
                      <SkeletonCard />
                      <SkeletonCard />
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Briefcase size={16} />
                        <SkeletonLine width="150px" />
                      </div>
                      <SkeletonLine />
                      <SkeletonLine width="80%" />
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <MessageCircle size={16} />
                        <SkeletonLine width="200px" />
                      </div>
                      <div className="space-y-3">
                        <SkeletonQuestion />
                        <SkeletonQuestion />
                        <SkeletonQuestion />
                      </div>
                    </div>
                  </>
                ) : interviewData ? (
                  <>
                    {/* Interview Overview */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h5 className="font-medium text-sm text-white/70 mb-2">
                          Experience Rating
                        </h5>
                        <p className="text-lg font-semibold capitalize">
                          {interviewData.experience || "Not specified"}
                        </p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h5 className="font-medium text-sm text-white/70 mb-2">
                          Difficulty Level
                        </h5>
                        <p className="text-lg font-semibold capitalize">
                          {interviewData.difficulty || "Not specified"}
                        </p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h5 className="font-medium text-sm text-white/70 mb-2">
                          Common Position
                        </h5>
                        <p className="text-lg font-semibold">
                          {interviewData.jobTitle || "Various positions"}
                        </p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h5 className="font-medium text-sm text-white/70 mb-2">
                          Interview Count
                        </h5>
                        <p className="text-lg font-semibold">
                          {interviewData.interviewCount
                            ? `${interviewData.interviewCount} reviews`
                            : "Multiple"}
                        </p>
                      </div>
                    </motion.div>

                    {/* Interview Process */}
                    {interviewData.process &&
                      interviewData.process !==
                        "No process description available" && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-white/5 border border-white/10 p-4 rounded-xl"
                        >
                          <h5 className="font-medium text-base mb-3 flex items-center gap-2">
                            <Briefcase size={16} />
                            Interview Process
                          </h5>
                          <p className="text-sm text-white/90 leading-relaxed">
                            {interviewData.process}
                          </p>
                        </motion.div>
                      )}

                    {/* Sample Questions */}
                    {questions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/5 border border-white/10 p-4 rounded-xl"
                      >
                        <h5 className="font-medium text-base mb-3 flex items-center gap-2">
                          <MessageCircle size={16} />
                          Sample Interview Questions ({questions.length})
                        </h5>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {questions.map((question, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + index * 0.05 }}
                              className="bg-white/5 border border-white/10 p-3 rounded-lg"
                            >
                              <p className="text-sm text-white/90 leading-relaxed">
                                {question}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Note for limited data */}
                    {interviewData.note && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl"
                      >
                        <p className="text-sm text-yellow-200">
                          <strong>Note:</strong> {interviewData.note}
                        </p>
                      </motion.div>
                    )}

                    {/* Error message */}
                    {interviewData.error && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl"
                      >
                        <p className="text-sm text-red-200">
                          <strong>Notice:</strong> {interviewData.error}
                        </p>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/70">No interview data available</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "contacts" && !user && (
              <motion.div
                key="contacts-locked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-center py-8"
              >
                <div className="bg-white/5 border border-white/10 p-6 rounded-xl max-w-sm mx-auto">
                  <p className="text-white/60 mb-4">Please sign in to view contact information</p>
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="btn-primary flex items-center gap-2 mx-auto text-sm"
                  >
                    <img src="/google.svg" alt="Google logo" className="w-4 h-4" />
                    {isSigningIn ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "contacts" && user && renderContacts()}
          </AnimatePresence>
        </motion.div>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-6 right-6 z-50 flex items-start gap-3 bg-white/10 backdrop-blur border border-white/20 px-4 py-3 rounded-xl shadow-lg"
          >
            {/* Icon based on message */}
            {toast.toLowerCase().includes('fail') || toast.toLowerCase().includes('error') ? (
              <XCircle size={20} className="text-red-400 shrink-0" />
            ) : (
              <CheckCircle size={20} className="text-green-400 shrink-0" />
            )}
            <span className="text-sm text-white/90 max-w-xs leading-snug">{toast}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/60 hover:text-white/90 text-xs"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}