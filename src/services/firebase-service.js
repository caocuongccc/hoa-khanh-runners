// FILE: src/services/firebase-service.js
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';

// ===== EVENTS =====
export async function createEvent(data) {
  try {
    const ref = await addDoc(collection(db, 'events'), {
      ...data,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: ref.id };
  } catch (error) {
    console.error('Error creating event:', error);
    return { success: false, error: error.message };
  }
}

export async function getEvents() {
  try {
    const q = query(collection(db, 'events'));
    const snap = await getDocs(q);
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, data: events };
  } catch (error) {
    console.error('Error getting events:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getEventById(id) {
  try {
    const ref = doc(db, 'events', id);
    const s = await getDoc(ref);
    if (!s.exists()) return { success: false, error: 'Event not found' };
    return { success: true, data: { id: s.id, ...s.data() } };
  } catch (error) {
    console.error('Error getting event:', error);
    return { success: false, error: error.message };
  }
}

export async function updateEvent(id, data) {
  try {
    const ref = doc(db, 'events', id);
    await updateDoc(ref, data);
    return { success: true };
  } catch (error) {
    console.error('Error updating event:', error);
    return { success: false, error: error.message };
  }
}

// ===== RULES =====
export async function getRules() {
  try {
    const q = query(collection(db, 'rules'));
    const snap = await getDocs(q);
    const rules = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, data: rules };
  } catch (error) {
    console.error('Error getting rules:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getRuleById(id) {
  try {
    const ref = doc(db, 'rules', id);
    const s = await getDoc(ref);
    if (!s.exists()) return { success: false, error: 'Rule not found' };
    return { success: true, data: { id: s.id, ...s.data() } };
  } catch (error) {
    console.error('Error getting rule:', error);
    return { success: false, error: error.message };
  }
}

// ===== RULE GROUPS =====
export async function getRuleGroups() {
  try {
    const q = query(collection(db, 'ruleGroups'));
    const snap = await getDocs(q);
    const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, data: groups };
  } catch (error) {
    console.error('Error getting rule groups:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getRuleGroupById(id) {
  try {
    const ref = doc(db, 'ruleGroups', id);
    const s = await getDoc(ref);
    if (!s.exists()) return { success: false, error: 'Rule group not found' };
    return { success: true, data: { id: s.id, ...s.data() } };
  } catch (error) {
    console.error('Error getting rule group:', error);
    return { success: false, error: error.message };
  }
}

// ===== TRACK LOGS =====
export async function saveTrackLog(data) {
  try {
    const ref = await addDoc(collection(db, 'trackLogs'), {
      ...data,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: ref.id };
  } catch (error) {
    console.error('Error saving track log:', error);
    return { success: false, error: error.message };
  }
}

export async function getTrackLogsByUser(userId) {
  try {
    const q = query(
      collection(db, 'trackLogs'), 
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, data: logs };
  } catch (error) {
    console.error('Error getting track logs:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getTrackLogsByEvent(eventId) {
  try {
    const q = query(
      collection(db, 'trackLogs'), 
      where('eventId', '==', eventId)
    );
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, data: logs };
  } catch (error) {
    console.error('Error getting track logs:', error);
    return { success: false, error: error.message, data: [] };
  }
}