import { useEffect, useState } from 'react';
import { auth, firestore } from '../../services/shared/firebase';
import {
  User,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { UserLevel } from './types'
import { Timestamp, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { setCurrentCompanyId } from '../../services/shared/tenant';
import { CompanyPlan } from '../../types/company';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyPlan, setCompanyPlan] = useState<CompanyPlan | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<Timestamp | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [profileReady, setProfileReady] = useState(false);
  const [superAdminReady, setSuperAdminReady] = useState(false);
  const [companyReady, setCompanyReady] = useState(false);
  const loading = !(profileReady && superAdminReady && companyReady);

  const trialExpired = companyPlan === 'trial' && trialEndsAt !== null && trialEndsAt.toMillis() < Date.now();
  const trialDaysRemaining =
    companyPlan === 'trial' && trialEndsAt !== null
      ? Math.ceil((trialEndsAt.toMillis() - Date.now()) / (24 * 60 * 60 * 1000))
      : null;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (!user) {
        setProfileReady(true);
        setSuperAdminReady(true);
      } else {
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
      setCompanyReady(true);
      return;
    }

    const userDocRef = doc(firestore, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, snap => {
      const data = snap.data();

      if (data?.disabled === true) {
        signOut(auth);
        setCurrentUser(null);
        return;
      }

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

  useEffect(() => {
    if (!companyId) {
      setCompanyName(null);
      setCompanyPlan(null);
      setTrialEndsAt(null);
      setCompanyReady(true);
      return;
    }

    const companyRef = doc(firestore, 'companies', companyId);
    const unsubscribe = onSnapshot(
      companyRef,
      snap => {
        const data = snap.data();
        setCompanyName((data?.name as string) ?? null);
        setCompanyPlan((data?.plan as CompanyPlan) ?? null);
        setTrialEndsAt((data?.trialEndsAt as Timestamp) ?? null);
        setCompanyReady(true);
      },
      () => {
        setCompanyReady(true);
      }
    );

    return unsubscribe;
  }, [companyId]);

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

  const resetPassword = async (loginId: string) => {
    try {
      const loginDoc = await getDoc(doc(firestore, 'logins', loginId));
      if (!loginDoc.exists()) return;

      const email = loginDoc.data().email as string;
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      void error;
    }
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
        companyName,
        companyPlan,
        trialEndsAt,
        trialExpired,
        trialDaysRemaining,
        modules,
        mustChangePassword,
        isSuperAdmin,
        isAdmin: userLevel === 'Admin' || userLevel === 'Manager',
        loading,
        login,
        logout,
        changePassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
