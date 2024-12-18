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
import { auth } from "../services/firebase";
import { createAndFetchUserDocument } from "../services/userService";
import { IUserData } from "../models/IUserData";

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
          chatRooms: USER_DATA.chatRooms.slice(),
          email: auth.currentUser.email,
          uid: auth.currentUser.uid,
          friends: USER_DATA.friends,
          createdAt: USER_DATA.createdAt,
        };
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
            uid: user.uid,
            friends: USER_DATA.friends,
            createdAt: USER_DATA.createdAt,
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
    await signOut(auth);
    setCurrentUser(null);
  };

  const value = { currentUser, signup, login, logout, refreshUserData };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
