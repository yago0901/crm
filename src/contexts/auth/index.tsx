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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // `loading` must not clear until BOTH the profile (companyId) and the
  // platformAdmins listeners have delivered their first snapshot -- two
  // independent, differently-timed Firestore calls. It's derived directly
  // from these two flags on every render (not mirrored into its own state
  // via an effect) on purpose: an effect-driven copy lags one render behind
  // the render where `currentUser` and these flags actually change together,
  // and route guards reading `loading` during that one stale render would
  // see it still `false` from before the sign-in -- the same race this is
  // meant to prevent, just moved instead of fixed.
  const [profileReady, setProfileReady] = useState(false);
  const [superAdminReady, setSuperAdminReady] = useState(false);
  const loading = !(profileReady && superAdminReady);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (!user) {
        // Nothing to load for a signed-out visitor.
        setProfileReady(true);
        setSuperAdminReady(true);
      } else {
        // Reset so a freshly signed-in user's own listeners are what
        // gate `loading`, not leftover state from whoever was signed in
        // before.
        setProfileReady(false);
        setSuperAdminReady(false);
      }
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
      setProfileReady(true);
    });

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setIsSuperAdmin(false);
      return;
    }

    const platformAdminRef = doc(firestore, 'platformAdmins', currentUser.uid);
    const unsubscribe = onSnapshot(
      platformAdminRef,
      snap => {
        setIsSuperAdmin(snap.exists());
        setSuperAdminReady(true);
      },
      error => {
        console.error('[SuperAdmin check] failed for uid=%s', currentUser.uid, error);
        setIsSuperAdmin(false);
        setSuperAdminReady(true);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const login = async (loginId: string, password: string) => {
    const loginDoc = await getDoc(doc(firestore, 'logins', loginId));
    if (!loginDoc.exists()) {
      throw new Error('Usuário ou senha inválidos.');
    }

    const email = loginDoc.data().email as string;
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
        isSuperAdmin,
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
