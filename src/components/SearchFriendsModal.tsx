import React, { useEffect, useState } from "react";
import "./SearchFriendsModal.css";
import { toast } from "react-toastify";
import {
  deleteRoom,
  removeRoomFromGroupParticipants,
} from "../services/roomService";
import { IUserData } from "../models/IUserData";
import { searchFriends } from "../services/friendsService";

interface ISearchFriendsModalProps {
  closeModal: () => void;
  friends: IUserData[];
  handleAddFriend: (friendId: string) => Promise<void>;
}

const SearchFriendsModal: React.FC<ISearchFriendsModalProps> = ({
  closeModal,
  friends,
  handleAddFriend,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IUserData[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [performedSearch, setPerformedSearch] = useState(false);

  const performSearch = async (term: string) => {
    setIsLoadingResults(true);
    setPerformedSearch(false);

    const results = await searchFriends(term);

    setSearchResults(results);
    setIsLoadingResults(false);
    setPerformedSearch(true);
  };

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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Search for friends:</h2>

        <div className="search-container">
          <div className="input-with-spinner">
            <input
              type="text"
              placeholder="Search by username or email"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPerformedSearch(false);
              }}
            />
            {isLoadingResults && <div className="search-spinner"></div>}
          </div>
          {searchResults.length > 0 && (
            <ul className="search-results" style={{ marginTop: "10px" }}>
              {searchResults.map((user: IUserData, index: number) => {
                const isFriend = friends.some(
                  (friendData) => friendData.userId === user.userId
                );
                return (
                  <li key={index} className="friend-item">
                    <span>{user.username}</span>
                    <button
                      disabled={isFriend}
                      onClick={() =>
                        !isFriend && handleAddFriend(user.userId ?? "")
                      }
                      className={
                        isFriend ? "friend-button" : "add-friend-button"
                      }
                    >
                      {isFriend ? "✔" : "+"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {searchQuery && performedSearch && searchResults.length === 0 && (
            <div style={{ marginBottom: "10px" }}>No results.</div>
          )}
        </div>
        <div className="modal-actions">
          <button onClick={() => closeModal()}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SearchFriendsModal;
