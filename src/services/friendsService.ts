import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
  Query,
} from "firebase/firestore";

import { db } from "./firebase";

export const searchFriends = async (searchTerm: string): Promise<any[]> => {
  try {
    const usersRef = collection(db, "users");

    // Query by username
    const usernameQuery = query(usersRef, where("username", "==", searchTerm));
    const usernameSnapshot = await getDocs(usernameQuery);

    // Query by email
    const emailQuery = query(usersRef, where("email", "==", searchTerm));
    const emailSnapshot = await getDocs(emailQuery);

    // Map the results into an array
    const usernameResults = usernameSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    const emailResults = emailSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    // Combine results and remove duplicates
    const allResults = [...usernameResults, ...emailResults];

    const uniqueResults = Array.from(
      new Map(allResults.map((item) => [item.uid, item])).values()
    );

    return uniqueResults;
  } catch (err) {
    console.error("Error searching users: ", err);
    return [];
  }
};

export const addFriend = async (currentUserId: string, friendId: string) => {
  if (!currentUserId || !friendId) {
    throw new Error("Invalid user ID or friend ID");
  }

  try {
    const userRef = doc(db, "users", currentUserId);

    await updateDoc(userRef, {
      friends: arrayUnion(friendId),
    });
    console.log("Friend added successfully!");
  } catch (err) {
    console.error("Error adding friend: ", err);
    throw err;
  }
};

export const fetchFriendsData = async (friendsUIDs: string[]) => {
  try {
    const usersCollection = collection(db, "users");

    const friendChunks = [];
    for (let i = 0; i < friendsUIDs.length; i += 10) {
      friendChunks.push(friendsUIDs.slice(i, i + 10));
    }

    const results = await Promise.all(
      friendChunks.map(async (chunk) => {
        const q = query(usersCollection, where("__name__", "in", chunk)); // __name__ refers to the document ID
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }));
      })
    );

    return results.flat();
  } catch (err) {
    console.error("Error fetching friends data: ", err);
    return [];
  }
};
