import {
  doc,
  setDoc,
  getDoc,
  DocumentReference,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  FieldValue,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "./firebase";
import { IRoomData } from "../models/IRoomData";

const createGroupRoomId = () => uuidv4();

export const GENERAL_ROOM_ID = "630c57bc-48ac-4873-ac43-d87715b8813a";

export const makeRoom = async (
  participants: string[],
  type: "direct" | "group",
  groupName?: string
): Promise<IRoomData> => {
  const ROOM_ID =
    type === "group" ? createGroupRoomId() : participants.sort().join("_");

  try {
    const ROOM_DATA: IRoomData = {
      participants,
      type,
      groupName: groupName ?? "",
      createdAt: serverTimestamp() as FieldValue,
      roomId: ROOM_ID,
    };

    const ROOM_REF = doc(db, "chatRooms", ROOM_ID);

    const existingRoom = await getDoc(ROOM_REF);
    if (existingRoom.exists()) {
      console.log("Room already exists:", ROOM_ID);
      return existingRoom.data() as IRoomData;
    }

    await setDoc(ROOM_REF, ROOM_DATA);

    // Update each participant's chatRooms array in parallel
    await Promise.all(
      participants.map(async (participantId) => {
        const userRef = doc(db, "users", participantId);
        await updateDoc(userRef, {
          chatRooms: arrayUnion(ROOM_ID),
        });
      })
    );

    console.log("Created room with ID: ", ROOM_ID);

    return ROOM_DATA;
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

export const fetchUserChatRooms = async (
  roomIds: string[]
): Promise<IRoomData[]> => {
  try {
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      console.warn("No chat room IDs provided. Returning empty array.");
      return [];
    }

    const chatRoomsRef = collection(db, "chatRooms");

    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < roomIds.length; i += batchSize) {
      const batch = roomIds.slice(i, i + batchSize);
      batches.push(getDocs(query(chatRoomsRef, where("roomId", "in", batch))));
    }

    const querySnapshots = await Promise.all(batches);
    const rooms = querySnapshots.flatMap((snapshot) =>
      snapshot.docs.map((doc) => doc.data() as IRoomData)
    );

    return rooms;
  } catch (err) {
    console.error("Error fetching chat rooms: ", err);
    return [];
  }
};
