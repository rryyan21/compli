"use client";

import Link from "next/link";
import SignInButton from "./SignInButton";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

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
          {user && (
            <Link href="/dashboard">
              <span className="text-white/80 hover:text-white px-3 py-1 rounded transition font-medium">Dashboard</span>
            </Link>
          )}
          <Link href="/search">
            <span className="text-white/80 hover:text-white px-3 py-1 rounded transition font-medium">Search</span>
          </Link>
          {!user && <SignInButton />}
          {user && (
            <div className="flex items-center gap-2 ml-4">
              <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full border-2 border-white/30 shadow" />
              <span className="text-white/80 text-sm">{user.displayName}</span>
              <button
                onClick={() => signOut(auth)}
                className="ml-2 px-3 py-1 rounded bg-white/10 text-white text-xs hover:bg-red-500/80 transition"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 