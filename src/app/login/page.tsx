'use client';

import { auth, provider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, provider);
      console.log('✅ User:', result.user);
      router.push('/'); // Redirect to home page after successful login
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="max-w-md w-full space-y-8 p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-xl">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">
            Welcome to Compli
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Please sign in to continue
          </p>
        </div>
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}
        <div className="mt-8 space-y-6">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-full text-white bg-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
            ) : (
              <Image
                src="/google.svg"
                alt="Google logo"
                width={20}
                height={20}
                className="mr-2"
              />
            )}
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    </div>
  );
} 