// src/firebase/seed.js
// Run this ONCE to populate demo data
// Usage: node src/firebase/seed.js (after setting up .env)

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { subDays, addDays, format } from 'date-fns';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEMO_EMAIL = 'demo@medreminder.com';
const DEMO_PASSWORD = 'Demo@1234';

async function seed() {
  console.log('🌱 Seeding demo data...');

  // Create demo user
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    uid = cred.user.uid;
    console.log('✅ Demo user created:', DEMO_EMAIL);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Demo user already exists, skipping creation');
      return;
    }
    throw e;
  }

  // Create user profile
  await setDoc(doc(db, 'users', uid), {
    email: DEMO_EMAIL,
    name: 'Demo User',
    emergencyContacts: [{ name: 'Emergency Contact', email: 'emergency@example.com', priority: 1 }],
    profiles: [
      { id: 'self', name: 'Myself', relation: 'self' },
      { id: 'parent', name: 'Parent', relation: 'parent' },
    ],
    activeProfile: 'self',
    createdAt: Timestamp.now(),
  });

  // Create medicines
  const medicines = [
    {
      name: 'Metformin',
      dosage: '500mg',
      type: 'Tablet',
      times: ['08:00', '20:00'],
      quantity: 60,
      totalQuantity: 60,
      expiryDate: format(addDays(new Date(), 180), 'yyyy-MM-dd'),
      profileId: 'self',
      vacationMode: false,
      vacationDates: [],
      color: '#0d9488',
      createdAt: Timestamp.now(),
    },
    {
      name: 'Lisinopril',
      dosage: '10mg',
      type: 'Tablet',
      times: ['09:00'],
      quantity: 28,
      totalQuantity: 30,
      expiryDate: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
      profileId: 'self',
      vacationMode: false,
      vacationDates: [],
      color: '#8b5cf6',
      createdAt: Timestamp.now(),
    },
    {
      name: 'Vitamin D3',
      dosage: '1000 IU',
      type: 'Capsule',
      times: ['07:30'],
      quantity: 90,
      totalQuantity: 90,
      expiryDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
      profileId: 'self',
      vacationMode: false,
      vacationDates: [],
      color: '#f59e0b',
      createdAt: Timestamp.now(),
    },
  ];

  const medIds = [];
  for (const med of medicines) {
    const ref = await addDoc(collection(db, 'users', uid, 'medicines'), med);
    medIds.push(ref.id);
    console.log(`✅ Medicine added: ${med.name}`);
  }

  // Create dose history for last 7 days
  const statuses = ['taken', 'taken', 'taken', 'missed', 'taken', 'snoozed', 'taken'];
  for (let d = 6; d >= 0; d--) {
    const date = subDays(new Date(), d);
    const dateStr = format(date, 'yyyy-MM-dd');
    for (const medId of medIds) {
      const med = medicines[medIds.indexOf(medId)];
      for (const time of med.times) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        await addDoc(collection(db, 'users', uid, 'doseHistory'), {
          medicineId: medId,
          medicineName: med.name,
          date: dateStr,
          time,
          status,
          timestamp: Timestamp.fromDate(date),
          profileId: 'self',
        });
      }
    }
  }

  console.log('✅ Dose history created for 7 days');
  console.log('\n🎉 Seed complete!');
  console.log(`📧 Login: ${DEMO_EMAIL}`);
  console.log(`🔑 Password: ${DEMO_PASSWORD}`);
  process.exit(0);
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
