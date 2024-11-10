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
import { createAndFetchUserDocument } from "../services/messageService";

interface AuthContextType {
  currentUser: UserData | null;
  login: (email: string, password: string) => Promise<UserCredential>;
  signup: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

interface UserData {
  userName: string;
  email: string | null;
  chatRooms: string[];
  uid: string;
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
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(user);

      if (user) {
        const USER_DATA = await createAndFetchUserDocument(user);

        console.log(USER_DATA);

        if (USER_DATA) {
          const CURRENT_USER: UserData = {
            userName: USER_DATA.username,
            chatRooms: USER_DATA.chatRooms.slice(),
            email: user.email,
            uid: user.uid,
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

  const logout = () => {
    return signOut(auth);
  };

  const value = { currentUser, signup, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
