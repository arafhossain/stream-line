import React, { useEffect, useState } from "react";
import "./Sidebar.css";
import { searchFriends } from "../services/friendsService";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { IUserData } from "../models/IUserData";

import "react-toastify/dist/ReactToastify.css";
import { IRoomData } from "../models/IRoomData";
import { FieldValue, Timestamp } from "firebase/firestore";

interface ISideBarProps {
  handleDirectMessage: (
    friendId: string,
    currentUserId: string
  ) => Promise<void>;
  handleRoomSelect: (roomId: string) => Promise<void>;
  friends: IUserData[];
  userRooms: IRoomData[];
  friendsMap: Record<string, string>;
  contactsMap: Record<string, string>;
  unreadMessages: Record<string, number>;
  roomData: IRoomData | null;
  fetchingRoomData: boolean;
  setIsGroupChatModalOpen: () => void;
  setdeleteGroupModalOpen: (
    groupName: string,
    roomId: string,
    participants: string[]
  ) => void;
  setSearchFriendsModalOpen: () => void;
  newRooms: string[];
  setLeaveGroupModalOpen: (groupName: string, roomId: string) => void;
}

export const formatLastSeen = (timestamp: Timestamp | FieldValue | null) => {
  if (!timestamp) return "Never";

  if (timestamp instanceof Timestamp) {
    const now = new Date();

    const lastSeenDate = timestamp.toDate();

    // If the year is the same as the current year, only show Month and Day
    if (lastSeenDate.getFullYear() === now.getFullYear()) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(lastSeenDate);
    }

    // Otherwise, include the year
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(lastSeenDate);
  }

  return "Updating...";
};

const Sidebar: React.FC<ISideBarProps> = (props: ISideBarProps) => {
  const { currentUser, logout } = useAuth();
  const { unreadMessages, friends, handleDirectMessage, newRooms } = props;
  const navigate = useNavigate();

  const [showFriends, setShowFriends] = useState<boolean>(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  const getDirectMessageParticipant = (
    participants: string[]
  ): string | null => {
    // Exclude current user
    const otherParticipant = participants.filter(
      (id) => id !== currentUser?.userId
    );

    if (!otherParticipant || otherParticipant.length === 0) return null;

    const FRIEND = otherParticipant[0];

    const NAME = props.friendsMap[FRIEND];
    if (NAME) {
      return NAME;
    }

    const CONTACT_NAME = props.contactsMap[FRIEND];
    if (CONTACT_NAME) {
      return CONTACT_NAME;
    }

    return null;
  };

  return (
    <div className="sidebar">
      <ul className="menu-buttons">
        <li>
          <button onClick={() => navigate("/profile")}>Profile</button>
        </li>
        <li>
          <button onClick={() => setShowFriends(!showFriends)}>
            {showFriends ? "Hide Friends List" : "Friends List"}
          </button>
        </li>
        <li>
          <button onClick={() => props.setSearchFriendsModalOpen()}>
            Search for Friends
          </button>
        </li>
        <li>
          <button onClick={() => props.setIsGroupChatModalOpen()}>
            New Group Chat
          </button>
        </li>
        <li>
          <button>Settings</button>
        </li>
        <li>
          <button onClick={handleLogout}>Logout</button>
        </li>
      </ul>

      {showFriends && friends.length === 0 && <div>You have no friends...</div>}
      {showFriends && friends.length > 0 && (
        <ul className="friends-list">
          {friends.map((friend) => {
            return (
              <li key={friend.userId}>
                <div>
                  <span>{friend.username}</span>
                  <br />
                  <span style={{ fontSize: "10px" }}>
                    Last seen: {formatLastSeen(friend.lastSeen)}
                  </span>
                </div>
                <button
                  className="action"
                  onClick={() => {
                    if (currentUser)
                      handleDirectMessage(
                        friend.userId ?? "",
                        currentUser?.userId ?? ""
                      );
                  }}
                >
                  Chat
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <h3>Groups</h3>
        <ul className="room-list">
          {props.userRooms
            .filter((room) => room.type === "group")
            .map((room) => {
              const unreadCount = unreadMessages?.[room.roomId] || 0;
              const isAdmin = room.adminId === currentUser?.userId;
              return (
                <li key={room.roomId}>
                  <div className="room-name-wrapper">
                    <button
                      onClick={() => {
                        if (
                          !props.fetchingRoomData &&
                          props.roomData?.roomId !== room.roomId
                        )
                          props.handleRoomSelect(room.roomId);
                      }}
                      className="chat-room-button"
                    >
                      <span className="room-name">{room.groupName}</span>
                      {unreadCount > 0 && (
                        <span className="badge">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        className="inline-delete-btn"
                        onClick={() => {
                          if (room.groupName)
                            props.setdeleteGroupModalOpen(
                              room.groupName,
                              room.roomId,
                              room.participants
                            );
                        }}
                      >
                        x
                      </button>
                    )}

                    {!isAdmin && room.groupName !== "The Pit" && (
                      <button
                        className="inline-delete-btn"
                        onClick={() => {
                          console.log("Selected room to leave: ", room);
                          if (room.groupName)
                            props.setLeaveGroupModalOpen(
                              room.groupName,
                              room.roomId
                            );
                        }}
                        aria-description="exit"
                      >
                        ↩️
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
        </ul>
      </div>

      <div>
        <h3>Direct Messages</h3>
        <ul className="room-list">
          {props.userRooms
            .filter((room) => room.type === "direct")
            .map((room) => {
              const unreadCount = unreadMessages?.[room.roomId] || 0;
              return (
                <li key={room.roomId}>
                  <button
                    onClick={() => {
                      if (
                        !props.fetchingRoomData &&
                        props.roomData?.roomId !== room.roomId
                      )
                        props.handleRoomSelect(room.roomId);
                    }}
                    className="chat-room-button"
                  >
                    <span className="room-name">
                      {getDirectMessageParticipant(room.participants)}
                    </span>
                    {unreadCount > 0 && (
                      <span className="badge">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
