import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { firebaseConfig } from "../shared/firebase";

let instanceCounter = 0;

export async function withNewAuthAccount<T>(
  email: string,
  password: string,
  action: (ctx: { uid: string; db: Firestore }) => Promise<T>
): Promise<T> {
  const secondaryApp = initializeApp(
    firebaseConfig,
    `secondary-${Date.now()}-${instanceCounter++}`
  );

  try {
    const secondaryAuth = getAuth(secondaryApp);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const db = getFirestore(secondaryApp);
    return await action({ uid: credential.user.uid, db });
  } finally {
    try {
      await signOut(getAuth(secondaryApp));
    } catch {
      // best-effort cleanup, ignore
    }
    await deleteApp(secondaryApp);
  }
}
