import { createContext, useContext, useEffect, useState } from 'react';
import { auth, firestore } from '../../services/firebase';
import { User, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { IAuthContextType } from './types'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

const AuthContext = createContext<IAuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {

    const cachedUser = localStorage.getItem("currentUser");
    return cachedUser ? JSON.parse(cachedUser) : null;
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('currentUser');
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    if (user) {
      // Verifique se o usuário já tem um documento no Firestore
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Crie um novo documento para o usuário
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        sector: 'Default', // Setor padrão (personalize conforme necessário)
        level: 'User', // Nível padrão (personalize conforme necessário)
        createdAt: serverTimestamp(),
      });
    }

      localStorage.setItem('currentUser', JSON.stringify(user));
      setCurrentUser(user);
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
