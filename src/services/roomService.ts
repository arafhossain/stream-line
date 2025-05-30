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
  deleteDoc,
  arrayRemove,
  deleteField,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "./firebase";
import { IRoomData } from "../models/IRoomData";
import { GENERAL_ROOM_ID } from "../helpers/Defaults";

const createGroupRoomId = () => uuidv4();

// Adds room to chatRooms document, then updates each users document
export const makeRoom = async (
  participants: string[],
  type: "direct" | "group",
  groupName: string = "",
  currentUserId: string
): Promise<IRoomData> => {
  const SORTED_PARTICIPANTS = participants.sort();

  const ROOM_ID =
    type === "group" ? createGroupRoomId() : SORTED_PARTICIPANTS.join("_");

  try {
    const ROOM_DATA: IRoomData = {
      participants: SORTED_PARTICIPANTS,
      type,
      groupName: groupName ?? "",
      createdAt: serverTimestamp() as FieldValue,
      roomId: ROOM_ID,
      adminId: currentUserId,
    };

    const ROOM_REF = doc(db, "chatRooms", ROOM_ID);

    const existingRoom = await getDoc(ROOM_REF);
    if (existingRoom.exists()) {
      console.log("Room already exists:", ROOM_ID);
      return existingRoom.data() as IRoomData;
    }

    await setDoc(ROOM_REF, ROOM_DATA);
    console.log("Created room with ID: ", ROOM_ID);

    // Update each participant's chatRooms array in parallel
    await Promise.all(
      SORTED_PARTICIPANTS.map(async (participantId) => {
        const userRef = doc(db, "users", participantId);
        await updateDoc(userRef, {
          chatRooms: arrayUnion(ROOM_ID),
        });
      })
    ).then(() => {
      console.log("Updated users documents");
    });

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

export const deleteRoom = async (roomId: string): Promise<void> => {
  try {
    const REF: DocumentReference = doc(db, "chatRooms", roomId);

    await deleteDoc(REF).then((res) => {
      console.log("Room deleted: ", res);
    });
  } catch (err) {
    console.error("Could not delete room: ", err);
    throw err;
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

export const removeRoomFromGroupParticipants = async (
  participants: string[],
  roomId: string
) => {
  const ROOM_REMOVAL = participants.map(async (friendId) => {
    const USER_REF = doc(db, "users", friendId);
    const userSnap = await getDoc(USER_REF);

    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const isCurrentRoom = userData.lastOpenedChatRoom === roomId;

    await updateDoc(USER_REF, {
      chatRooms: arrayRemove(roomId),
      [`unreadMessages.${roomId}`]: deleteField(),
      ...(isCurrentRoom && { lastOpenedChatRoom: GENERAL_ROOM_ID }),
    });
  });

  await Promise.all(ROOM_REMOVAL)
    .then(() => {
      console.log("Room deleted from participants rooms!");
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error(err);
    });
};

export const removeRoomFromUser = async (userId: string, roomId: string) => {
  const USER_REF = doc(db, "users", userId);
  const userSnap = await getDoc(USER_REF);

  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  const isCurrentRoom = userData.lastOpenedChatRoom === roomId;

  await updateDoc(USER_REF, {
    chatRooms: arrayRemove(roomId),
    [`unreadMessages.${roomId}`]: deleteField(),
    ...(isCurrentRoom && { lastOpenedChatRoom: GENERAL_ROOM_ID }),
  })
    .then(() => {
      // refreshRoomData();
      console.log("Room deleted from user rooms list!");
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error(err);
    });
};

export const removeUserFromRoomArray = async (
  roomId: string,
  userId: string
) => {
  const ROOM_REF: DocumentReference = doc(db, "chatRooms", roomId);
  const roomSnap = await getDoc(ROOM_REF);

  if (!roomSnap.exists()) return;

  await updateDoc(ROOM_REF, {
    participants: arrayRemove(userId),
  })
    .then(() => {
      console.log("User ID removed from room's particpants list.");
    })
    .catch((err) => {
      console.error("Error: ", err);
      throw new Error(err);
    });
};
