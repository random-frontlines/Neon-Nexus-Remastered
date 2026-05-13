import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth } from '../AuthContext';
import { Mail } from 'lucide-react';

export default function LoginMenu() {
  const { user, username, setUsername } = useAuth();
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setLoading(true);
    try {
      await setUsername(nameInput.trim());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 bg-[#020617] flex flex-col items-center justify-center backdrop-blur-xl z-50">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-900/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="p-12 border border-sky-900/30 rounded-3xl bg-slate-900/40 shadow-[0_0_80px_rgba(14,165,233,0.15)] text-center backdrop-blur-2xl relative overflow-hidden flex flex-col items-center max-w-md w-full">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 tracking-[0.25em] mb-4 uppercase drop-shadow-md">Nexus Login</h1>
        
        {!user ? (
          <>
            <p className="text-slate-400 text-sm mb-8 uppercase tracking-[0.1em]">Authenticate to access command</p>
            <button 
              onClick={handleLogin}
              className="flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors w-full justify-center"
            >
               <Mail className="w-5 h-5" />
               Sign In with Google
            </button>
          </>
        ) : (
          <form className="w-full flex flex-col gap-4" onSubmit={handleSetUsername}>
            <p className="text-slate-300 text-sm mb-4 uppercase tracking-[0.1em]">Create your callsign</p>
            <input 
              type="text" 
              placeholder="Username" 
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={loading}
              className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-sky-500 transition-colors"
              minLength={3}
              maxLength={32}
              required
            />
            <button 
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl font-bold uppercase tracking-widest transition-colors w-full"
            >
              {loading ? 'Registering...' : 'Enter Nexus'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
