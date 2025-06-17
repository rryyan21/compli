"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Search, Users, ShieldCheck, BarChart3, Rocket, MessageCircle } from "lucide-react";

export default function Home() {
  // Feedback form state
  const [feedback, setFeedback] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, feedback }),
      });
      if (res.ok) {
        setSubmitted(true);
        setFeedback("");
        setName("");
        setEmail("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send feedback. Please try again later.");
      }
    } catch {
      setError("Failed to send feedback. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-black via-gray-900 to-gray-950 flex flex-col items-center justify-start px-4">
      {/* Hero Section */}
      <section className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center pt-32 pb-20">
        <img src="/CompliIcon.png" alt="Compli Logo" className="mx-auto w-24 h-24 mb-6 drop-shadow-xl" />
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
          The All-in-One Platform for Company Research & Interview Prep
        </h1>
        <p className="text-xl md:text-2xl text-white/80 mb-10 max-w-2xl mx-auto">
          Compli helps you discover, prepare, and connect—faster. Instantly find company info, interview insights, and contacts, all in one beautiful workspace.
        </p>
        <Link href="/search">
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-10 py-4 rounded-full text-xl font-bold shadow-lg transition-all">
            Get Started
          </button>
        </Link>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-5xl mx-auto grid md:grid-cols-3 gap-8 mb-24">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:scale-105 transition-transform">
          <Search size={40} className="text-blue-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-white">Company Search</h3>
          <p className="text-white/70">Find official websites, summaries, and news for any company in seconds.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:scale-105 transition-transform">
          <Sparkles size={40} className="text-purple-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-white">Interview Insights</h3>
          <p className="text-white/70">Access real interview questions, experiences, and prep plans for top roles.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:scale-105 transition-transform">
          <Users size={40} className="text-cyan-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-white">Contact Discovery</h3>
          <p className="text-white/70">Find LinkedIn profiles of employees by company, role, or university.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:scale-105 transition-transform md:col-span-1">
          <BarChart3 size={40} className="text-green-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-white">Personal Dashboard</h3>
          <p className="text-white/70">Save companies, track your research, and revisit your progress anytime.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:scale-105 transition-transform md:col-span-1">
          <ShieldCheck size={40} className="text-yellow-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-white">Privacy & Security</h3>
          <p className="text-white/70">Your data is protected with industry best practices and never sold.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-xl hover:scale-105 transition-transform md:col-span-1">
          <Rocket size={40} className="text-pink-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-white">Fast & Reliable</h3>
          <p className="text-white/70">Enjoy instant results and 99.99% uptime, powered by modern cloud tech.</p>
        </div>
      </section>

      {/* Feedback Form Section */}
      <section className="w-full max-w-xl mx-auto mb-24">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-xl">
          <MessageCircle size={36} className="text-blue-400 mb-2" />
          <h2 className="text-2xl font-bold mb-2 text-white">We'd love your feedback!</h2>
          <p className="text-white/70 mb-6">Let us know what you think or how we can improve Compli.</p>
          {submitted ? (
            <div className="text-green-400 text-lg font-semibold py-8">Thank you for your feedback!</div>
          ) : (
            <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
              <textarea
                placeholder="Your feedback (required)"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                required
                rows={4}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 resize-none"
              />
              {error && <div className="text-red-400 text-sm font-medium text-left px-1">{error}</div>}
              <button
                type="submit"
                disabled={loading || !feedback.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow transition disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Feedback"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="w-full max-w-2xl mx-auto text-center pb-24">
        <h2 className="text-3xl font-bold mb-4 text-white">Ready to get started?</h2>
        <p className="text-lg text-white/70 mb-6">Jump into your next opportunity with confidence. Compli is currently in beta and is free to use!</p>
        <Link href="/search">
          <button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 rounded-full text-xl font-bold shadow-lg transition-all">
            Start Searching
          </button>
        </Link>
      </section>
    </main>
  );
}
