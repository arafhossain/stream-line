import { FieldValue, Timestamp } from "firebase/firestore";

export interface IUserData {
  userId?: string;
  username: string;
  email: string | null;
  chatRooms: string[];
  friends: string[];
  createdAt: Timestamp | FieldValue | null;
  lastOpenedChatRoom: string;
  lastSeen: Timestamp | FieldValue | null;
  unreadMessages: {};
  seenWelcome: boolean;
}
