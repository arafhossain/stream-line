import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { IMessageData } from "../models/IMessageData";
import { IRoomData } from "../models/IRoomData";

// Function to save a message to Firestore
export const saveMessageToFirestore = async (messageData: IMessageData) => {
  try {
    const messageRef = collection(db, "messages");
    const messageDoc = {
      ...messageData,
      timestamp: serverTimestamp(),
    };

    await addDoc(messageRef, messageDoc);

    // Get room data to find recipients
    const roomRef = doc(db, "chatRooms", messageData.roomId);
    const roomData = await getDoc(roomRef);

    if (roomData.exists()) {
      const ROOM_DATA = roomData.data() as IRoomData;
      console.log(ROOM_DATA);

      for (const participant of ROOM_DATA.participants) {
        if (participant !== messageData.userId) {
          console.log(participant);

          const userRef = doc(db, "users", participant);
          await updateDoc(userRef, {
            [`unreadMessages.${messageData.roomId}`]: increment(1),
          });
        }
      }
    }

    console.log("Message saved to Firestore");
  } catch (error) {
    console.error("Error saving message to Firestore: ", error);
  }
};
