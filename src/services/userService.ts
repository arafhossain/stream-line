import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { User } from "firebase/auth";
import { IUserData } from "../models/IUserData";
import { DEFAULT_FRIEND_ID, GENERAL_ROOM_ID } from "../helpers/Defaults";

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

export const createAndFetchUserDocument = async (
  user: User
): Promise<IUserData | null> => {
  const userRef = doc(db, "users", user.uid);

  try {
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const USER_DATA: IUserData = {
        username: generateRandomDisplayName(),
        email: user.email,
        chatRooms: [GENERAL_ROOM_ID],
        friends: [DEFAULT_FRIEND_ID],
        createdAt: serverTimestamp(),
        lastOpenedChatRoom: GENERAL_ROOM_ID,
        unreadMessages: {},
        lastSeen: serverTimestamp(),
        seenWelcome: false,
      };
      await setDoc(userRef, USER_DATA, { merge: true });
      console.debug("User document created");
      return USER_DATA;
    } else {
      console.debug("User document already exists.");
      return userDoc.data() as IUserData;
    }
  } catch (error) {
    console.error("Error creating user in Firestore: ", error);
    return null;
  }
};

export const fetchUserDocument = async (
  uid: string
): Promise<IUserData | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() ? (userDoc.data() as IUserData) : null;
  } catch (error) {
    console.error("Error fetching user document: ", error);
    return null;
  }
};

export const fetchAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id, // Document ID
      ...doc.data(), // User data
    }));

    console.log("All users:", users);
    return users;
  } catch (err) {
    console.error("Error fetching users:", err);
    return [];
  }
};

export const updateUserDocument = async (
  uid: string,
  data: Partial<IUserData>
) => {
  if (!uid) return;
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, data);
  } catch (err) {
    console.error("Error updating user document:", err);
    throw err;
  }
};
