import { doc, setDoc, getDoc, DocumentReference } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "./firebase";
import { IRoomData } from "../models/IRoomData";

const createGroupRoomId = () => uuidv4();

export const makeRoom = async (
  participants: string[],
  type: "direct" | "group",
  groupName?: string
) => {
  const groupRoomId = createGroupRoomId();
  try {
    await setDoc(doc(db, "chatRooms", groupRoomId), {
      participants,
      type,
      groupName,
      createdAt: new Date().toISOString(),
      roomId: groupRoomId,
    });
    console.log("Created room with ID: ", groupRoomId);
    return groupRoomId;
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error creating room:", err);
      throw new Error(err.message);
    } else {
      console.error("Unexpected error creating room:", err);
      throw new Error("An unknown error occurred");
    }
  }
};

export const getRoom = async (roomId: string): Promise<IRoomData | null> => {
  try {
    const REF: DocumentReference = doc(db, "chatRooms", roomId);
    const roomData = await getDoc(REF);

    if (roomData.exists()) {
      return roomData.data() as IRoomData;
    } else {
      return null;
    }
  } catch (err) {
    console.error("Could not check for room: ", err);
    return null;
  }
};
