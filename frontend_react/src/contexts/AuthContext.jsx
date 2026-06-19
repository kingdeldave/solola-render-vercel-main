// Contexte global d'authentification : expose l'utilisateur Firebase et son profil Firestore.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { ensureUserProfile } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setProfile(null);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        await ensureUserProfile(user);
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
          setProfile(snapshot.exists() ? snapshot.data() : null);
          setLoading(false);
        });
      } catch (error) {
        console.error('Erreur profil Firebase', error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      isAuthenticated: Boolean(firebaseUser),
      isAdmin: profile?.role === 'ADMIN',
    }),
    [firebaseUser, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth doit être utilisé dans AuthProvider.');
  }
  return value;
}
