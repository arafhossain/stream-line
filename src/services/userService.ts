import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";
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

export const createAndFetchUserDocument = async (user: User) => {
  const userRef = doc(db, "users", user.uid);

  try {
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const USER_DATA = {
        username: generateRandomDisplayName(),
        email: user.email,
        chatRooms: [],
        friends: [],
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

export const fetchUserDocument = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() ? userDoc.data() : null;
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
