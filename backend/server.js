// backend/server.js
// Full Node.js + Express backend for email alerts
// Run: npm install && node server.js
// This handles: emergency contact emails, stock alerts, expiry alerts

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const cron = require('node-cron');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
const serviceAccount = require('./serviceAccountKey.json'); // Download from Firebase Console
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ─── Nodemailer Transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use App Password (not your real Gmail password)
  },
});

// ─── Email Templates ──────────────────────────────────────────────────────────
function missedDoseEmail(userName, medicineName, time) {
  return `
  <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border-radius:12px;border:1px solid #e2f0ef">
    <h2 style="color:#ef4444">⚠️ Missed Dose Alert</h2>
    <p>Hello,</p>
    <p><strong>${userName}</strong> missed their <strong>${medicineName}</strong> dose scheduled at <strong>${time}</strong>.</p>
    <p>Please check in with them.</p>
    <hr style="border-color:#e2f0ef"/>
    <p style="font-size:12px;color:#888">Sent by Apothecary — Smart Medicine Reminder</p>
  </div>`;
}

function lowStockEmail(userName, medicineName, remaining, total) {
  const pct = Math.round((remaining / total) * 100);
  return `
  <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border-radius:12px;border:1px solid #fef3c7">
    <h2 style="color:#f59e0b">📦 Low Stock Alert</h2>
    <p>Hello ${userName},</p>
    <p>Your medicine <strong>${medicineName}</strong> is running low.</p>
    <p>Stock remaining: <strong>${remaining} doses (${pct}%)</strong></p>
    <p>Please reorder soon to avoid missing doses.</p>
    <hr style="border-color:#fef3c7"/>
    <p style="font-size:12px;color:#888">Sent by Apothecary — Smart Medicine Reminder</p>
  </div>`;
}

function expiryEmail(userName, medicineName, expiryDate, daysLeft) {
  return `
  <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border-radius:12px;border:1px solid #fecaca">
    <h2 style="color:#ef4444">🕐 Expiry Alert</h2>
    <p>Hello ${userName},</p>
    <p>Your medicine <strong>${medicineName}</strong> expires on <strong>${expiryDate}</strong> (${daysLeft} days remaining).</p>
    <p>Please replace it before it expires.</p>
    <hr style="border-color:#fecaca"/>
    <p style="font-size:12px;color:#888">Sent by Apothecary — Smart Medicine Reminder</p>
  </div>`;
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// Send missed dose alert to emergency contacts
app.post('/api/alert/missed-dose', async (req, res) => {
  const { userId, medicineName, time } = req.body;
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();
    const contacts = (user.emergencyContacts || []).sort((a, b) => a.priority - b.priority);
    if (contacts.length === 0) return res.json({ sent: false, reason: 'No contacts' });

    // Send to highest priority contact
    const contact = contacts[0];
    await transporter.sendMail({
      from: `"Apothecary" <${process.env.EMAIL_USER}>`,
      to: contact.email,
      subject: `⚠️ Missed Dose Alert: ${user.name} missed ${medicineName}`,
      html: missedDoseEmail(user.name, medicineName, time),
    });
    res.json({ sent: true, to: contact.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Send low stock alert to user
app.post('/api/alert/low-stock', async (req, res) => {
  const { userId, medicineName, remaining, total } = req.body;
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();
    await transporter.sendMail({
      from: `"Apothecary" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `📦 Low Stock: ${medicineName} needs reordering`,
      html: lowStockEmail(user.name, medicineName, remaining, total),
    });
    res.json({ sent: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Cron Jobs ────────────────────────────────────────────────────────────────

// Run every day at 8 AM — check expiry dates
cron.schedule('0 8 * * *', async () => {
  console.log('🔄 Running daily expiry check...');
  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    const medsSnap = await db.collection('users').doc(userDoc.id).collection('medicines').get();
    for (const medDoc of medsSnap.docs) {
      const med = medDoc.data();
      if (!med.expiryDate) continue;
      const daysLeft = Math.ceil((new Date(med.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft === 30 || daysLeft === 7) {
        await transporter.sendMail({
          from: `"Apothecary" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: `🕐 Medicine Expiring Soon: ${med.name} (${daysLeft} days left)`,
          html: expiryEmail(user.name, med.name, med.expiryDate, daysLeft),
        });
        console.log(`✅ Expiry email sent to ${user.email} for ${med.name}`);
      }
    }
  }
});

// Run every 5 min — auto-mark missed doses (server-side fallback)
cron.schedule('*/5 * * * *', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    const medsSnap = await db.collection('users').doc(userDoc.id).collection('medicines').get();
    for (const medDoc of medsSnap.docs) {
      const med = medDoc.data();
      if (med.vacationMode) continue;
      for (const time of (med.times || [])) {
        const [h, m] = time.split(':').map(Number);
        const doseMinutes = h * 60 + m;
        if (nowMinutes - doseMinutes < 30 || nowMinutes - doseMinutes > 35) continue;

        // Check if already logged
        const existing = await db.collection('users').doc(userDoc.id)
          .collection('doseHistory')
          .where('date', '==', today)
          .where('medicineId', '==', medDoc.id)
          .where('time', '==', time)
          .get();

        if (existing.empty) {
          await db.collection('users').doc(userDoc.id).collection('doseHistory').add({
            medicineId: medDoc.id, medicineName: med.name,
            date: today, time, status: 'missed',
            profileId: med.profileId, autoMissed: true,
            timestamp: admin.firestore.Timestamp.now(),
          });
          console.log(`⚠️ Auto-missed: ${med.name} at ${time} for user ${userDoc.id}`);

          // Trigger emergency email
          const user = userDoc.data();
          const contacts = (user.emergencyContacts || []).sort((a, b) => a.priority - b.priority);
          if (contacts[0]) {
            await transporter.sendMail({
              from: `"Apothecary" <${process.env.EMAIL_USER}>`,
              to: contacts[0].email,
              subject: `⚠️ Missed Dose: ${user.name || user.email} missed ${med.name}`,
              html: missedDoseEmail(user.name || 'User', med.name, time),
            });
          }
        }
      }
    }
  }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Apothecary backend running on port ${PORT}`));
