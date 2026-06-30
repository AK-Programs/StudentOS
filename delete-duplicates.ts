import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId);

async function deleteDuplicates() {
  const materialsRef = collection(db, 'materials');
  const snapshot = await getDocs(materialsRef);
  
  const materials = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  
  // Find materials with "The Fun they had" in the title
  const theFunMaterials = materials.filter(m => m.title && m.title.toLowerCase().includes('the fun they had'));
  
  console.log(`Found ${theFunMaterials.length} materials matching "The Fun they had"`);
  
  // Keep the latest one, or first one
  if (theFunMaterials.length > 1) {
    const toDelete = theFunMaterials.slice(1);
    console.log(`Deleting ${toDelete.length} duplicates...`);
    
    for (const mat of toDelete) {
        console.log(`Deleting doc ID: ${mat.id}`);
        await deleteDoc(doc(db, 'materials', mat.id));
    }
    console.log('Duplicates deleted successfully.');
  } else {
    console.log('No duplicates found.');
  }

  // Also remove exact duplicate filenames globally just to be safe
  const filenameMap = new Map();
  let deletedCount = 0;
  for (const docSnapshot of snapshot.docs) {
      const mat = docSnapshot.data();
      if (mat.fileName) {
          if (filenameMap.has(mat.fileName)) {
             try {
               await deleteDoc(doc(db, 'materials', docSnapshot.id));
               deletedCount++;
               console.log(`Deleted exact filename duplicate: ${mat.fileName} (${docSnapshot.id})`);
             } catch (e) {
               console.error(e);
             }
          } else {
             filenameMap.set(mat.fileName, true);
          }
      }
  }
  console.log(`Deleted ${deletedCount} overall filename duplicates.`);
}

deleteDuplicates().then(() => {
  console.log("Exiting normally.");
  process.exit(0);
}).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
