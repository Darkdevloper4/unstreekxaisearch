
export interface SearchSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  sources?: SearchSource[];
  isStreaming?: boolean;
}

export interface UserProfile {
  name: string;
  streekx_id: string; // Changed from email to streekx_id
  bio: string;
  avatar: string;
  phone?: string;
}

// Renamed from Project to Workspace to match Perplexity-like structure
export interface Workspace {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  status: 'active' | 'archived';
}

export interface UserPreferences {
  safeSearch: boolean;
  notifications: boolean;
  highContrast: boolean;
  dataSaver: boolean;
}

export interface AccountStats {
  plan: 'Free' | 'Pro' | 'Enterprise';
  queriesUsed: number;
  queriesLimit: number;
  memberSince: string;
}

export type ViewState = 'home' | 'search' | 'profile' | 'history' | 'workspace' | 'preferences' | 'account';

// New type for the Intro/Auth flow
export type AppPhase = 'splash' | 'onboarding' | 'auth-selection' | 'auth-form' | 'main';

export interface HistoryItem {
  id: string;
  query: string;
  date: string;
}
