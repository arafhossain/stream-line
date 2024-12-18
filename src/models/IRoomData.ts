import { FieldValue } from "firebase/firestore";

export interface IRoomData {
  roomId: string;
  participants: string[];
  type: "direct" | "group";
  groupName?: string;
  createdAt: FieldValue | null;
}
