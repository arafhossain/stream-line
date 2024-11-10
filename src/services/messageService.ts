import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { IMessageData } from "../models/IMessageData";
import { User } from "firebase/auth";

const generateRandomDisplayName = () => {
  const adjectives = [
    "Brave",
    "Cool",
    "Funky",
    "Happy",
    "Mighty",
    "Sneaky",
    "Swift",
    "Witty",
  ];
  const nouns = [
    "Tiger",
    "Falcon",
    "Lion",
    "Wolf",
    "Eagle",
    "Panther",
    "Hawk",
    "Fox",
  ];
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000) + 1;
  return `${randomAdjective}${randomNoun}${randomNumber}`;
};

// Function to save a message to Firestore
export const saveMessageToFirestore = async (messageData: IMessageData) => {
  try {
    await addDoc(collection(db, "messages"), {
      ...messageData,
      timestamp: serverTimestamp(),
    });
    console.log("Message saved to Firestore");
  } catch (error) {
    console.error("Error saving message to Firestore: ", error);
  }
};

export const createAndFetchUserDocument = async (user: User) => {
  const userRef = doc(db, "users", user.uid);

  try {
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const USER_DATA = {
        username: generateRandomDisplayName(),
        email: user.email,
        chatRooms: [],
      };
      await setDoc(userRef, USER_DATA, { merge: true });
      console.debug("User document created");
      return USER_DATA;
    } else {
      console.debug("User document already exists.");
      return userDoc.data();
    }
  } catch (error) {
    console.error("Error creating user in Firestore: ", error);
    return null;
  }
};
