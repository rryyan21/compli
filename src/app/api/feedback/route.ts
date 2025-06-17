import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { name, email, feedback } = await req.json();
    if (!feedback || typeof feedback !== 'string') {
      return NextResponse.json({ error: 'Feedback is required.' }, { status: 400 });
    }

    await addDoc(collection(db, 'feedback'), {
      name: name || '',
      email: email || '',
      feedback,
      timestamp: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback Firestore error:', error);
    return NextResponse.json({ error: 'Failed to save feedback.' }, { status: 500 });
  }
} 