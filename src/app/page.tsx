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
} from "lucide-react";
import { auth, provider, db } from "@/lib/firebase";
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const popularCompanies = [
  "Google",
  "Amazon",
  "Meta",
  "Apple",
  "Netflix",
  "Tesla",
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

  const resultRef = useRef<HTMLDivElement>(null);
  const debouncedUniversity = useDebounce(university, 500);

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

  const updateHistory = (name: string) => {
    const normalized = name.toLowerCase(); // or use .trim().toLowerCase() for extra safety
    const updated = [
      normalized,
      ...history.filter((h) => h.toLowerCase() !== normalized),
    ].slice(0, 8);
    setHistory(updated);
    safeLocalStorage.setItem("searchHistory", JSON.stringify(updated));
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
      setSummary(data.summary);
      setNews(uniqueNews);
      setLinkedins(data.linkedins || []);
      setActiveTab("overview");
      updateHistory(query);
      setLoading(false);

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

  const buttonStyle =
    "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)] text-sm px-4 py-1 rounded-full transition";

  const tabStyle = (tab: string) =>
    `px-4 py-1 rounded-full text-sm font-medium transition ${
      activeTab === tab
        ? "bg-[var(--accent)] text-[var(--text-primary)]"
        : "bg-white/10 text-[var(--text-primary)] hover:bg-white/20"
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

  const renderPrep = () => {
    if (!company) {
      return (
        <div className="text-center text-white/60 py-8">
          Search for a company to see preparation checklist
        </div>
      );
    }

    const currentPlan = prepPlans[selectedRole];

    return (
      <div className="space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Ready to Apply Checklist</h3>
            <button
              onClick={toggleSaveCompany}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                companyNotes.saved
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {companyNotes.saved ? "Saved" : "Save Company"}
            </button>
          </div>
          <div className="space-y-3">
            {checklist.map(item => (
              <div key={item.id} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleChecklistItem(item.id)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-blue-500"
                />
                <span className={item.done ? "line-through text-white/40" : ""}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Prep Notes</h3>
            <textarea
              value={companyNotes.notes}
              onChange={(e) => updateNotes("notes", e.target.value)}
              placeholder="Add your preparation notes here..."
              className="w-full h-40 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Questions to Ask</h3>
            <textarea
              value={companyNotes.questions}
              onChange={(e) => updateNotes("questions", e.target.value)}
              placeholder="List questions you want to ask during interviews..."
              className="w-full h-40 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">7-Day Prep Plan</h3>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-blue-500"
            >
              {Object.keys(prepPlans).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="space-y-4">
            {Object.entries(currentPlan).map(([day, content]) => (
              <div key={day} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="font-medium text-blue-400 mb-2">{day}</h4>
                <h5 className="font-medium mb-2">{content.title}</h5>
                <ul className="list-disc list-inside space-y-1 text-white/80">
                  {content.tasks.map((task, index) => (
                    <li key={index}>{task}</li>
                  ))}
                </ul>
                {content.resources && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <h6 className="text-sm font-medium text-white/60 mb-2">Resources:</h6>
                    <ul className="space-y-1">
                      {content.resources.map((resource, index) => (
                        <li key={index}>
                          <a
                            href={resource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            {resource}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      // No redirect, just let the UI update
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Add effect to update contacts when university changes
  useEffect(() => {
    if (!company) return;
    setLoadingContacts(true);
    fetch(`/api/google-search?company=${encodeURIComponent(company)}&university=${encodeURIComponent(debouncedUniversity)}`)
      .then(res => res.json())
      .then(data => {
        setGoogleResults(data.results || []);
      })
      .catch(error => {
        setGoogleResults([]);
        console.error("Error fetching filtered contacts:", error);
      })
      .finally(() => {
        setLoadingContacts(false);
      });
  }, [debouncedUniversity, company]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-24 px-4 text-center bg-black text-[var(--text-primary)]">
      {/* Login/Logout Button */}
      <div className="absolute top-6 right-8 z-50">
        {user ? (
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full shadow-lg transition-all">
            <img
              src={user.photoURL || "/default-avatar.png"}
              alt="avatar"
              className="w-8 h-8 rounded-full border-2 border-white/30 shadow"
              style={{ objectFit: 'cover' }}
            />
            <span className="text-sm font-medium text-white/90 truncate max-w-[120px]">{user.displayName}</span>
            <button
              onClick={handleSignOut}
              className="ml-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-1.5 rounded-full font-semibold text-sm shadow-md transition-all border border-white/20"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2 rounded-full shadow-lg text-white font-semibold text-sm hover:bg-white/20 transition-all"
          >
            <img src="/google.svg" alt="Google logo" className="w-5 h-5" />
            Sign in with Google
          </button>
        )}
      </div>
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

      <input
        type="text"
        placeholder="Enter a company name"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && searchCompany()}
        className="border px-4 py-2 rounded w-full max-w-md text-black bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      />

      <button
        onClick={() => searchCompany()}
        disabled={!company || loading}
        className="mt-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)] px-4 py-2 rounded transition disabled:opacity-50 flex items-center gap-2"
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
          className="mt-16 bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl max-w-4xl w-full text-[var(--text-primary)] space-y-6 text-left backdrop-blur-sm"
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
              <span className="text-sm">Loading company information...</span>
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
          className="mt-16 bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl max-w-4xl w-full text-[var(--text-primary)] space-y-6 text-left backdrop-blur-sm"
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
            <button
              onClick={() => user ? setActiveTab("prep") : setActiveTab("prep")}
              className={tabStyle("prep")}
            >
              Prep
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
                <h4 className="font-semibold text-base mb-1 flex items-center gap-2">
                  <Info size={16} />
                  <span className="tracking-wide">Mission & Values</span>
                </h4>
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
                <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                  <Newspaper size={16} />
                  <span className="tracking-wide">Recent News</span>
                </h4>
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
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-1.5 rounded-full text-white text-sm transition-all mx-auto"
                  >
                    <img src="/google.svg" alt="Google logo" className="w-4 h-4" />
                    Sign in
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
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-1.5 rounded-full text-white text-sm transition-all mx-auto"
                  >
                    <img src="/google.svg" alt="Google logo" className="w-4 h-4" />
                    Sign in
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "contacts" && user && renderContacts()}

            {activeTab === "prep" && !user && (
              <motion.div
                key="prep-locked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-center py-8"
              >
                <div className="bg-white/5 border border-white/10 p-6 rounded-xl max-w-sm mx-auto">
                  <p className="text-white/60 mb-4">Please sign in to access preparation materials</p>
                  <button
                    onClick={handleSignIn}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-1.5 rounded-full text-white text-sm transition-all mx-auto"
                  >
                    <img src="/google.svg" alt="Google logo" className="w-4 h-4" />
                    Sign in
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "prep" && user && renderPrep()}
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  );
}
