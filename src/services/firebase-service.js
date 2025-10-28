// src/services/firebase-service.js
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where } from 'firebase/firestore';


export async function createEvent(data) {
const ref = await addDoc(collection(db, 'events'), {
...data,
createdAt: new Date().toISOString()
});
return ref.id;
}


export async function getEvents() {
const q = query(collection(db, 'events'));
const snap = await getDocs(q);
return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


export async function getEventById(id) {
const ref = doc(db, 'events', id);
const s = await getDoc(ref);
if (!s.exists()) return null;
return { id: s.id, ...s.data() };
}

export async function getRules(id, data) {
const ref = doc(db, 'events', id);
const s = await getDoc(ref);
if (!s.exists()) return null;
return { id: s.id, ...s.data() };
}
export async function getRuleGroups(id, data) {
const ref = doc(db, 'events', id);
await updateDoc(ref, data);
}
export async function saveTrackLog(id, data) {
const ref = doc(db, 'events', id);
await updateDoc(ref, data);
}