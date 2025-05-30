import React, { useState } from "react";
import "./NewGroupChatModal.css";
import { IUserData } from "../models/IUserData";
import { toast } from "react-toastify";

interface INewGroupChatModalProps {
  friends: IUserData[];
  onClose: () => void;
  onCreateGroup: (groupName: string, selectedFriends: string[]) => void;
}

const NewGroupChatModal: React.FC<INewGroupChatModalProps> = ({
  friends,
  onClose,
  onCreateGroup,
}) => {
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const toggleFriendSelection = (friendId: string) => {
    console.log("clicked friend selec");

    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const validateGroupName = (name: string): string | null => {
    if (!name.trim()) {
      return "Group name cannot be empty.";
    }

    if (name.length < 3) {
      return "Group name must be at least 3 characters.";
    }

    if (name.length > 50) {
      return "Group name cannot exceed 50 characters.";
    }

    return null;
  };

  return (
    <div className="group-chat-modal">
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Create Group Chat</h2>

          <input
            type="text"
            placeholder="Enter group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <h3>Select Friends:</h3>
          {friends.length === 0 && <div>You need friends to make a group!</div>}
          <ul className="friends-list">
            {friends.map((friend) => (
              <li
                key={friend.userId}
                onClick={() => toggleFriendSelection(friend.userId ?? "")}
              >
                <label className="group-chat-friend">
                  <input
                    type="checkbox"
                    checked={selectedFriends.includes(friend.userId ?? "")}
                    readOnly
                  />
                  <span
                    onClick={() => toggleFriendSelection(friend.userId ?? "")}
                  >
                    {friend.username}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="modal-actions">
            <button onClick={onClose}>Cancel</button>
            <button
              onClick={() => {
                const VAL_ERROR = validateGroupName(groupName);
                if (VAL_ERROR) {
                  toast.error(VAL_ERROR);
                  return;
                }
                onCreateGroup(groupName, selectedFriends);
              }}
              disabled={!groupName || selectedFriends.length === 0}
            >
              Create Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewGroupChatModal;
