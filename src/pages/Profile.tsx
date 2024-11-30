import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";
import "./Profile.css"; // Add styling here

export default function Profile() {
  const { currentUser } = useAuth();
  const [username, setUsername] = useState(currentUser?.username || "");
  const [profilePic, setProfilePic] = useState<string | null>(null); // Optional
  const [isSaving, setIsSaving] = useState(false);

  const handleUsernameChange = async () => {
    if (!username.trim()) return;

    setIsSaving(true);
    try {
      const userDoc = doc(db, "users", currentUser?.uid || "");
      await updateDoc(userDoc, { username });
      console.log("Username updated successfully");
      alert("Username updated!"); // Replace with a toast
    } catch (error) {
      console.error("Error updating username:", error);
      alert("Error updating username!"); // Replace with a toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <h1>Profile</h1>
      <div className="profile-details">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={handleUsernameChange} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="profile-picture">
        <h3>Profile Picture</h3>
        {profilePic ? (
          <img src={profilePic} alt="Profile" />
        ) : (
          <p>No profile picture set.</p>
        )}
        <button>Change Picture</button>
      </div>
    </div>
  );
}
