import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase-config';

// ===== EVENTS =====
export const createEvent = async (eventData) => {
  try {
    const docRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      status: 'active',
      createdAt: Timestamp.now()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating event:', error);
    return { success: false, error: error.message };
  }
};

export const getEvents = async () => {
  try {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const events = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: events };
  } catch (error) {
    console.error('Error getting events:', error);
    return { success: false, error: error.message };
  }
};

export const getEventById = async (eventId) => {
  try {
    const docRef = doc(db, 'events', eventId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Event not found' };
    }
  } catch (error) {
    console.error('Error getting event:', error);
    return { success: false, error: error.message };
  }
};

// ===== RULES =====
export const getRules = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'rules'));
    const rules = [];
    querySnapshot.forEach((doc) => {
      rules.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: rules };
  } catch (error) {
    console.error('Error getting rules:', error);
    return { success: false, error: error.message };
  }
};

export const getRuleGroups = async () => {
  try {
    const q = query(collection(db, 'ruleGroups'), orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    const groups = [];
    querySnapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: groups };
  } catch (error) {
    console.error('Error getting rule groups:', error);
    return { success: false, error: error.message };
  }
};

// ===== EVENT RULES =====
export const getEventRules = async (eventId) => {
  try {
    const q = query(
      collection(db, 'eventRules'),
      where('eventId', '==', eventId),
      orderBy('order', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    const eventRules = [];
    for (const docSnap of querySnapshot.docs) {
      const er = docSnap.data();
      
      // Lấy rule details
      const ruleDoc = await getDoc(doc(db, 'rules', er.ruleId));
      const rule = ruleDoc.data();
      
      // Lấy group details
      const groupDoc = await getDoc(doc(db, 'ruleGroups', rule.groupId));
      const group = groupDoc.data();
      
      eventRules.push({
        id: docSnap.id,
        ...er,
        rule: rule,
        group: group
      });
    }
    
    return { success: true, data: eventRules };
  } catch (error) {
    console.error('Error getting event rules:', error);
    return { success: false, error: error.message };
  }
};

// ===== TRACK LOGS =====
export const getTrackLogs = async (userId, startDate, endDate) => {
  try {
    const q = query(
      collection(db, 'trackLogs'),
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const logs = [];
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: logs };
  } catch (error) {
    console.error('Error getting track logs:', error);
    return { success: false, error: error.message };
  }
};