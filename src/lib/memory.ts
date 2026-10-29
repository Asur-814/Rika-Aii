import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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

export const DEFAULT_USER_PROFILE: UserMemory = {
  nickname: 'Harshit',
  aiName: 'Rika',
  bio: 'Living legend and creator of Rika',
  preferences: {
    sassyLevel: 'mild',
    tone: 'sassy',
    favoriteTopic: 'Creativity & Technology'
  },
  settings: {
    audioVolume: 80,
    voiceId: 'Kore',
    avatarId: 'led_face',
    theme: 'dark'
  }
};

const PROFILE_KEY = 'rika_user_profile';
const HISTORY_KEY = 'rika_chat_history';
const MEMORY_KEY = 'rika_longterm_memory';

export function getLocalProfile(): UserMemory {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_USER_PROFILE, ...parsed };
    }
  } catch (err) {
    console.warn("Error reading local profile:", err);
  }
  return DEFAULT_USER_PROFILE;
}

export async function getUserProfile(): Promise<UserMemory> {
  const local = getLocalProfile();
  try {
    const userRef = doc(db, 'users', 'default_user');
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserMemory;
      const merged = { ...local, ...data };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {
    // Firestore might be in local mode or offline, use local storage
  }
  return local;
}

export async function saveUserProfile(data: Partial<UserMemory>) {
  try {
    const current = getLocalProfile();
    const updated = {
      ...current,
      ...data,
      preferences: {
        ...current.preferences,
        ...data.preferences
      },
      settings: {
        ...current.settings,
        ...data.settings
      }
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));

    // Optional firestore sync
    try {
      const userRef = doc(db, 'users', 'default_user');
      await setDoc(userRef, {
        ...updated,
        userId: 'default_user',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch {
      // Ignore firestore offline / unauthenticated errors
    }
  } catch (e) {
    console.error("Could not save user profile:", e);
  }
}

export async function getChatHistory(): Promise<ChatHistoryItem[]> {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Error reading history from storage:", e);
  }
  return [];
}

export async function saveHistoryItem(title: string, preview: string) {
  try {
    const list = await getChatHistory();
    const newItem: ChatHistoryItem = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      preview,
      timestamp: new Date().toISOString()
    };
    const updated = [newItem, ...list];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (e) {
    console.error("Error saving history item:", e);
  }
}

export async function deleteHistoryItem(id: string) {
  try {
    const list = await getChatHistory();
    const updated = list.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error deleting history item:", e);
  }
}

export async function updateHistoryItem(id: string, data: Partial<ChatHistoryItem>) {
  try {
    const list = await getChatHistory();
    const updated = list.map(item => item.id === id ? { ...item, ...data } : item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error updating history item:", e);
  }
}

export async function getLongTermMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not fetch long-term memory:", e);
  }
  return null;
}

export async function saveLongTermMemory(summary: string, keyFacts: string[]) {
  try {
    const data = {
      summary,
      keyFacts,
      lastTurnAt: new Date().toISOString()
    };
    localStorage.setItem(MEMORY_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving long term memory:", e);
  }
}
