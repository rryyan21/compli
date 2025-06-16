"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Clock } from "lucide-react";

export default function Dashboard() {
  const [savedCompanies, setSavedCompanies] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  // TODO: Replace with real user info if available
  const user: any = undefined; // e.g., { displayName: "Ryan" }
  const router = useRouter();

  useEffect(() => {
    // Load saved companies from localStorage
    const allKeys = Object.keys(localStorage);
    const companyKeys = allKeys.filter((key) => key.startsWith("notes-"));
    const companies: string[] = [];
    companyKeys.forEach((key) => {
      try {
        const notes = JSON.parse(localStorage.getItem(key) || "{}");
        if (notes.saved) {
          companies.push(key.replace("notes-", ""));
        }
      } catch {}
    });
    setSavedCompanies(companies);

    // Load recent searches from localStorage
    const history = localStorage.getItem("search-history");
    if (history) {
      setRecentSearches(JSON.parse(history));
    }
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-16 px-4 bg-gradient-to-br from-black via-gray-900 to-gray-800">
      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 mt-8">
        <h1 className="text-3xl font-bold mb-2 text-center text-white">Welcome{user?.displayName ? `, ${user.displayName}` : ""}!</h1>
        <p className="text-white/60 text-center mb-8">Here's your personalized dashboard.</p>
        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-black/40 rounded-xl p-6 shadow flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Star className="text-yellow-400" size={22} />
              <h2 className="text-xl font-semibold text-white">Saved Companies</h2>
            </div>
            {savedCompanies.length === 0 ? (
              <p className="text-white/60">You haven't saved any companies yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {savedCompanies.map((company) => (
                  <div key={company} className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-lg hover:bg-white/10 transition">
                    <img
                      src={`https://logo.clearbit.com/${company.toLowerCase().replace(/\s+/g, "")}.com`}
                      alt={company}
                      className="w-10 h-10 object-contain rounded-md border"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    <span className="text-lg font-medium flex-1 text-left text-white">{company}</span>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow"
                      onClick={() => {
                        router.push(`/?company=${encodeURIComponent(company)}`);
                      }}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="bg-black/40 rounded-xl p-6 shadow flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-blue-400" size={22} />
              <h2 className="text-xl font-semibold text-white">Recent Searches</h2>
            </div>
            {recentSearches.length === 0 ? (
              <p className="text-white/60">No recent searches.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((name: string) => (
                  <button
                    key={name}
                    onClick={() => router.push(`/?company=${encodeURIComponent(name)}`)}
                    className="bg-white/10 hover:bg-blue-500 hover:text-white text-white px-4 py-1 rounded-full text-sm font-medium transition"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
} 