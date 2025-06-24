"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, Layers, BookOpen } from "lucide-react";
import STARGenerator from '@/app/components/STARGenerator';
import MockInterviewChatbot from '@/app/components/MockInterviewChatbot';
import { useLLM } from '@/hooks/useLLM';
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface SavedCompany {
  name: string;
  role?: string;
  checklistProgress: number;
}

// Simple Toast component
function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-50 bg-blue-600/90 text-white px-6 py-3 rounded-xl shadow-lg animate-fade-in">
      {message}
    </div>
  );
}

export default function Dashboard() {
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState(savedCompanies[0]?.name || "");
  const [selectedRole, setSelectedRole] = useState(savedCompanies[0]?.role || "");
  const [generatedQuestions, setGeneratedQuestions] = useState<string | null>(null);
  const { generateResponse, isLoading: isGeneratingQuestions, error: llmError } = useLLM();
  const [activeTab, setActiveTab] = useState<'companies' | 'prep'>('companies');
  const [toast, setToast] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const generateInterviewQuestions = async () => {
    if (!selectedCompany || !selectedRole) return;
    try {
      const response = await generateResponse([
        {
          role: 'user',
          content: `Based on the ${selectedRole} role at ${selectedCompany}, suggest 5 insightful questions a candidate can ask during the interview. Format each question with a brief explanation of why it's valuable to ask.`
        }
      ]);
      setGeneratedQuestions(response);
      setToast('Interview questions generated!');
    } catch (error) {
      setToast('Failed to generate questions.');
      console.error('Failed to generate questions:', error);
    }
  };

  // Example: Show confetti when mock interview is completed (placeholder)
  const handleMockInterviewComplete = () => {
    setShowConfetti(true);
    setToast('Mock interview completed!');
    setTimeout(() => setShowConfetti(false), 2500);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--foreground)] bg-[var(--background)]">Loading...</div>;
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-24 px-2 md:px-6 bg-[var(--background)] text-[var(--foreground)]">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {showConfetti && <div className="fixed inset-0 z-40 pointer-events-none">{/* Confetti animation placeholder */}<div className="w-full h-full flex items-center justify-center text-6xl">🎉</div></div>}
      <div className="w-full max-w-6xl mx-auto flex flex-row gap-8">
        {/* Floating Glassy Sidebar */}
        <div
          className="sticky top-32 h-fit z-20"
        >
          <div className="card p-4 flex flex-col gap-4" style={{ minWidth: 140 }}>
            <button
              className={`${activeTab === 'companies' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 w-full text-left`}
              onClick={() => setActiveTab('companies')}
            >
              <Layers size={18} />
              Saved Companies
            </button>
            <button
              className={`${activeTab === 'prep' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 w-full text-left`}
              onClick={() => setActiveTab('prep')}
            >
              <BookOpen size={18} />
              Prep Center
            </button>
          </div>
        </div>
        {/* Main Content Panel */}
        <div className="flex-1">
          {activeTab === 'companies' && (
            <div className="card p-6 flex flex-col h-fit max-h-[80vh] overflow-y-auto">
              <div className="text-center mb-8">
                <img src="/CompliIcon.png" alt="Compli Logo" className="mx-auto w-16 h-16 mb-2" />
                <h1 className="text-3xl font-bold mb-2">Welcome{user?.displayName ? `, ${user.displayName}` : "!"}</h1>
                <p className="text-[var(--foreground)]/70 text-lg">Your personalized dashboard for saved companies.</p>
              </div>
              <div className="flex items-center gap-2 mb-5">
                <Star className="text-yellow-400" size={24} />
                <h2 className="text-xl font-semibold">Saved Companies</h2>
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
                    <div key={company.name} className="card p-4 hover:shadow-xl transition">
                      <div className="flex items-center gap-4">
                        <img
                          src={`https://logo.clearbit.com/${company.name.toLowerCase().replace(/\s+/g, "")}.com`}
                          alt={company.name}
                          className="w-10 h-10 object-contain rounded-md border"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                        <div className="flex-1 text-left">
                          <span className="text-lg font-medium truncate block">{company.name}</span>
                          {company.role && <span className="text-sm text-[var(--foreground)]/60">Role: {company.role}</span>}
                        </div>
                        <button
                          className="btn-secondary px-3 py-1 text-sm"
                          onClick={() => {
                            setSelectedCompany(company.name);
                            setSelectedRole(company.role || "");
                            setActiveTab('prep');
                          }}
                        >
                          Prep
                        </button>
                      </div>
                      <div className="w-full mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/60">Checklist Progress</span>
                          <span className="text-xs text-white/60">{company.checklistProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-[var(--surface-border)]/30 rounded-full overflow-hidden">
                          <div
                            className="h-2 bg-[var(--accent)] rounded-full transition-all"
                            style={{ width: `${company.checklistProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'prep' && savedCompanies.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-white/70 mb-4">No saved companies yet. Go to Search and save a company to start prepping!</p>
              <button
                className="btn-primary px-5 py-2"
                onClick={() => router.push('/search')}
              >
                Go to Search
              </button>
            </div>
          ) : activeTab === 'prep' && (
            <div className="card p-6 flex flex-col gap-8">
              <h2 className="text-2xl font-bold mb-2 text-center">Prep Center</h2>
              <div className="flex flex-col md:flex-row gap-4 mb-2">
                <select
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  value={selectedCompany}
                  onChange={e => setSelectedCompany(e.target.value)}
                >
                  {savedCompanies.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <input
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Role (e.g. Software Engineer)"
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                />
              </div>
              {/* Interview Questions Generator */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-2">
                <h3 className="text-lg font-semibold mb-4">Questions to Ask Interviewer</h3>
                <button
                  onClick={generateInterviewQuestions}
                  disabled={isGeneratingQuestions || !selectedCompany || !selectedRole}
                  className="w-full btn-primary rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  {isGeneratingQuestions ? (
                    <>
                      <span className="inline-block animate-spin mr-2"><Loader2 size={16} /></span>
                      Generating Questions...
                    </>
                  ) : (
                    'Generate Interview Questions'
                  )}
                </button>
                {llmError && (
                  <div className="text-red-400 text-sm mt-2">{llmError}</div>
                )}
                {generatedQuestions && (
                  <div className="mt-4 p-4 bg-white/10 rounded-lg">
                    <h4 className="font-medium mb-2">Generated Questions:</h4>
                    <div className="whitespace-pre-line text-white/80">{generatedQuestions}</div>
                  </div>
                )}
              </div>
              {/* STAR Generator */}
              <div className="mb-2">
                <STARGenerator />
              </div>
              {/* Mock Interview Chatbot */}
              <MockInterviewChatbot company={selectedCompany} role={selectedRole} handleMockInterviewComplete={handleMockInterviewComplete} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 