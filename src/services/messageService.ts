// services/messageService.ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { IMessageData } from "../models/IMessageData";

// Function to save a message to Firestore
export const saveMessageToFirestore = async (messageData: IMessageData) => {
  try {
    await addDoc(collection(db, "messages"), {
      ...messageData,
      timestamp: serverTimestamp(), // Save Firestore server timestamp
    });
    console.log("Message saved to Firestore");
  } catch (error) {
    console.error("Error saving message to Firestore: ", error);
  }
};
