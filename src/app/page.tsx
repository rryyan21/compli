"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Newspaper } from "lucide-react";

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

export default function Home() {
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [news, setNews] = useState<{ title: string; link: string }[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [interviewData, setInterviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "news">("overview");

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

    const res = await fetch(`/api/search?company=${encodeURIComponent(query)}`);
    const data = await res.json();
    setUrl(data.url);
    setSummary(data.summary);
    setNews(data.news || []);
    setActiveTab("overview");
    updateHistory(query);

    const qRes = await fetch(
      `/api/questions?company=${encodeURIComponent(query)}`
    );
    const qData = await qRes.json();
    setQuestions(qData.questions || []);
    setInterviewData(qData.interviewData || null);

    setLoading(false);

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
        disabled={!company}
        className="mt-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-primary)] px-4 py-2 rounded transition disabled:opacity-50"
      >
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
              className={buttonStyle}
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
                className={buttonStyle}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {url && (
        <div
          ref={resultRef}
          className="mt-16 bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl max-w-xl w-full text-[var(--text-primary)] space-y-6 text-left backdrop-blur-sm"
        >
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

          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("overview")}
              className={tabStyle("overview")}
            >
              Overview
            </button>
            {news.length > 0 && (
              <button
                onClick={() => setActiveTab("news")}
                className={tabStyle("news")}
              >
                News
              </button>
            )}
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

                {interviewData && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold text-base">
                      Interview Experience
                    </h4>
                    <p className="text-sm text-white/80">
                      Experience:{" "}
                      {interviewData.experience?.toLowerCase() || "N/A"}
                      <br />
                      Difficulty:{" "}
                      {interviewData.difficulty?.toLowerCase() || "N/A"}
                      <br />
                      Method:{" "}
                      {interviewData.source?.replace(/_/g, " ").toLowerCase() ||
                        "N/A"}
                    </p>
                    <p className="text-sm text-white/80 mt-2">
                      {interviewData.processDescription ||
                        "No description provided."}
                    </p>

                    {interviewData.userQuestions?.length > 0 && (
                      <div className="mt-2">
                        <h4 className="font-semibold text-base mb-1">
                          Sample Questions
                        </h4>
                        <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                          {interviewData.userQuestions.map(
                            (q: any, i: number) => (
                              <li key={i}>{q.question}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
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
                  <a
                    key={index}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white/5 border border-white/10 hover:border-[var(--accent)] hover:bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl transition text-left"
                  >
                    <p className="text-sm font-medium leading-snug">
                      {item.title}
                    </p>
                  </a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
