import React, { useState, useEffect } from 'react';
import { 
  SearchIcon, UserIcon, GlobeIcon, ArrowRightIcon, 
  HistoryIcon, SettingsIcon, LayersIcon, CreditCardIcon, SparklesIcon, MenuIcon,
  EditIcon, TrashIcon, PlusIcon, CheckIcon, XIcon, LogOutIcon, FolderIcon
} from './components/Icons';
import { generateSearchResponse } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { ChatMessage, ViewState, HistoryItem, UserProfile, Workspace, UserPreferences, AccountStats, AppPhase } from './types';

// --- Crypto Helper for Client-Side Hashing ---
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Helper Component: Search Input ---
interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  large?: boolean;
  loading?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, onSearch, large = false, loading = false }) => {
  return (
    <div className={`relative w-full transition-all duration-300 ${large ? 'max-w-2xl' : 'max-w-xl'}`}>
      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none`}>
        <SearchIcon className={`${large ? 'w-6 h-6' : 'w-5 h-5'} text-streek-muted`} />
      </div>
      <input
        type="text"
        className={`
          block w-full rounded-full bg-streek-card text-streek-text
          border border-transparent focus:border-streek-neon/50 focus:ring-1 focus:ring-streek-neon/30
          placeholder-streek-muted focus:outline-none transition-all
          ${large ? 'py-4 pl-12 pr-14 text-lg' : 'py-2.5 pl-10 pr-10 text-sm'}
        `}
        placeholder={large ? "Ask anything..." : "Search StreekX..."}
        value={value}
        onChange={onChange}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
      />
      <div className="absolute inset-y-0 right-2 flex items-center">
        <button 
          onClick={onSearch}
          disabled={loading || !value.trim()}
          className={`
            p-2 rounded-full transition-colors
            ${value.trim() ? 'text-streek-neon hover:bg-streek-neon/10' : 'text-streek-muted'}
          `}
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-streek-muted border-t-streek-neon rounded-full animate-spin"></div>
          ) : (
            <ArrowRightIcon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

// --- Helper Component: Nav Button ---
interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center w-full px-4 py-3 mb-1 rounded-xl transition-all
      ${active 
        ? 'bg-streek-neon text-streek-black font-semibold' 
        : 'text-streek-muted hover:text-streek-text hover:bg-streek-card'}
    `}
  >
    <span className="mr-3">{icon}</span>
    {label}
  </button>
);

// --- Helper Component: Toggle Switch ---
interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
}
const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${checked ? 'bg-streek-neon' : 'bg-streek-card border border-[#333]'}`}
  >
    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${checked ? 'translate-x-6 bg-streek-black' : 'translate-x-0'}`} />
  </button>
);

// --- INTRO & AUTH COMPONENTS ---

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3000); // 3 seconds splash
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-streek-black z-[100] flex flex-col items-center justify-center overflow-hidden">
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-streek-neon/20 blur-[150px] rounded-full animate-pulse"></div>
       <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 bg-streek-neon rounded-2xl flex items-center justify-center mb-6 animate-bounce shadow-[0_0_50px_rgba(212,255,91,0.5)]">
             <span className="text-6xl font-display font-bold text-streek-black">S</span>
          </div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tighter animate-fade-in-up">
            Streek<span className="text-streek-neon">X</span>
          </h1>
          <div className="mt-4 h-1 w-32 bg-gray-800 rounded-full overflow-hidden">
             <div className="h-full bg-streek-neon animate-[width_3s_ease-out_forwards]" style={{ width: '0%' }}></div>
          </div>
       </div>
    </div>
  );
};

const OnboardingScreen = ({ onNext }: { onNext: () => void }) => {
  return (
    <div className="fixed inset-0 bg-streek-black z-[90] flex flex-col justify-between p-8 animate-in fade-in duration-700">
       <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-full max-w-md">
             <div className="flex justify-center mb-12">
                <div className="relative">
                   <SparklesIcon className="w-24 h-24 text-streek-neon animate-pulse" />
                   <div className="absolute inset-0 bg-streek-neon/30 blur-2xl rounded-full"></div>
                </div>
             </div>
             <h2 className="text-4xl font-display font-bold text-white mb-6 leading-tight">
               Knowledge at the speed of <span className="text-streek-neon">thought</span>.
             </h2>
             <p className="text-streek-muted text-lg leading-relaxed mb-8">
               Experience the next generation of AI search. Real-time, grounded, and designed for clarity.
             </p>
          </div>
       </div>
       <div className="w-full max-w-md mx-auto">
          <button 
            onClick={onNext}
            className="w-full bg-streek-neon text-streek-black font-bold text-lg py-4 rounded-xl hover:brightness-110 transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(212,255,91,0.3)] flex items-center justify-center gap-2"
          >
            Get Started <ArrowRightIcon className="w-5 h-5" />
          </button>
       </div>
    </div>
  );
};

const AuthSelectionScreen = ({ onSelect, onSkip }: { onSelect: (mode: 'login' | 'signup') => void, onSkip: () => void }) => {
  return (
    <div className="fixed inset-0 bg-streek-black z-[90] flex flex-col justify-end p-6 md:justify-center md:items-center animate-in slide-in-from-bottom-10 duration-500">
       <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-8">
             <h3 className="text-3xl font-display font-bold text-white mb-2">Identify Yourself</h3>
             <p className="text-streek-muted">Create your StreekX identity to save history, workspaces, and preferences.</p>
          </div>
          
          <button 
            onClick={() => onSelect('signup')}
            className="w-full bg-streek-text text-streek-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all"
          >
            Create StreekX Identity
          </button>
          
          <button 
            onClick={() => onSelect('login')}
            className="w-full bg-streek-card border border-streek-card hover:border-streek-neon/50 text-white font-semibold py-4 rounded-xl transition-all"
          >
            Sign In
          </button>
          
          <button 
            onClick={onSkip}
            className="w-full py-4 text-streek-muted hover:text-white text-sm font-medium transition-colors"
          >
            Not Now
          </button>
       </div>
    </div>
  );
};

