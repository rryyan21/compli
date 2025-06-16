"use client";

import Link from "next/link";
import SignInButton from "./SignInButton";

export default function Navbar({ user }: { user?: any }) {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur border-b border-white/10 shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <span className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Compli
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/">
            <span className="text-white/80 hover:text-white px-3 py-1 rounded transition font-medium">Home</span>
          </Link>
          <Link href="/dashboard">
            <span className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-full shadow transition font-semibold">Dashboard</span>
          </Link>
          {!user && <SignInButton />}
          {user && (
            <div className="flex items-center gap-2 ml-4">
              <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full border-2 border-white/30 shadow" />
              <span className="text-white/80 text-sm">{user.displayName}</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 