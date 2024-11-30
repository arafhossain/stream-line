import React, { useEffect, useState } from "react";
import "./Sidebar.css";
import {
  addFriend,
  fetchFriendsData,
  searchFriends,
} from "../services/friendsService";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { UserData } from "../models/IUserData";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAllUsers, fetchUserDocument } from "../services/userService";

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  const [friends, setFriends] = useState<any[]>([]);
  const [showFriends, setShowFriends] = useState<boolean>(false);

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
        console.log(friendsData);

        setFriends(friendsData);
      }
    };

    loadFriends();
    fetchAllUsers().then((res) => {
      console.log(res);
    });
  }, [currentUser]);

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

      // if (updatedUser) {
      //   setCurrentUser({ ...currentUser, friends: updatedUser.friends });
      // }
      console.log(updatedUser);

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

  console.log(friends);

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
              {searchResults.map((user: UserData, index: number) => {
                const isFriend = currentUser?.friends.includes(user.uid);

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
              <button className="action">Chat</button>
            </li>
          ))}
        </ul>
      )}

      <div className="room-list">
        <h3>Your Rooms</h3>
        {/* <ul>
          {rooms.map((room: any, index:number) => (
            <li key={index}>
              <button onClick={() => {}}>
                {room.name}
              </button>
            </li>
          ))}
        </ul> */}
      </div>
    </div>
  );
}
