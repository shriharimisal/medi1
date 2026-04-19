// src/components/Notifications/ReminderSystem.jsx
import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ReminderSystem() {
  const { currentUser, activeProfile } = useAuth();
  const [reminders, setReminders] = useState([]); // active toasts
  const timersRef = useRef([]);
  const checkRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    requestNotificationPermission();
    setupReminders();
    // Check every minute
    checkRef.current = setInterval(setupReminders, 60 * 1000);
    return () => {
      clearInterval(checkRef.current);
      timersRef.current.forEach(t => clearTimeout(t));
    };
    // eslint-disable-next-line
  }, [currentUser, activeProfile]);

  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  async function setupReminders() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Load medicines
    const medsSnap = await getDocs(
      query(collection(db, 'users', currentUser.uid, 'medicines'),
        where('profileId', '==', activeProfile))
    );
    const medicines = medsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Load today's history
    const histSnap = await getDocs(
      query(collection(db, 'users', currentUser.uid, 'doseHistory'),
        where('date', '==', today), where('profileId', '==', activeProfile))
    );
    const history = histSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const med of medicines) {
      if (med.vacationMode) continue;
      for (const time of (med.times || [])) {
        const [h, m] = time.split(':').map(Number);
        const doseMinutes = h * 60 + m;
        const diff = doseMinutes - nowMinutes;
        const alreadyLogged = history.find(
          e => e.medicineId === med.id && e.time === time && ['taken','missed'].includes(e.status)
        );
        if (alreadyLogged) continue;

        // Within ±1 min of dose time → show reminder
        if (diff >= -1 && diff <= 1) {
          const alreadyShowing = reminders.find(r => r.medicineId === med.id && r.time === time);
          if (!alreadyShowing) {
            showReminder(med, time, today);
            sendBrowserNotification(med, time);
          }
          // Schedule auto-miss after 30 min
          const missTimer = setTimeout(() => autoMiss(med, time, today), 30 * 60 * 1000);
          timersRef.current.push(missTimer);
        }
      }
    }
  }

  function showReminder(med, time, date) {
    const id = `${med.id}_${time}`;
    setReminders(prev => [...prev.filter(r => r.id !== id), { id, medicineId: med.id, medicineName: med.name, dosage: med.dosage, time, date, color: med.color }]);
  }

  function sendBrowserNotification(med, time) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`💊 Time for ${med.name}`, {
        body: `${med.dosage} · Scheduled at ${time}`,
        icon: '/pill.svg',
      });
    }
  }

  async function logDose(reminder, status) {
    const today = format(new Date(), 'yyyy-MM-dd');
    // Check if already logged
    const histSnap = await getDocs(
      query(collection(db, 'users', currentUser.uid, 'doseHistory'),
        where('date', '==', today),
        where('medicineId', '==', reminder.medicineId),
        where('time', '==', reminder.time))
    );

    if (histSnap.empty) {
      await addDoc(collection(db, 'users', currentUser.uid, 'doseHistory'), {
        medicineId: reminder.medicineId,
        medicineName: reminder.medicineName,
        date: today,
        time: reminder.time,
        status,
        profileId: activeProfile,
        timestamp: Timestamp.now(),
      });
    } else {
      await updateDoc(doc(db, 'users', currentUser.uid, 'doseHistory', histSnap.docs[0].id), { status });
    }

    // Reduce stock if taken
    if (status === 'taken') {
      const medRef = doc(db, 'users', currentUser.uid, 'medicines', reminder.medicineId);
      const medSnap = await getDocs(
        query(collection(db, 'users', currentUser.uid, 'medicines'), where('__name__', '==', reminder.medicineId))
      );
      if (!medSnap.empty) {
        const med = medSnap.docs[0].data();
        const newQty = Math.max(0, (med.quantity || 0) - 1);
        await updateDoc(medRef, { quantity: newQty });

        const pct = newQty / med.totalQuantity;
        if (pct <= 0.05) toast('🚨 Critical: Only ' + newQty + ' doses left for ' + med.name, { icon: '⚠️' });
        else if (pct <= 0.10) toast('⚠️ Stock alert: 10% remaining for ' + med.name);
        else if (pct <= 0.25) toast('📦 Stock alert: 25% remaining for ' + med.name);
      }
    }

    if (status === 'snoozed') {
      toast(`⏰ Snoozed — will remind again in 10 minutes`);
      setTimeout(() => showReminder({ id: reminder.medicineId, ...reminder }, reminder.time, today), 10 * 60 * 1000);
    } else {
      toast.success(status === 'taken' ? '✅ Dose marked as taken!' : '❌ Dose marked as missed');
    }

    dismissReminder(reminder.id);
  }

  function dismissReminder(id) {
    setReminders(prev => prev.filter(r => r.id !== id));
  }

  async function autoMiss(med, time, date) {
    const histSnap = await getDocs(
      query(collection(db, 'users', currentUser.uid, 'doseHistory'),
        where('date', '==', date), where('medicineId', '==', med.id), where('time', '==', time))
    );
    if (histSnap.empty) {
      await addDoc(collection(db, 'users', currentUser.uid, 'doseHistory'), {
        medicineId: med.id, medicineName: med.name, date, time,
        status: 'missed', profileId: activeProfile, timestamp: Timestamp.now(),
        autoMissed: true,
      });
      toast.error(`⏰ Auto-marked missed: ${med.name} at ${time}`, { duration: 6000 });
    }
    dismissReminder(`${med.id}_${time}`);
  }

  if (reminders.length === 0) return null;

  return (
    <div className="reminder-toast">
      {reminders.map(r => (
        <div key={r.id} className="reminder-card" style={{ borderLeftColor: r.color || 'var(--primary)' }}>
          <div className="reminder-name">💊 {r.medicineName}</div>
          <div className="reminder-time">{r.dosage} · Scheduled at {r.time}</div>
          <div className="reminder-actions">
            <button className="reminder-btn r-taken" onClick={() => logDose(r, 'taken')}>✅ Taken</button>
            <button className="reminder-btn r-missed" onClick={() => logDose(r, 'missed')}>❌ Missed</button>
            <button className="reminder-btn r-snooze" onClick={() => logDose(r, 'snoozed')}>⏸ Snooze</button>
          </div>
        </div>
      ))}
    </div>
  );
}
