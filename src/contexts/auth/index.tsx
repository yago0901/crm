import { createContext, useContext, useEffect, useState } from 'react';
import { auth, firestore } from '../../services/shared/firebase';
import { User, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { IAuthContextType, UserLevel } from './types'
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
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
  const [mustChangePassword, setMustChangePassword] = useState(false);
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
      setMustChangePassword(false);
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
      setMustChangePassword((data?.mustChangePassword as boolean) ?? false);
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

  const changePassword = async (newPassword: string) => {
    if (!auth.currentUser) {
      throw new Error('Nenhum usuário autenticado.');
    }

    await updatePassword(auth.currentUser, newPassword);
    await updateDoc(doc(firestore, 'users', auth.currentUser.uid), {
      mustChangePassword: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userLevel,
        companyId,
        modules,
        mustChangePassword,
        isAdmin: userLevel === 'Admin',
        loading,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
