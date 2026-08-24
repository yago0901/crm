import { createContext, useContext, useEffect, useState } from 'react';
import { auth, firestore } from '../../services/shared/firebase';
import { User, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { IAuthContextType, UserLevel } from './types'
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { setCurrentCompanyId } from '../../services/shared/tenant';

const AuthContext = createContext<IAuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserLevel(null);
      setCompanyId(null);
      setModules([]);
      setCurrentCompanyId(null);
      return;
    }

    const userDocRef = doc(firestore, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, snap => {
      const data = snap.data();
      const nextCompanyId = (data?.companyId as string) ?? null;
      setUserLevel((data?.level as UserLevel) ?? 'User');
      setCompanyId(nextCompanyId);
      setModules((data?.modules as string[]) ?? []);
      setCurrentCompanyId(nextCompanyId);
    });

    return unsubscribe;
  }, [currentUser]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await signOut(auth);
      throw new Error(
        'Esta conta ainda não foi configurada corretamente. Fale com o administrador.'
      );
    }

    setCurrentUser(user);
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userLevel,
        companyId,
        modules,
        isAdmin: userLevel === 'Admin',
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
