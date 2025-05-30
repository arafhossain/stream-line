import { FieldValue, Timestamp } from "firebase/firestore";

export interface IRoomData {
  roomId: string;
  participants: string[];
  type: "direct" | "group";
  groupName?: string;
  createdAt: Timestamp | FieldValue | null;
  adminId: string;
}
