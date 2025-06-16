"use client";

import { useState } from 'react';
import { auth, provider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';

export default function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, provider);
      window.location.reload();
    } catch (error) {
      console.error('Error signing in with Google:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2 rounded-full shadow-lg text-white font-semibold text-sm hover:bg-white/20 transition-all"
    >
      <img src="/google.svg" alt="Google logo" className="w-5 h-5" />
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
} 