import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
} from "firebase/auth";
import { auth, db } from "../services/firebase";
import { createAndFetchUserDocument } from "../services/userService";
import { IUserData } from "../models/IUserData";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

interface AuthContextType {
  currentUser: IUserData | null;
  login: (email: string, password: string) => Promise<UserCredential>;
  signup: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<IUserData | null>(null);

  const refreshUserData = async () => {
    if (auth.currentUser) {
      const USER_DATA = await createAndFetchUserDocument(auth.currentUser);

      if (USER_DATA) {
        const UPDATED_USER: IUserData = {
          username: USER_DATA.username,
          userId: auth.currentUser.uid,
          chatRooms: USER_DATA.chatRooms.slice(),
          email: auth.currentUser.email,
          friends: USER_DATA.friends,
          createdAt: USER_DATA.createdAt,
          lastOpenedChatRoom: USER_DATA.lastOpenedChatRoom,
          lastSeen: serverTimestamp(),
          unreadMessages: USER_DATA.unreadMessages || {},
          seenWelcome: USER_DATA.seenWelcome,
        };

        console.log("User data updated to: ", UPDATED_USER);
        setCurrentUser(UPDATED_USER);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        const USER_DATA = await createAndFetchUserDocument(user);

        if (USER_DATA) {
          const CURRENT_USER: IUserData = {
            username: USER_DATA.username,
            chatRooms: USER_DATA.chatRooms.slice(),
            email: user.email,
            userId: user.uid,
            friends: USER_DATA.friends,
            createdAt: USER_DATA.createdAt,
            lastOpenedChatRoom: USER_DATA.lastOpenedChatRoom,
            lastSeen: serverTimestamp(),
            unreadMessages: USER_DATA.unreadMessages || {},
            seenWelcome: USER_DATA.seenWelcome,
          };
          setCurrentUser(CURRENT_USER);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return unsubscribe;
  }, []);

  const signup = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (currentUser?.userId) {
      const userRef = doc(db, "users", currentUser.userId);
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(),
      });
    }

    await signOut(auth);
    setCurrentUser(null);
  };

  const value = { currentUser, signup, login, logout, refreshUserData };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
