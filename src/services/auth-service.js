import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase-config';

// Đăng ký user mới
export const registerUser = async (email, password, name, role = 'member') => {
  try {
    // Tạo user trong Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Lưu thông tin user vào Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      name: name,
      role: role, // 'admin' hoặc 'member'
      createdAt: new Date(),
      stravaIntegration: {
        isConnected: false
      }
    });

    return { success: true, user: user };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error: error.message };
  }
};

// Đăng nhập
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Lấy thông tin user từ Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    return { 
      success: true, 
      user: {
        uid: user.uid,
        email: user.email,
        ...userData
      }
    };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
};

// Đăng xuất
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: error.message };
  }
};

// Lắng nghe trạng thái đăng nhập
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User đã đăng nhập, lấy thông tin từ Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      callback({
        uid: user.uid,
        email: user.email,
        ...userData
      });
    } else {
      // User chưa đăng nhập
      callback(null);
    }
  });
};

// Kiểm tra role
export const isAdmin = (user) => {
  return user && user.role === 'admin';
};