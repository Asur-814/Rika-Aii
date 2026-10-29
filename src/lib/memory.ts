import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface UserMemory {
  nickname?: string;
  aiName?: string;
  bio?: string;
  instagramId?: string;
  preferences?: {
    sassyLevel: 'mild' | 'spicy' | 'extra';
    tone?: 'sassy' | 'caring' | 'helpful' | 'playful';
    favoriteTopic?: string;
  };
  settings?: {
    audioVolume: number;
    voiceId: string;
    avatarId: 'rikav1' | 'rikav2' | 'led_face' | 'custom' | string;
    customAvatarUrl?: string;
    theme: string;
    geminiApiKey?: string;
  };
  longTermMemory?: {
    summary: string;
    keyFacts: string[];
  };
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  preview: string;
  summary?: string;
  timestamp: any;
}

export async function getChatHistory() {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const historyRef = collection(db, 'users', user.uid, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as ChatHistoryItem[];
  } catch (e: any) {
    if (e.code === 'unavailable' || e.message?.includes('offline')) {
      console.warn("History fetch skipped (offline).");
    } else {
      console.error("Error fetching history:", e);
    }
    return [];
  }
}

export async function deleteHistoryItem(id: string) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const docRef = doc(db, 'users', user.uid, 'history', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error("Error deleting history item:", e);
  }
}

export async function updateHistoryItem(id: string, data: Partial<ChatHistoryItem>) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const docRef = doc(db, 'users', user.uid, 'history', id);
    await updateDoc(docRef, data);
  } catch (e) {
    console.error("Error updating history item:", e);
  }
}

export async function saveHistoryItem(title: string, preview: string) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const historyRef = collection(db, 'users', user.uid, 'history');
    await setDoc(doc(historyRef), {
      userId: user.uid,
      title,
      preview,
      timestamp: serverTimestamp()
    });
  } catch (e: any) {
    if (e.code === 'unavailable' || e.message?.includes('offline')) {
      console.warn("History save queued (offline).");
    } else {
      console.error("Error saving history item:", e);
    }
  }
}

export async function getUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      return snap.data() as UserMemory;
    }
  } catch (e) {
    console.warn("Could not fetch user profile (offline?):", e);
  }
  return null;
}

export async function saveUserProfile(data: Partial<UserMemory>) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      ...data,
      userId: user.uid,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e: any) {
    if (e.code === 'unavailable' || e.message?.includes('offline')) {
      console.warn("User profile update queued (offline).");
    } else {
      console.error("Could not save user profile:", e);
    }
  }
}

export async function getLongTermMemory() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const memoryRef = doc(db, 'users', user.uid, 'memory', 'longterm');
    const snap = await getDoc(memoryRef);
    
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {
    console.warn("Could not fetch long-term memory (offline?):", e);
  }
  return null;
}

export async function saveLongTermMemory(summary: string, keyFacts: string[]) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const memoryRef = doc(db, 'users', user.uid, 'memory', 'longterm');
    await setDoc(memoryRef, {
      userId: user.uid,
      summary,
      keyFacts,
      lastTurnAt: serverTimestamp()
    });
  } catch (e: any) {
    if (e.code === 'unavailable' || e.message?.includes('offline')) {
      console.warn("Memory save queued (offline).");
    } else {
      console.error("Error saving long term memory:", e);
    }
  }
}
