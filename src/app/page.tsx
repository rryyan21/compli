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
} from "lucide-react";

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

export default function Home() {
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [news, setNews] = useState<{ title: string; link: string }[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "news" | "interviews"
  >("overview");

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("searchHistory");
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  const updateHistory = (name: string) => {
    const updated = [name, ...history.filter((h) => h !== name)].slice(0, 8);
    setHistory(updated);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
  };

  const searchCompany = async (input?: string) => {
    const query = input || company;
    if (!query) return;

    setLoading(true);
    setLoadingInterviews(true);

    // Reset previous data
    setUrl("");
    setSummary("");
    setNews([]);
    setQuestions([]);
    setInterviewData(null);

    try {
      // Fetch company overview and website
      const res = await fetch(
        `/api/search?company=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setUrl(data.url);
      setSummary(data.summary);
      setNews(data.news || []);
      setActiveTab("overview");
      updateHistory(query);
      setLoading(false); // Overview data loaded

      // Fetch interview data (continues loading)
      const qRes = await fetch(
        `/api/questions?company=${encodeURIComponent(query)}`
      );
      const qData = await qRes.json();

      // Set the interview data from the API response
      setInterviewData(qData);
      setQuestions(qData.questions || []);
      setLoadingInterviews(false); // Interview data loaded
    } catch (error) {
      console.error("Error fetching company data:", error);
      setLoading(false);
      setLoadingInterviews(false);
    } finally {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const buttonStyle =
    "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)] text-sm px-4 py-1 rounded-full transition";

  const tabStyle = (tab: string) =>
    `px-4 py-1 rounded-full text-sm font-medium transition ${
      activeTab === tab
        ? "bg-[var(--accent)] text-[var(--text-primary)]"
        : "bg-white/10 text-[var(--text-primary)] hover:bg-white/20"
    }`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-24 px-4 text-center bg-black text-[var(--text-primary)]">
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
              onClick={() => searchCompany(name)}
              disabled={loading}
              className={`${buttonStyle} ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches */}
      {history.length > 0 && (
        <div className="mt-10">
          <h2 className="font-semibold text-lg mb-2">Recent Searches</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {history.map((name) => (
              <button
                key={name}
                onClick={() => searchCompany(name)}
                disabled={loading}
                className={`${buttonStyle} ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
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
          <div className="flex items-center gap-4">
            {(() => {
              try {
                const parsedUrl = new URL(url);
                const host = parsedUrl.hostname;

                return (
                  <>
                    <img
                      src={`https://logo.clearbit.com/${host}`}
                      alt="Company Logo"
                      className="w-12 h-12 object-contain rounded-md border"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    <div>
                      <p className="text-lg font-semibold">
                        {host.replace("www.", "")}
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
                  </>
                );
              } catch (err) {
                console.warn("Invalid URL provided:", url);
                return null;
              }
            })()}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setActiveTab("overview")}
              className={tabStyle("overview")}
            >
              <Info size={14} className="inline mr-1" />
              Overview
            </button>
            {news.length > 0 && (
              <button
                onClick={() => setActiveTab("news")}
                className={tabStyle("news")}
              >
                <Newspaper size={14} className="inline mr-1" />
                News
              </button>
            )}
            <button
              onClick={() => setActiveTab("interviews")}
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

            {activeTab === "news" && news.length > 0 && (
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
                {news.map((item, index) => (
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
                ))}
              </motion.div>
            )}

            {activeTab === "interviews" && (
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
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  );
}
