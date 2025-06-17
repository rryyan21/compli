"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

interface SavedCompany {
  name: string;
  role?: string;
  checklistProgress: number;
}

export default function Dashboard() {
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([]);
  // TODO: Replace with real user info if available
  const user: any = undefined; // e.g., { displayName: "Ryan" }
  const router = useRouter();

  useEffect(() => {
    // Load saved companies and their checklist progress from localStorage
    const allKeys = Object.keys(localStorage);
    const companyKeys = allKeys.filter((key) => key.startsWith("notes-"));
    const companies: SavedCompany[] = [];
    companyKeys.forEach((key) => {
      try {
        const companyName = key.replace("notes-", "");
        const notes = JSON.parse(localStorage.getItem(key) || "{}");
        if (notes.saved) {
          // Try to get role from notes or default
          const role = notes.role || "";
          // Try to get checklist progress
          let checklistProgress = 0;
          const checklistKey = `checklist-${companyName}`;
          const checklist = JSON.parse(localStorage.getItem(checklistKey) || "[]");
          if (Array.isArray(checklist) && checklist.length > 0) {
            const done = checklist.filter((item: any) => item.done).length;
            checklistProgress = Math.round((done / checklist.length) * 100);
          }
          companies.push({ name: companyName, role, checklistProgress });
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
            <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
              {savedCompanies.map((company) => (
                <div key={company.name} className="flex flex-col gap-2 bg-white/10 border border-white/10 p-4 rounded-lg hover:bg-blue-500/20 transition">
                  <div className="flex items-center gap-4">
                    <img
                      src={`https://logo.clearbit.com/${company.name.toLowerCase().replace(/\s+/g, "")}.com`}
                      alt={company.name}
                      className="w-10 h-10 object-contain rounded-md border"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    <div className="flex-1 text-left">
                      <span className="text-lg font-medium text-white truncate block">{company.name}</span>
                      {company.role && <span className="text-sm text-white/60">Role: {company.role}</span>}
                    </div>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow"
                      onClick={() => router.push(`/search?company=${encodeURIComponent(company.name)}&tab=prep`)}
                    >
                      Continue Prep
                    </button>
                  </div>
                  <div className="w-full mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/60">Checklist Progress</span>
                      <span className="text-xs text-white/60">{company.checklistProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-blue-500 rounded-full transition-all"
                        style={{ width: `${company.checklistProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
} 