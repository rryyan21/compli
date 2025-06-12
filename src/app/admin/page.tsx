"use client";

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface SignInRecord {
  email: string;
  name: string;
  image?: string;
  timestamp: any;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [signIns, setSignIns] = useState<SignInRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSignIns = async () => {
      try {
        const q = query(collection(db, 'userSignIns'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const records = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
        })) as SignInRecord[];
        setSignIns(records);
      } catch (error) {
        console.error('Error fetching sign ins:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      fetchSignIns();
    }
  }, [user]);

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Metrics</h1>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Total Users</h2>
          <p className="text-4xl font-bold">{signIns.length}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Sign-ins</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-4">
              {signIns.map((record, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
                  {record.image && (
                    <img
                      src={record.image}
                      alt={record.name}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{record.name}</p>
                    <p className="text-sm text-white/60">{record.email}</p>
                    <p className="text-xs text-white/40">
                      {record.timestamp?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 