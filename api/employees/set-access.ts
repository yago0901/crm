import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0];

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set.");
  }
  const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  return initializeApp({ credential: cert(serviceAccount) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = req.headers.authorization ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!idToken) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const { targetUid, disabled } = (req.body ?? {}) as { targetUid?: string; disabled?: boolean };
  if (typeof targetUid !== "string" || !targetUid || typeof disabled !== "boolean") {
    res.status(400).json({ error: "targetUid (string) and disabled (boolean) are required" });
    return;
  }

  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    const caller = await auth.verifyIdToken(idToken);

    const callerProfileSnap = await firestore.doc(`users/${caller.uid}`).get();
    const callerProfile = callerProfileSnap.data();
    if (!callerProfile || !["Admin", "Manager"].includes(callerProfile.level)) {
      res.status(403).json({ error: "Only an Admin or Manager can change employee access" });
      return;
    }

    if (targetUid === caller.uid) {
      res.status(400).json({ error: "Cannot change your own access through this action" });
      return;
    }

    const targetProfileSnap = await firestore.doc(`users/${targetUid}`).get();
    const targetProfile = targetProfileSnap.data();
    if (!targetProfile || targetProfile.companyId !== callerProfile.companyId) {
      res.status(403).json({ error: "Target user is not part of your company" });
      return;
    }

    const companySnap = await firestore.doc(`companies/${callerProfile.companyId}`).get();
    if (companySnap.data()?.primaryUserId === targetUid) {
      res.status(400).json({ error: "Cannot disable the company's primary account" });
      return;
    }

    await auth.updateUser(targetUid, { disabled });
    await firestore.doc(`users/${targetUid}`).update({ disabled });

    await firestore.collection("auditLogs").add({
      companyId: callerProfile.companyId,
      entityType: "users",
      entityId: targetUid,
      entitySummary: targetProfile.login ?? targetUid,
      action: "update",
      changedFields: [{ field: "disabled", before: targetProfile.disabled ?? false, after: disabled }],
      ownerId: caller.uid,
      ownerName: caller.email ?? "",
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ uid: targetUid, disabled });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
}
