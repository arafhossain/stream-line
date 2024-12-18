import { Timestamp } from "firebase/firestore";

export interface IUserData {
  username: string;
  email: string | null;
  chatRooms: string[];
  uid: string;
  friends: string[];
  createdAt: Timestamp;
}
