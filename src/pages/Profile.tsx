import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Timestamp } from "firebase/firestore";
import "./Profile.css";
import { updateUserDocument } from "../services/userService";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { currentUser, refreshUserData } = useAuth();
  const [username, setUsername] = useState(currentUser?.username || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const navigate = useNavigate();

  const handleBackToChat = () => {
    navigate("/chat");
  };

  const handleSave = async () => {
    if (!currentUser) return;

    if (username.trim() === "") {
      setSaveMessage("Username cannot be empty.");
      return;
    }

    if (username.trim().length < 6) {
      setSaveMessage("Username must be at least 6 characters long.");
      return;
    }
    setIsSaving(true);
    try {
      await updateUserDocument(currentUser?.uid, { username });
      await refreshUserData();
      setSaveMessage(
        "Success! Username updates will be reflected after re-login."
      );
    } catch (err) {
      console.error(err);
      setSaveMessage("Failed to update username. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    try {
      return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (err) {
      console.error("Error formatting date: ", err);
      return "N/A";
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2>Your Profile</h2>
        <div className="profile-info">
          <div className="profile-field">
            <label htmlFor="username">Username:</label>
            <div className="username-input">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          <div className="profile-field">
            <label>Email:</label>
            <span>{currentUser?.email}</span>
          </div>
          <div className="profile-field">
            <label>Joined:</label>
            <span>
              {currentUser ? formatDate(currentUser.createdAt) : "N/A"}
            </span>
          </div>
          <div className="profile-field">
            <label>Friends:</label>
            <span>{currentUser?.friends?.length || 0}</span>
          </div>
        </div>
        {saveMessage && <p className="save-message">{saveMessage}</p>}

        {/* Back to Chat Button */}
        <div className="profile-actions">
          <button className="back-to-chat-btn" onClick={handleBackToChat}>
            Back to Chat
          </button>
        </div>
      </div>
    </div>
  );
}
