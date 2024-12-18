import React, { useEffect, useState } from "react";
import "./Sidebar.css";
import {
  addFriend,
  fetchFriendsData,
  searchFriends,
} from "../services/friendsService";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { IUserData } from "../models/IUserData";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchUserDocument } from "../services/userService";
import { fetchUserChatRooms } from "../services/roomService";
import { IRoomData } from "../models/IRoomData";

interface ISideBarProps {
  handleDirectMessage: (
    friendId: string,
    currentUserId: string
  ) => Promise<void>;
}

const Sidebar: React.FC<ISideBarProps> = (props: ISideBarProps) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IUserData[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  const [friends, setFriends] = useState<IUserData[]>([]);
  const [showFriends, setShowFriends] = useState<boolean>(false);

  const [userRooms, setUserRooms] = useState<IRoomData[]>([]);
  const [friendsMap, setFriendsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const loadFriends = async () => {
      if (currentUser?.friends && currentUser.friends.length > 0) {
        const friendsData = await fetchFriendsData(currentUser.friends);

        setFriends(friendsData);
      }
    };

    loadFriends();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.chatRooms?.length) return;

    if (currentUser?.chatRooms?.length) {
      fetchUserChatRooms(currentUser.chatRooms).then((rooms) => {
        setUserRooms(rooms);
      });
    }
  }, [currentUser?.chatRooms]);

  useEffect(() => {
    if (!currentUser?.friends?.length) return;

    if (currentUser?.friends?.length) {
      const friendsMapping: Record<string, string> = {};

      currentUser.friends.forEach((friendUid) => {
        const friendData = friends.find((f) => f.uid === friendUid);
        if (friendData) {
          friendsMapping[friendUid] = friendData.username;
        }
      });

      setFriendsMap(friendsMapping);
    }
  }, [friends]);

  const performSearch = async (term: string) => {
    setIsLoadingResults(true);

    const results = await searchFriends(term);

    setSearchResults(results);
    setIsLoadingResults(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    try {
      const CURRENT_USER_ID = currentUser?.uid ?? "";

      await addFriend(CURRENT_USER_ID, friendId);

      const updatedUser = await fetchUserDocument(CURRENT_USER_ID);

      if (updatedUser) {
        const friendsData = await fetchFriendsData(updatedUser.friends);

        setFriends(friendsData);
      }

      toast.success("Friend added successfully!", {
        position: "bottom-right",
        autoClose: 3000,
        style: {
          backgroundColor: "#2a2a3a",
          color: "#00a9d1",
          border: "1px solid #00a9d1",
        },
      });
    } catch (err) {
      toast.error("Failed to add friend. Please try again.", {
        position: "bottom-right",
        autoClose: 3000,
        style: {
          backgroundColor: "#2a2a3a",
          color: "#ff5555",
          border: "1px solid #ff5555",
        },
      });
    }
  };

  const renderDirectRoomName = (participants: string[]) => {
    // Exclude current user
    const otherParticipant = participants.filter(
      (id) => id !== currentUser?.uid
    );

    if (!otherParticipant || otherParticipant.length === 0) return "N/A";

    const FRIEND = otherParticipant[0];

    return friendsMap[FRIEND];
  };

  return (
    <div className="sidebar">
      <h2>Menu</h2>
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
          <button onClick={() => setIsSearchOpen(!isSearchOpen)}>
            {isSearchOpen ? "Close Search" : "Search for Friends"}
          </button>
        </li>
        <li>
          <button>New Group Chat</button>
        </li>
        <li>
          <button>Settings</button>
        </li>
        <li>
          <button onClick={handleLogout}>Logout</button>
        </li>
      </ul>

      {isSearchOpen && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by username or email"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
          />
          {isLoadingResults && (
            <div className="spinner" style={{ margin: "auto" }}></div>
          )}
          {!isLoadingResults && (
            <ul className="search-results">
              {searchResults.map((user: IUserData, index: number) => {
                const isFriend = friends.some(
                  (friendData) => friendData.uid === user.uid
                );

                return (
                  <li key={index} className="friend-item">
                    <span>{user.username}</span>
                    <button
                      disabled={isFriend}
                      onClick={() => !isFriend && handleAddFriend(user.uid)}
                      className={
                        isFriend ? "friend-button" : "add-friend-button"
                      }
                    >
                      {isFriend ? "✔" : "+"} {/* Checkmark or plus sign */}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {showFriends && friends.length === 0 && <div>You have no friends...</div>}
      {showFriends && friends.length > 0 && (
        <ul className="friends-list">
          {friends.map((friend) => (
            <li key={friend.uid}>
              <span>{friend.username}</span>
              <button
                className="action"
                onClick={() => {
                  if (currentUser)
                    props.handleDirectMessage(friend.uid, currentUser?.uid);
                }}
              >
                Chat
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h3>Groups</h3>
        <ul className="room-list">
          {userRooms
            .filter((room) => room.type === "group")
            .map((room) => (
              <li key={room.roomId}>
                <button>{room.groupName}</button>
              </li>
            ))}
        </ul>
      </div>

      <div>
        <h3>Direct Messages</h3>
        <ul className="room-list">
          {userRooms
            .filter((room) => room.type === "direct")
            .map((room) => (
              <li key={room.roomId}>
                <button>{renderDirectRoomName(room.participants)}</button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
