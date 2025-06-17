"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

export default function Dashboard() {
  const [savedCompanies, setSavedCompanies] = useState<string[]>([]);
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
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-24 px-4 bg-black text-white">
      <div className="w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-10 mt-8">
        <div className="text-center mb-10">
          <img src="/CompliIcon.png" alt="Compli Logo" className="mx-auto w-16 h-16 mb-2" />
          <h1 className="text-4xl font-bold mb-2">Welcome{user?.displayName ? `, ${user.displayName}` : "!"}</h1>
          <p className="text-white/70 text-lg">Your personalized dashboard for saved companies.</p>
        </div>
        <section className="bg-black/40 border border-white/10 rounded-xl p-7 shadow flex flex-col items-center">
          <div className="flex items-center gap-2 mb-5">
            <Star className="text-yellow-400" size={24} />
            <h2 className="text-xl font-semibold text-white">Saved Companies</h2>
          </div>
          {savedCompanies.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/60 py-8">
              <p className="mb-2">You haven't saved any companies yet.</p>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full font-semibold mt-2 shadow"
                onClick={() => router.push("/search")}
              >
                Start Searching
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
              {savedCompanies.map((company) => (
                <div key={company} className="flex items-center gap-4 bg-white/10 border border-white/10 p-4 rounded-lg hover:bg-blue-500/20 transition">
                  <img
                    src={`https://logo.clearbit.com/${company.toLowerCase().replace(/\s+/g, "")}.com`}
                    alt={company}
                    className="w-10 h-10 object-contain rounded-md border"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                  <span className="text-lg font-medium flex-1 text-left text-white truncate">{company}</span>
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow"
                    onClick={() => router.push(`/search?company=${encodeURIComponent(company)}`)}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
} 