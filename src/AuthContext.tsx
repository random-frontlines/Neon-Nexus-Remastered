import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  username: string | null;
  loading: boolean;
  setUsername: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  username: null,
  loading: true,
  setUsername: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch username
        try {
           const d = await getDoc(doc(db, 'users', u.uid));
           if (d.exists() && d.data().username) {
              setUsernameState(d.data().username);
           } else {
              setUsernameState(null);
           }
        } catch (e) {
           console.error(e);
        }
      } else {
        setUsernameState(null);
      }
      setLoading(false);
    });
  }, []);

  const setUsername = async (name: string) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), { username: name, email: user.email }, { merge: true });
    setUsernameState(name);
  };

  return (
    <AuthContext.Provider value={{ user, username, loading, setUsername }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