const AuthFormScreen = ({ 
  mode, 
  onBack, 
  onComplete, 
  onSwitchMode, 
}: { 
  mode: 'login' | 'signup', 
  onBack: () => void, 
  onComplete: () => void, 
  onSwitchMode: (mode: 'login' | 'signup') => void,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    streekxId: '',
    password: '',
    gender: '',
    dob: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const displayStreekxId = formData.streekxId.trim().toLowerCase().replace(/\s/g, '');
    
    if (displayStreekxId.length < 3) {
       setError("StreekX ID must be at least 3 characters.");
       setLoading(false);
       return;
    }
    
    if (formData.password.length < 6) {
       setError("Password must be at least 6 characters.");
       setLoading(false);
       return;
    }

    try {
      // 1. Hash the password on the client
      const hashedPassword = await hashPassword(formData.password);

      if (mode === 'signup') {
         // 2a. Signup: Insert into 'users' table
         const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=D4FF5B&color=0F0F0F`;
         
         const { data, error: insertError } = await supabase
           .from('users')
           .insert([{
             streekx_id: displayStreekxId,
             password_hash: hashedPassword,
             full_name: formData.name,
             avatar_url: avatarUrl,
             phone: formData.phone,
             gender: formData.gender,
             dob: formData.dob,
             bio: 'New StreekX Explorer'
           }])
           .select()
           .single();

         if (insertError) {
           if (insertError.code === '23505') { // Unique violation
             setError("This StreekX ID is already taken. Please login instead.");
             setLoading(false);
             return;
           }
           throw insertError;
         }

         if (data) {
           localStorage.setItem('streekx_session_id', data.id);
           setSuccess('Identity created successfully!');
           setTimeout(onComplete, 1000);
         }

      } else {
         // 2b. Login: Query 'users' table
         const { data, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('streekx_id', displayStreekxId)
            .eq('password_hash', hashedPassword)
            .maybeSingle();

         if (fetchError) {
             console.error("Supabase Login Error:", fetchError);
             throw new Error("Connection error. Please try again.");
         }

         if (!data) {
             throw new Error("Invalid StreekX ID or Password.");
         }
         
         // Login Success
         localStorage.setItem('streekx_session_id', data.id);
         setSuccess('Access Granted.');
         setTimeout(onComplete, 800);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-streek-black z-[95] flex flex-col p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
       <button onClick={onBack} className="self-start p-2 text-streek-muted hover:text-white mb-6">
         <ArrowRightIcon className="w-6 h-6 rotate-180" />
       </button>
       
       <div className="w-full max-w-md mx-auto my-auto">
          <h2 className="text-3xl font-display font-bold text-white mb-8">
            {mode === 'signup' && 'Create Identity'}
            {mode === 'login' && 'Welcome Back'}
          </h2>
          
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-lg mb-6 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span className="text-lg">✅</span>
              <span className="font-semibold">{success}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6 text-sm flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
              <span className="font-semibold flex items-center gap-2">
                <span className="text-lg">⚠️</span> {error}
              </span>
              {error.includes("already taken") && (
                 <button 
                   onClick={() => onSwitchMode('login')}
                   className="mt-2 text-streek-neon underline font-bold hover:text-white transition-colors self-start"
                 >
                   Switch to Sign In
                 </button>
              )}
            </div>
          )}

          {/* SIGNUP / LOGIN FORM */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs uppercase text-streek-muted font-bold tracking-wider">Full Name</label>
                  <input 
                    name="name" type="text" required 
                    className="w-full bg-streek-card border border-[#333] focus:border-streek-neon rounded-lg p-3 text-white outline-none transition-colors"
                    placeholder="John Doe"
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs uppercase text-streek-muted font-bold tracking-wider">StreekX ID</label>
                <input 
                  name="streekxId" type="text" required 
                  className="w-full bg-streek-card border border-[#333] focus:border-streek-neon rounded-lg p-3 text-white outline-none transition-colors"
                  placeholder="username"
                  onChange={handleChange}
                  autoCapitalize="none"
                  autoComplete="username"
                  value={formData.streekxId}
                />
                <p className="text-[10px] text-streek-muted">Unique identifier. No spaces.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase text-streek-muted font-bold tracking-wider">Password</label>
                <div className="relative">
                  <input 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    className="w-full bg-streek-card border border-[#333] focus:border-streek-neon rounded-lg p-3 pr-10 text-white outline-none transition-colors"
                    placeholder="••••••••"
                    onChange={handleChange}
                    autoComplete="current-password"
                    value={formData.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-streek-muted hover:text-white"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs uppercase text-streek-muted font-bold tracking-wider">Gender</label>
                        <select 
                          name="gender" 
                          className="w-full bg-streek-card border border-[#333] focus:border-streek-neon rounded-lg p-3 text-white outline-none transition-colors appearance-none"
                          onChange={handleChange}
                        >
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="flex-1 space-y-1">
                        <label className="text-xs uppercase text-streek-muted font-bold tracking-wider">DOB</label>
                        <input 
                          name="dob" type="date" required 
                          className="w-full bg-streek-card border border-[#333] focus:border-streek-neon rounded-lg p-3 text-white outline-none transition-colors"
                          onChange={handleChange}
                        />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase text-streek-muted font-bold tracking-wider">Mobile Number</label>
                    <input 
                      name="phone" type="tel" required 
                      className="w-full bg-streek-card border border-[#333] focus:border-streek-neon rounded-lg p-3 text-white outline-none transition-colors"
                      placeholder="+1 234 567 8900"
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-streek-neon text-streek-black font-bold py-4 rounded-xl hover:brightness-110 transition-all mt-6 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-streek-black border-t-transparent rounded-full animate-spin"></div>}
                {loading ? 'Processing...' : (mode === 'signup' ? 'Initialize Identity' : 'Access System')}
              </button>
            </form>
          )}

          <div className="text-center mt-4">
             <button 
                 type="button"
                 onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')}
                 className="text-streek-muted text-sm hover:text-white transition-colors"
             >
                 {mode === 'login' ? "New to StreekX? Create Identity" : "Already have an ID? Sign In"}
             </button>
          </div>
       </div>
    </div>
  );
};


// --- Main App Component ---
export default function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>('splash');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [query, setQuery] = useState('');
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // -- Session State for Perplexity-like flow --
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());

  // -- State for Search History --
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);

  // -- Custom Session Management --
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // -- Edit Profile State --
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfile | null>(null);

  // -- Edit Account State --
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [tempAccount, setTempAccount] = useState<{name: string, phone: string}>({ name: '', phone: '' });
  
  // -- Change Password State --
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

  // -- Workspaces (Formerly Projects) --
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');

  // -- Preferences --
  const [preferences, setPreferences] = useState<UserPreferences>({
    safeSearch: true,
    notifications: false,
    highContrast: false,
    dataSaver: false,
  });

  // -- Account Stats --
  const [accountStats, setAccountStats] = useState<AccountStats>({
    plan: 'Free',
    queriesUsed: 0,
    queriesLimit: 50,
    memberSince: 'Just now'
  });

  // Check Local Session on Mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('streekx_session_id');
    if (storedSessionId) {
      setCurrentUserId(storedSessionId);
      setIsLoggedIn(true);
      fetchUserData(storedSessionId);
    } else {
      setIsLoggedIn(false);
    }
  }, [appPhase]);

  // -- REALTIME SUBSCRIPTIONS --
  useEffect(() => {
    if (!currentUserId || !isLoggedIn) return;

    // WORKSPACES Channel (Changed from projects)
    const workspaceChannel = supabase.channel(`workspaces-${currentUserId}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'workspaces', filter: `user_id=eq.${currentUserId}` },
        () => fetchWorkspaces(currentUserId)
      )
      .subscribe();

    // MESSAGES Channel (Changed from search_history)
    const messagesChannel = supabase.channel(`messages-${currentUserId}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'messages', filter: `user_id=eq.${currentUserId}` },
        () => fetchHistory(currentUserId)
      )
      .subscribe();

    // Profile Channel
    const profileChannel = supabase.channel(`profile-${currentUserId}`)
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${currentUserId}` },
        (payload) => {
             const newUser = payload.new;
             if (newUser) {
                 setUserProfile(prev => prev ? ({
                     ...prev,
                     name: newUser.full_name,
                     bio: newUser.bio,
                     phone: newUser.phone,
                 }) : null);
             }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workspaceChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [currentUserId, isLoggedIn]);

  const fetchUserData = async (userId: string) => {
     const { data: user, error } = await supabase
       .from('users')
       .select('*')
       .eq('id', userId)
       .single();

     if (user) {
        setUserProfile({
          name: user.full_name,
          streekx_id: user.streekx_id,
          avatar: user.avatar_url || 'https://picsum.photos/200/200',
          bio: user.bio,
          phone: user.phone
        });
     } else if (error) {
        if(error.code === 'PGRST116') handleLogout(); 
     }

     fetchHistory(userId);
     fetchWorkspaces(userId);
  };

  const fetchHistory = async (userId: string) => {
    // Fetch from 'messages' table now
    const { data: history } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (history) {
        // Filter to show only user queries in history list for cleanliness
        const userQueries = history.filter((h: any) => h.role === 'user');
        setSearchHistory(userQueries.map((h: any) => ({
           id: h.id,
           query: h.content, // Map 'content' column to 'query' prop
           date: new Date(h.created_at).toLocaleDateString()
        })));
        setAccountStats(prev => ({...prev, queriesUsed: userQueries.length}));
    }
  };

  const fetchWorkspaces = async (userId: string) => {
    // Fetch from 'workspaces' table now
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
      .order('last_modified', { ascending: false });
    
    if (wsData) {
        setWorkspaces(wsData.map((p: any) => ({
           id: p.id,
           name: p.name,
           description: p.description,
           status: p.status as 'active' | 'archived',
           lastModified: new Date(p.last_modified).toLocaleDateString()
        })));
    }
  };

  const handleLogout = async () => {
     localStorage.removeItem('streekx_session_id');
     setIsLoggedIn(false);
     setCurrentUserId(null);
     setUserProfile(null);
     setSearchHistory([]);
     setWorkspaces([]);
     setCurrentView('home');
     setUserMenuOpen(false);
  };

  const triggerAuth = () => {
    setUserMenuOpen(false);
    setAppPhase('auth-selection');
  }

  const handleChangePassword = async () => {
    if (!currentUserId) return;
    if (passwordForm.new !== passwordForm.confirm) {
       alert("Passwords do not match");
       return;
    }
    if (passwordForm.new.length < 6) {
       alert("Password must be at least 6 characters");
       return;
    }
    const hashedPassword = await hashPassword(passwordForm.new);
    const { error } = await supabase.from('users').update({ password_hash: hashedPassword }).eq('id', currentUserId);
    if (error) {
       alert("Error updating password: " + error.message);
    } else {
       alert("Password updated successfully!");
       setIsChangingPassword(false);
       setPasswordForm({ new: '', confirm: '' });
    }
  };

  const handleUpdateAccountDetails = async () => {
    if (!currentUserId) return;
    const { error } = await supabase.from('users').update({
       full_name: tempAccount.name,
       phone: tempAccount.phone
    }).eq('id', currentUserId);
    if (error) {
       alert("Failed to update account.");
       return;
    }
    setUserProfile(prev => prev ? ({ ...prev, name: tempAccount.name, phone: tempAccount.phone }) : null);
    setIsEditingAccount(false);
  };

  const handleSearch = async (overrideQuery?: string) => {
    const searchQuery = overrideQuery || query;
    if (!searchQuery.trim() || isLoading) return;

    let activeSessionId = sessionId;
    
    if (currentView === 'home') {
       const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
       setSessionId(newId);
       activeSessionId = newId;
       const userMsg: ChatMessage = { role: 'user', content: searchQuery };
       const aiPlaceholder: ChatMessage = { role: 'model', content: '', isStreaming: true };
       setMessages([userMsg, aiPlaceholder]);
    } else {
       const userMsg: ChatMessage = { role: 'user', content: searchQuery };
       const aiPlaceholder: ChatMessage = { role: 'model', content: '', isStreaming: true };
       setMessages(prev => [...prev, userMsg, aiPlaceholder]);
    }

    setCurrentView('search');
    setIsLoading(true);
    setUserMenuOpen(false);

    if (isLoggedIn && currentUserId) {
         // Insert into 'messages' table
         await supabase.from('messages').insert([{
             user_id: currentUserId,
             content: searchQuery,
             role: 'user',
             session_id: activeSessionId
         }]);
    }

    try {
      let currentText = '';
      const result = await generateSearchResponse(searchQuery, activeSessionId, (chunk) => {
        currentText += chunk;
        setMessages(prev => {
           const newMsgs = [...prev];
           const lastMsg = newMsgs[newMsgs.length - 1];
           if (lastMsg.role === 'model') {
             lastMsg.content = currentText;
           }
           return newMsgs;
        });
      });

      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg.role === 'model') {
          lastMsg.content = result.text;
          lastMsg.sources = result.sources;
          lastMsg.isStreaming = false;
        }
        return newMsgs;
      });

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  };

  const handleNavClick = (view: ViewState) => {
    setCurrentView(view);
    setUserMenuOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!tempProfile || !currentUserId) return;
    const { error } = await supabase.from('users').update({
       full_name: tempProfile.name,
       bio: tempProfile.bio
    }).eq('id', currentUserId);
    if (error) {
       alert("Failed to save profile.");
       return;
    }
    setUserProfile(tempProfile);
    setIsEditingProfile(false);
  };

  const handleCancelProfile = () => {
    setTempProfile(userProfile);
    setIsEditingProfile(false);
  };

  // -- Logic for Workspaces --
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    if (!isLoggedIn || !currentUserId) {
       alert("Please sign in to save workspaces.");
       return;
    }

    // Insert into 'workspaces' table
    const { error } = await supabase.from('workspaces').insert([{
       user_id: currentUserId,
       name: newWorkspaceName,
       description: newWorkspaceDesc || 'Research Collection',
       status: 'active'
    }]);

    if (error) {
       console.error(error);
       alert("Failed to create workspace");
       return;
    }

    setNewWorkspaceName('');
    setNewWorkspaceDesc('');
    setIsAddingWorkspace(false);
  };

  const handleDeleteWorkspace = async (id: string) => {
    const { error } = await supabase.from('workspaces').delete().eq('id', id);
    if (error) {
       alert("Failed to delete workspace");
    }
  };

  // Render Content based on View
  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in duration-500">
            <div className="mb-12 text-center">
              <h1 className="font-display text-7xl font-bold tracking-tighter text-streek-text mb-2">
                Streek<span className="text-streek-neon">X</span>
              </h1>
              <p className="text-streek-muted text-lg">Where knowledge begins.</p>
            </div>
            <SearchInput 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onSearch={() => handleSearch()} 
              large={true}
              loading={isLoading}
            />
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {['Stock market today', 'How to center a div', 'Gemini API docs'].map((tag) => (
                <button 
                  key={tag}
                  onClick={() => handleSearch(tag)}
                  className="px-4 py-2 bg-streek-card/50 hover:bg-streek-card border border-streek-card hover:border-streek-neon/30 rounded-lg text-sm text-streek-muted hover:text-streek-text transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        );

      case 'search':
        return (
          <div className="w-full max-w-4xl mx-auto px-4 pt-8 pb-32 animate-in slide-in-from-bottom-4 duration-500">
            {messages.map((msg, idx) => (
              <div key={idx} className={`mb-10 ${msg.role === 'user' ? 'border-b border-streek-card pb-8' : ''}`}>
                {msg.role === 'user' ? (
                  <h2 className="text-3xl font-display font-medium text-streek-text">{msg.content}</h2>
                ) : (
                  <div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3 text-streek-muted text-xs uppercase tracking-wider font-semibold">
                          <GlobeIcon className="w-4 h-4" />
                          <span>Sources</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {msg.sources.map((source, sIdx) => (
                            <a 
                              key={sIdx} 
                              href={source.uri} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex-shrink-0 min-w-[140px] max-w-[200px] p-3 bg-streek-card hover:bg-[#2A2A2A] rounded-lg border border-transparent hover:border-streek-neon/20 transition-all group"
                            >
                              <div className="text-xs text-streek-muted line-clamp-1 mb-1">{new URL(source.uri).hostname}</div>
                              <div className="text-sm text-streek-text font-medium line-clamp-2 group-hover:text-streek-neon transition-colors">{source.title}</div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-streek-neon flex items-center justify-center">
                          <SparklesIcon className="w-5 h-5 text-streek-black" />
                        </div>
                      </div>
                      <div className="flex-grow">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-streek-neon">StreekX Answer</span>
                            {msg.isStreaming && <span className="animate-pulse w-2 h-2 rounded-full bg-streek-neon"></span>}
                         </div>
                         <div className="prose prose-invert prose-p:text-streek-text/90 prose-headings:text-streek-text max-w-none text-lg leading-relaxed whitespace-pre-line">
                           {msg.content}
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
             <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-10">
                <div className="w-full max-w-2xl bg-[#0F0F0F]/80 backdrop-blur-md p-2 rounded-full shadow-2xl border border-streek-card">
                  <SearchInput 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onSearch={() => handleSearch()}
                    loading={isLoading}
                  />
                </div>
             </div>
          </div>
        );

      case 'profile':
        if (!isLoggedIn || !userProfile) {
          return (
            <div className="max-w-md mx-auto px-4 pt-24 text-center">
               <UserIcon className="w-16 h-16 text-streek-muted mx-auto mb-4" />
               <h2 className="text-2xl font-bold text-white mb-2">Identity Required</h2>
               <p className="text-streek-muted mb-6">You are browsing as a Guest. Access your StreekX Identity to view your profile.</p>
               <button onClick={triggerAuth} className="bg-streek-neon text-streek-black font-bold px-6 py-3 rounded-xl hover:brightness-110">
                 Sign In / Create Identity
               </button>
            </div>
          );
        }
        return (
          <div className="max-w-3xl mx-auto px-4 pt-12 animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-8">
               <h2 className="text-3xl font-display font-bold text-streek-text flex items-center gap-3">
                 <UserIcon className="w-8 h-8 text-streek-neon" /> Public Profile
               </h2>
               {!isEditingProfile && (
                 <button onClick={() => { setTempProfile(userProfile); setIsEditingProfile(true); }} className="flex items-center gap-2 px-4 py-2 bg-streek-card border border-streek-neon/30 rounded-lg text-streek-neon hover:bg-streek-neon hover:text-streek-black transition-all">
                   <EditIcon className="w-4 h-4" /> Edit Identity
                 </button>
               )}
             </div>

             <div className="bg-streek-card rounded-2xl p-8 border border-[#333]">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="relative">
                     <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-streek-neon/50">
                       <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                     </div>
                  </div>
                  
                  <div className="flex-1 w-full space-y-6">
                     <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-streek-muted font-semibold">Full Name</label>
                        {isEditingProfile && tempProfile ? (
                          <input type="text" value={tempProfile.name} onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})} className="w-full bg-[#0F0F0F] border border-[#333] rounded-lg px-4 py-2 text-white focus:border-streek-neon outline-none" />
                        ) : (
                          <div className="text-xl font-medium">{userProfile.name}</div>
                        )}
                     </div>
                     
                     <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-streek-muted font-semibold">StreekX ID</label>
                        <div className="text-xl font-medium text-streek-neon">{userProfile.streekx_id}</div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-streek-muted font-semibold">Bio</label>
                        {isEditingProfile && tempProfile ? (
                          <textarea value={tempProfile.bio} onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})} className="w-full bg-[#0F0F0F] border border-[#333] rounded-lg px-4 py-2 text-white focus:border-streek-neon outline-none min-h-[100px]" />
                        ) : (
                          <div className="text-base text-streek-muted/80">{userProfile.bio}</div>
                        )}
                     </div>

                     {isEditingProfile && (
                       <div className="flex gap-4 pt-4">
                         <button onClick={handleSaveProfile} className="flex-1 bg-streek-neon text-streek-black font-bold py-2 rounded-lg hover:brightness-110 flex items-center justify-center gap-2">
                           <CheckIcon className="w-4 h-4" /> Save Changes
                         </button>
                         <button onClick={handleCancelProfile} className="flex-1 bg-[#0F0F0F] border border-[#333] text-white py-2 rounded-lg hover:bg-[#151515] flex items-center justify-center gap-2">
                           <XIcon className="w-4 h-4" /> Cancel
                         </button>
                       </div>
                     )}
                  </div>
                </div>
             </div>
          </div>
        );

      case 'workspace':
        return (
          <div className="max-w-6xl mx-auto px-4 pt-12 animate-in fade-in duration-300">
             <div className="flex justify-between items-end mb-10">
               <div>
                  <h2 className="text-4xl font-display font-bold text-streek-text flex items-center gap-3 mb-2">
                    <LayersIcon className="w-10 h-10 text-streek-neon" /> Workspace
                  </h2>
                  <p className="text-streek-muted">Organize your research threads and collections in one place.</p>
               </div>
               <button onClick={() => setIsAddingWorkspace(true)} className="flex items-center gap-2 px-5 py-3 bg-streek-neon text-streek-black font-bold rounded-xl hover:brightness-110 transition-all shadow-[0_0_20px_rgba(212,255,91,0.2)]">
                  <PlusIcon className="w-5 h-5" /> New Collection
               </button>
             </div>

             {isAddingWorkspace && (
                <div className="mb-10 bg-[#151515] p-6 rounded-2xl border border-streek-neon/30 animate-in slide-in-from-top-4 shadow-2xl">
                   <h3 className="text-lg font-bold text-white mb-4">Create New Collection</h3>
                   <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs uppercase text-streek-muted font-bold">Collection Name</label>
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="e.g. Quantum Physics Research" 
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-streek-neon outline-none" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs uppercase text-streek-muted font-bold">Context / Goal (Optional)</label>
                        <textarea
                          placeholder="What is this collection for?" 
                          value={newWorkspaceDesc}
                          onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                          className="w-full bg-[#0F0F0F] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-streek-neon outline-none min-h-[80px]" 
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={handleCreateWorkspace} className="bg-streek-neon text-streek-black px-6 py-2 rounded-lg font-bold hover:brightness-110">Create</button>
                        <button onClick={() => setIsAddingWorkspace(false)} className="bg-[#222] border border-[#333] text-white px-6 py-2 rounded-lg hover:bg-[#333]">Cancel</button>
                      </div>
                   </div>
                </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workspaces.map(ws => (
                   <div key={ws.id} className="bg-streek-card p-6 rounded-2xl border border-[#333] hover:border-streek-neon/50 transition-all group relative flex flex-col h-full hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                      <div className="flex justify-between items-start mb-4">
                         <div className="p-3 bg-[#0F0F0F] rounded-xl text-streek-neon group-hover:scale-110 transition-transform">
                            <FolderIcon className="w-6 h-6" />
                         </div>
                         <button onClick={() => handleDeleteWorkspace(ws.id)} className="text-streek-muted hover:text-red-500 transition-colors p-2 bg-[#0F0F0F] rounded-lg opacity-0 group-hover:opacity-100">
                            <TrashIcon className="w-4 h-4" />
                         </button>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{ws.name}</h3>
                      <p className="text-streek-muted text-sm mb-6 line-clamp-2 flex-grow">{ws.description}</p>
                      
                      <div className="pt-4 border-t border-[#333] flex justify-between items-center text-xs text-streek-muted/60 uppercase tracking-wider font-semibold">
                         <span>Updated: {ws.lastModified}</span>
                         <div className="flex items-center gap-1 text-streek-neon">
                            <span>Open</span>
                            <ArrowRightIcon className="w-3 h-3" />
                         </div>
                      </div>
                   </div>
                ))}
                
                {workspaces.length === 0 && !isAddingWorkspace && (
                   <div className="col-span-full py-24 text-center border-2 border-dashed border-[#333] rounded-3xl bg-[#0F0F0F]/50">
                      <LayersIcon className="w-16 h-16 text-streek-muted mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-bold text-white mb-2">Workspace is Empty</h3>
                      <p className="text-streek-muted mb-6">Create a collection to organize your research threads.</p>
                      <button onClick={() => setIsAddingWorkspace(true)} className="text-streek-neon font-bold hover:underline">
                        Create First Collection
                      </button>
                   </div>
                )}
             </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="max-w-2xl mx-auto px-4 pt-12 animate-in fade-in duration-300">
             <h2 className="text-3xl font-display font-bold text-streek-text mb-8 flex items-center gap-3">
               <SettingsIcon className="w-8 h-8 text-streek-neon" /> Preferences
             </h2>
             <div className="bg-streek-card rounded-2xl border border-[#333] divide-y divide-[#333]">
                <div className="p-6 flex items-center justify-between">
                   <div>
                      <div className="font-bold text-lg text-white">Safe Search</div>
                      <div className="text-streek-muted text-sm">Filter explicit content from results</div>
                   </div>
                   <Toggle checked={preferences.safeSearch} onChange={(v) => setPreferences({...preferences, safeSearch: v})} />
                </div>
                <div className="p-6 flex items-center justify-between">
                   <div>
                      <div className="font-bold text-lg text-white">Notifications</div>
                      <div className="text-streek-muted text-sm">Get updates on your workspace</div>
                   </div>
                   <Toggle checked={preferences.notifications} onChange={(v) => setPreferences({...preferences, notifications: v})} />
                </div>
                <div className="p-6 flex items-center justify-between">
                   <div>
                      <div className="font-bold text-lg text-white">High Contrast</div>
                      <div className="text-streek-muted text-sm">Increase visibility of text and icons</div>
                   </div>
                   <Toggle checked={preferences.highContrast} onChange={(v) => setPreferences({...preferences, highContrast: v})} />
                </div>
                <div className="p-6 flex items-center justify-between">
                   <div>
                      <div className="font-bold text-lg text-white">Data Saver</div>
                      <div className="text-streek-muted text-sm">Reduce data usage for slower connections</div>
                   </div>
                   <Toggle checked={preferences.dataSaver} onChange={(v) => setPreferences({...preferences, dataSaver: v})} />
                </div>
             </div>
          </div>
        );

      case 'account':
        if (!isLoggedIn) {
           return (
            <div className="max-w-md mx-auto px-4 pt-24 text-center">
               <CreditCardIcon className="w-16 h-16 text-streek-muted mx-auto mb-4" />
               <h2 className="text-2xl font-bold text-white mb-2">Account Restricted</h2>
               <p className="text-streek-muted mb-6">You must verify your identity to access account settings, billing, and security.</p>
               <button onClick={triggerAuth} className="bg-streek-neon text-streek-black font-bold px-6 py-3 rounded-xl hover:brightness-110">
                 Verify Identity (Sign In)
               </button>
            </div>
           );
        }
        return (
          <div className="max-w-2xl mx-auto px-4 pt-12 animate-in fade-in duration-300">
             <h2 className="text-3xl font-display font-bold text-streek-text mb-8 flex items-center gap-3">
               <CreditCardIcon className="w-8 h-8 text-streek-neon" /> Account & Security
             </h2>
             
             {/* Account Details - Real Time */}
             <div className="bg-streek-card rounded-2xl p-8 border border-[#333] mb-8">
               <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Identity Details</h3>
                    {!isEditingAccount ? (
                        <button 
                            onClick={() => {
                                setTempAccount({
                                    name: userProfile?.name || '',
                                    phone: userProfile?.phone || ''
                                });
                                setIsEditingAccount(true);
                            }}
                            className="text-streek-neon text-sm font-semibold hover:underline"
                        >
                            Edit
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={handleUpdateAccountDetails} className="text-green-500 text-sm font-bold hover:underline">Save</button>
                            <button onClick={() => setIsEditingAccount(false)} className="text-streek-muted text-sm hover:text-white">Cancel</button>
                        </div>
                    )}
               </div>
               
               <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#333] pb-2">
                   <span className="text-streek-muted mb-1 sm:mb-0">Full Name</span>
                   {isEditingAccount ? (
                        <input 
                            type="text" 
                            value={tempAccount.name} 
                            onChange={(e) => setTempAccount({...tempAccount, name: e.target.value})}
                            className="bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-white text-sm outline-none focus:border-streek-neon"
                        />
                   ) : (
                        <span className="font-medium text-right">{userProfile?.name}</span>
                   )}
                 </div>
                 
                 <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#333] pb-2">
                   <span className="text-streek-muted mb-1 sm:mb-0">Phone</span>
                   {isEditingAccount ? (
                        <input 
                            type="tel" 
                            value={tempAccount.phone} 
                            onChange={(e) => setTempAccount({...tempAccount, phone: e.target.value})}
                            className="bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-white text-sm outline-none focus:border-streek-neon"
                        />
                   ) : (
                        <span className="font-medium text-right">{userProfile?.phone || 'Not set'}</span>
                   )}
                 </div>

                 <div className="flex justify-between border-b border-[#333] pb-2">
                   <span className="text-streek-muted">StreekX ID</span>
                   <span className="font-medium text-streek-neon">{userProfile?.streekx_id}</span>
                 </div>
                 <div className="flex justify-between pb-2">
                   <span className="text-streek-muted">Created</span>
                   <span className="font-medium">Just now</span>
                 </div>
               </div>
             </div>

             {/* Security Section */}
             <div className="bg-streek-card rounded-2xl p-8 border border-[#333] mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Security</h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium text-white">Password</div>
                    <div className="text-xs text-streek-muted">Last changed: Never</div>
                  </div>
                  {!isChangingPassword ? (
                     <button onClick={() => setIsChangingPassword(true)} className="px-4 py-2 border border-[#444] rounded-lg hover:bg-[#333] text-sm transition-all text-white">
                        Update Password
                     </button>
                  ) : (
                     <button onClick={() => setIsChangingPassword(false)} className="px-4 py-2 bg-[#252525] rounded-lg text-sm text-streek-muted hover:text-white">
                        Cancel
                     </button>
                  )}
                </div>
                
                {isChangingPassword && (
                   <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#333] space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1">
                         <label className="text-xs uppercase text-streek-muted font-bold">New Password</label>
                         <input 
                           type="password" 
                           value={passwordForm.new}
                           onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                           className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg p-2 text-white text-sm outline-none focus:border-streek-neon"
                           placeholder="New password (min 6 chars)"
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-xs uppercase text-streek-muted font-bold">Confirm Password</label>
                         <input 
                           type="password" 
                           value={passwordForm.confirm}
                           onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                           className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg p-2 text-white text-sm outline-none focus:border-streek-neon"
                           placeholder="Confirm new password"
                         />
                      </div>
                      <button 
                        onClick={handleChangePassword}
                        className="w-full bg-streek-neon text-streek-black font-bold py-2 rounded-lg text-sm hover:brightness-110"
                      >
                         Update Password
                      </button>
                   </div>
                )}

                 <div className="flex items-center justify-between pt-4 border-t border-[#333]">
                  <div>
                    <div className="font-medium text-white">Two-Factor Auth</div>
                    <div className="text-xs text-streek-muted">Add an extra layer of security</div>
                  </div>
                   <Toggle checked={false} onChange={() => {}} />
                </div>
             </div>

             {/* Plan Card */}
             <div className="bg-gradient-to-br from-streek-card to-[#252525] rounded-2xl p-8 border border-[#333] relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <SparklesIcon className="w-48 h-48 text-streek-neon" />
                </div>
                <div className="relative z-10">
                   <div className="text-streek-muted text-sm uppercase tracking-widest font-semibold mb-2">Current Plan</div>
                   <div className="text-4xl font-display font-bold text-white mb-4">{accountStats.plan} Plan</div>
                   <p className="text-streek-muted mb-6 max-w-sm">You are on the free tier. Upgrade to Pro to unlock unlimited queries and faster processing.</p>
                   <button className="bg-streek-neon text-streek-black font-bold px-6 py-3 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-streek-neon/20">
                      Upgrade to Pro
                   </button>
                </div>
             </div>

             {/* Sign Out */}
             <div className="bg-red-500/5 rounded-2xl p-8 border border-red-500/20">
                <h3 className="text-xl font-bold text-white mb-4">Danger Zone</h3>
                <div className="flex items-center justify-between">
                   <span className="text-streek-muted">Sign out of your StreekX Identity on this device.</span>
                   <button onClick={handleLogout} className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg text-sm font-bold transition-all">
                      Sign Out
                   </button>
                </div>
             </div>

          </div>
        );

      case 'history':
        return (
          <div className="max-w-4xl mx-auto px-4 pt-12 animate-in fade-in duration-300">
             <h2 className="text-3xl font-display font-bold text-streek-text mb-8 flex items-center gap-3">
               <HistoryIcon className="w-8 h-8 text-streek-neon" /> History
             </h2>
             <div className="bg-streek-card rounded-2xl p-2 border border-[#333] overflow-hidden">
               {searchHistory.length === 0 ? (
                 <div className="p-8 text-center text-streek-muted">No history yet.</div>
               ) : (
                 <div className="divide-y divide-[#333]">
                    {searchHistory.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => handleSearch(item.query)}
                        className="flex items-center justify-between p-4 hover:bg-[#252525] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                           <div className="p-2 bg-[#0F0F0F] rounded-lg text-streek-muted group-hover:text-streek-neon transition-colors">
                              <SearchIcon className="w-5 h-5" />
                           </div>
                           <span className="text-streek-text font-medium text-lg">{item.query}</span>
                        </div>
                        <span className="text-sm text-streek-muted">{item.date}</span>
                      </div>
                    ))}
                 </div>
               )}
             </div>
          </div>
        );

      default:
        return null;
    }
  };

  // --- TOP LEVEL RENDER LOGIC FOR INTRO PHASES ---
  
  if (appPhase === 'splash') {
    return <SplashScreen onFinish={() => setAppPhase('onboarding')} />;
  }

  if (appPhase === 'onboarding') {
    return <OnboardingScreen onNext={() => setAppPhase('auth-selection')} />;
  }

  if (appPhase === 'auth-selection') {
    return (
      <AuthSelectionScreen 
        onSelect={(mode) => {
          setAuthMode(mode);
          setAppPhase('auth-form');
        }} 
        onSkip={() => setAppPhase('main')} 
      />
    );
  }

  if (appPhase === 'auth-form') {
    return (
      <AuthFormScreen 
        mode={authMode}
        onBack={() => setAppPhase('auth-selection')}
        onComplete={() => setAppPhase('main')}
        onSwitchMode={(newMode) => setAuthMode(newMode)}
      />
    );
  }

  // --- MAIN APP UI ---
  return (
    <div className="min-h-screen bg-streek-black font-sans text-streek-text overflow-x-hidden selection:bg-streek-neon/30 selection:text-streek-neon">
      {/* Background Glow Effect */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-streek-glow/40 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-streek-black/80 backdrop-blur-md border-b border-white/5 h-16">
        <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-8 flex-1">
             <button onClick={() => setCurrentView('home')} className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-streek-neon rounded-lg flex items-center justify-center text-streek-black font-bold text-xl font-display group-hover:scale-105 transition-transform">S</div>
                <span className="font-display font-bold text-xl tracking-tight hidden sm:block">Streek<span className="text-streek-neon">X</span></span>
             </button>
             {currentView !== 'home' && (
                <div className="hidden md:block w-full max-w-md animate-in fade-in duration-300">
                  <SearchInput 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                    onSearch={() => handleSearch()} 
                  />
                </div>
             )}
          </div>

          <div className="relative">
            {/* If NOT logged in (Guest), show Sign In button */}
            {!isLoggedIn ? (
               <button 
                 onClick={triggerAuth}
                 className="flex items-center gap-2 px-4 py-2 bg-streek-card hover:bg-[#333] border border-streek-neon/20 rounded-full transition-all group"
               >
                  <span className="text-sm font-bold text-streek-neon">Sign In</span>
                  <ArrowRightIcon className="w-4 h-4 text-streek-neon group-hover:translate-x-1 transition-transform" />
               </button>
            ) : (
              // If logged in, show User Menu
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all ${userMenuOpen ? 'bg-streek-card border-streek-neon/50' : 'border-transparent hover:bg-streek-card'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-streek-glow to-streek-neon flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                  <img src={userProfile?.avatar || 'https://picsum.photos/200/200'} alt="User" className="w-full h-full object-cover opacity-90" />
                </div>
                <span className="text-sm font-medium hidden sm:block">User</span>
                <MenuIcon className={`w-4 h-4 text-streek-muted transition-transform duration-200 ${userMenuOpen ? 'rotate-90' : ''}`} />
              </button>
            )}

            {userMenuOpen && isLoggedIn && (
               <>
                 <div className="fixed inset-0 bg-transparent z-40" onClick={() => setUserMenuOpen(false)}></div>
                 <div className="absolute right-0 top-full mt-2 w-72 bg-[#151515] border border-[#333] rounded-2xl shadow-2xl p-3 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-3 mb-2 flex items-center gap-3 border-b border-[#333]">
                        <div className="w-10 h-10 rounded-full bg-streek-card flex items-center justify-center overflow-hidden">
                           <img src={userProfile?.avatar || 'https://picsum.photos/200/200'} alt="User" className="w-full h-full object-cover" />
                        </div>
                        <div>
                           <div className="font-bold text-white text-sm line-clamp-1">{userProfile?.name}</div>
                           <div className="text-xs text-streek-muted line-clamp-1">{userProfile?.streekx_id}</div>
                        </div>
                    </div>
                    <div className="space-y-1">
                      <NavButton icon={<UserIcon className="w-4 h-4" />} label="Profile" active={currentView === 'profile'} onClick={() => handleNavClick('profile')} />
                      <NavButton icon={<HistoryIcon className="w-4 h-4" />} label="History" active={currentView === 'history'} onClick={() => handleNavClick('history')} />
                      <NavButton icon={<LayersIcon className="w-4 h-4" />} label="Workspace" active={currentView === 'workspace'} onClick={() => handleNavClick('workspace')} />
                      <NavButton icon={<SettingsIcon className="w-4 h-4" />} label="Preferences" active={currentView === 'preferences'} onClick={() => handleNavClick('preferences')} />
                      <div className="my-2 border-t border-[#333]"></div>
                      <NavButton icon={<CreditCardIcon className="w-4 h-4" />} label="Account" active={currentView === 'account'} onClick={() => handleNavClick('account')} />
                      <button 
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 mb-1 rounded-xl transition-all text-streek-muted hover:text-red-500 hover:bg-streek-card"
                      >
                        <span className="mr-3"><LogOutIcon className="w-4 h-4" /></span>
                        Sign Out
                      </button>
                    </div>
                 </div>
               </>
            )}
          </div>
        </div>
      </header>
      <main className="pt-16 min-h-screen relative z-10">
        {renderContent()}
      </main>
    </div>
  );
}