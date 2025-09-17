import { auth, db } from '../firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// 사용자 데이터 타입 정의
interface UserData {
  uid: string;
  name: string;
  nickname: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  isActive?: boolean;
  points?: number;
  totalPaidPoints?: number;
  usedPoints?: number;
  createdAt?: string;
}

/**
 * 이메일로 사용자 검색
 */
export const findUserByEmail = async (email: string): Promise<UserData | null> => {
  try {
    // Firestore에서 이메일로 사용자 검색
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return {
        uid: userDoc.id,
        ...userDoc.data()
      } as UserData;
    }
    return null;
  } catch (error) {
    console.error('사용자 검색 오류:', error);
    throw error;
  }
};

/**
 * 이메일로 로그인
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    console.error('로그인 오류:', error);
    throw error;
  }
};

/**
 * 이메일로 회원가입
 */
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  userData: {
    name: string;
    nickname: string;
    phoneNumber?: string;
    role?: string;
  }
) => {
  try {
    // Firebase Auth로 회원가입
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Firestore에 사용자 정보 저장
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name: userData.name,
      nickname: userData.nickname,
      email: email,
      phoneNumber: userData.phoneNumber || '',
      role: userData.role || 'user',
      isActive: true,
      points: 10000, // 이벤트 기간: 가입시 자동으로 10,000P 부여
      totalPaidPoints: 0,
      usedPoints: 0,
      createdAt: new Date().toISOString()
    });
    
    return userCredential;
  } catch (error) {
    console.error('회원가입 오류:', error);
    throw error;
  }
};

/**
 * 현재 사용자의 Firestore 정보 가져오기
 */
export const getCurrentUserData = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // 로컬 스토리지에 사용자 정보 캐싱
      localStorage.setItem(`userData_${uid}`, JSON.stringify(userData));
      
      return userData;
    }
    return null;
  } catch (error) {
    console.error('사용자 정보 가져오기 오류:', error);
    
    // 오프라인 모드일 때 로컬 스토리지에서 캐시된 데이터 사용
    if (error instanceof Error && error.message.includes('unavailable')) {
      const cachedData = localStorage.getItem(`userData_${uid}`);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          return parsedData;
        } catch (parseError) {
          console.error('캐시된 데이터 파싱 오류:', parseError);
        }
      }
    }
    
    throw error;
  }
};

/**
 * 사용자 정보 업데이트
 */
export const updateUserData = async (uid: string, userData: {
  name?: string;
  nickname?: string;
  email?: string;
  role?: string;
}) => {
  try {
    await setDoc(doc(db, 'users', uid), userData, { merge: true });
  } catch (error) {
    console.error('사용자 정보 업데이트 오류:', error);
    throw error;
  }
};

/**
 * 비밀번호 재설정 이메일 발송
 */
export const sendPasswordReset = async (email: string) => {
  try {
    console.log('비밀번호 재설정 이메일 발송 시도:', email);
    
    // 비밀번호 재설정 이메일 발송
    await sendPasswordResetEmail(auth, email);
    
    console.log('비밀번호 재설정 이메일 발송 완료:', email);
    return true;
  } catch (error: any) {
    console.error('비밀번호 재설정 이메일 발송 오류:', error);
    
    // 더 자세한 오류 정보 제공
    if (error.code === 'auth/user-not-found') {
      throw new Error('등록되지 않은 이메일 주소입니다.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('올바르지 않은 이메일 형식입니다.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.');
    } else {
      throw new Error(`이메일 발송에 실패했습니다: ${error.message}`);
    }
  }
};

/**
 * 로그아웃
 */
export const logout = () => {
  return signOut(auth);
};
