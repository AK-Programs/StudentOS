import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, collection, getDocs, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const resolvedApiKey = import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;
const resolvedAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain;
const resolvedProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
const resolvedStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket;
const resolvedMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId;
const resolvedAppId = import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId;
const resolvedMeasurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId;
const resolvedFirestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

const app = initializeApp({
  apiKey: resolvedApiKey,
  authDomain: resolvedAuthDomain,
  projectId: resolvedProjectId,
  storageBucket: resolvedStorageBucket,
  messagingSenderId: resolvedMessagingSenderId,
  appId: resolvedAppId,
  measurementId: resolvedMeasurementId || undefined
});
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, resolvedFirestoreDatabaseId || undefined); /* CRITICAL: The app will break without this line */
export const auth = getAuth();
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  userRole?: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = false) {
  let userRole: string | null = null;
  try {
    const cached = localStorage.getItem('s_os_user');
    if (cached && cached !== "undefined") {
      const parsed = JSON.parse(cached);
      userRole = parsed.role || null;
    }
  } catch (e) {
    // Ignore cache retrieval errors
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    userRole,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error(`[Firestore Error Logging] Collection: ${path}, Operation: ${operationType}, User Role: ${userRole || 'Unknown'}. Details:`, JSON.stringify(errInfo));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// CRITICAL CONSTRAINT: Test database connection upon app initial boot/import
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export async function sendNotificationToUsers({
  title,
  message,
  type,
  targetGrades,
  targetSections,
  targetRoles,
  specificUserId
}: {
  title: string;
  message: string;
  type: 'notice' | 'assignment' | 'worksheet' | 'homework' | 'attendance' | 'marks' | 'general';
  targetGrades?: string[];
  targetSections?: string[];
  targetRoles?: string[];
  specificUserId?: string;
}) {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const notificationsToCreate: any[] = [];

    usersSnap.forEach(d => {
      const u = { id: d.id, ...d.data() } as any;
      const userUid = d.id;
      const userEmail = u.email;

      // Filter logic
      if (specificUserId) {
        if (userUid !== specificUserId && userEmail !== specificUserId) {
          return;
        }
      }

      if (targetRoles && !targetRoles.includes(u.role)) {
        return;
      }

      if (u.role === 'student') {
        if (targetGrades && !targetGrades.includes('All Grades') && !targetGrades.includes('All') && !targetGrades.includes(u.grade)) {
          return;
        }
        if (targetSections && !targetSections.includes('All Sections') && !targetSections.includes('All') && !targetSections.includes(u.section)) {
          return;
        }
      } else if (u.role === 'teacher') {
        if (targetGrades && !targetGrades.includes('All Grades') && !targetGrades.includes('All')) {
          const hasAssignedGrade = u.assignedGrades?.some((g: string) => targetGrades.includes(g));
          if (!hasAssignedGrade) return;
        }
      } else if (u.role === 'coordinator') {
        const isAcademic = ['assignment', 'worksheet', 'homework', 'marks', 'attendance', 'notice'].includes(type);
        if (!isAcademic) return;
      }

      // If we got here, user matches the criteria!
      const notifId = `notif-${userUid}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      notificationsToCreate.push({
        id: notifId,
        userId: userUid,
        title,
        message,
        type,
        createdAt: Date.now(),
        read: false
      });
    });

    const promises = notificationsToCreate.map(notif => 
      setDoc(doc(db, 'notifications', notif.id), notif)
    );
    await Promise.all(promises);
    console.log(`[Notification Dispatcher] Created ${notificationsToCreate.length} notifications of type ${type}`);
  } catch (err) {
    console.error('Error creating notifications:', err);
  }
}
