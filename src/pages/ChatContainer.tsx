import Sidebar from "../components/Sidebar";
import Chat from "../components/Chat";
import "./ChatContainer.css";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
} from "@fortawesome/free-solid-svg-icons";
import { ToastContainer } from "react-toastify";
import { fetchUserChatRooms, getRoom, makeRoom } from "../services/roomService";
import { IRoomData } from "../models/IRoomData";
import { useAuth } from "../contexts/AuthContext";
import { IUserData } from "../models/IUserData";
import { addFriend, fetchFriendsData } from "../services/friendsService";
import { toast } from "react-toastify";
import { fetchUserDocument, updateUserDocument } from "../services/userService";
import { IMessageData } from "../models/IMessageData";
import { db } from "../services/firebase";
import { deleteField, doc, getDoc, onSnapshot } from "firebase/firestore";
import NewGroupChatModal from "../components/NewGroupChatModal";
import DeleteGroupModal from "../components/DeleteGroupModal";
import SearchFriendsModal from "../components/SearchFriendsModal";
import LeaveGroupModal from "../components/LeaveGroupModal";
import { GENERAL_ROOM_ID } from "../helpers/Defaults";

export default function ChatContainer() {
  const { currentUser, refreshUserData } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [roomData, setRoomData] = useState<IRoomData | null>(null);
  const [friends, setFriends] = useState<IUserData[]>([]);
  const [friendsMap, setFriendsMap] = useState<Record<string, string>>({});
  const [contactsMap, setContactsMap] = useState<Record<string, string>>({});
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>(
    {}
  );
  const [fetchingRoomData, setFetchingRoomData] = useState(false);
  const [isGroupChatModalOpen, setIsGroupChatModalOpen] =
    useState<boolean>(false);
  const [deleteGroupModalOpen, setdeleteGroupModalOpen] =
    useState<boolean>(false);
  const [deleteGroupName, setDeleteGroupName] = useState<string>("");
  const [deleteGroupId, setDeleteGroupId] = useState<string>("");
  const [deleteGroupParticipants, setDeleteGroupParticipants] = useState<
    Array<string>
  >([]);
  const [searchFriendsModalOpen, setSearchFriendsModalOpen] =
    useState<boolean>(false);

  const [leaveGroupModalOpen, setLeaveGroupModalOpen] =
    useState<boolean>(false);
  const [leaveGroupName, setLeaveGroupName] = useState<string>("");
  const [leaveGroupId, setLeaveGroupId] = useState<string>("");

  const [userRooms, setUserRooms] = useState<IRoomData[]>([]);
  const [unknownUserRooms, setUnknownUserRooms] = useState<string[]>([]);

  // Get friends data
  useEffect(() => {
    const loadFriends = async () => {
      if (currentUser?.friends && currentUser.friends.length > 0) {
        const friendsData = await fetchFriendsData(currentUser.friends);

        setFriends(friendsData);
      }
    };

    loadFriends();
  }, [currentUser]);

  // Create Friends mapping
  useEffect(() => {
    if (friends.length === 0) return;

    if (friends.length > 0) {
      const friendsMapping: Record<string, string> = {};

      currentUser?.friends?.forEach((friendUid) => {
        const friendData = friends.find((f) => f.userId === friendUid);
        if (friendData) {
          friendsMapping[friendUid] = friendData.username;
        }
      });

      setFriendsMap(friendsMapping);
    }
  }, [friends]);

  useEffect(() => {
    if (!currentUser?.userId) return;

    const userRef = doc(db, "users", currentUser.userId);

    const unsubscribe = onSnapshot(userRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data();

        // Shouldnt trigger new room if new user is just typing!
        setUnreadMessages((prev) => ({
          ...prev,
          ...data.unreadMessages,
        }));

        if (data.chatRooms) {
          const newRooms: string[] = data.chatRooms.filter(
            (roomId: string) =>
              !currentUser.chatRooms.some((room) => room === roomId)
          );

          if (newRooms.length > 0) {
            setUnknownUserRooms((prev) => [...prev, ...newRooms]);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    console.log(
      "Running useEffect for currentUser?.chatrooms and unknownUserRooms",
      currentUser?.chatRooms,
      unknownUserRooms
    );

    if (!currentUser?.chatRooms?.length && !unknownUserRooms.length) return;

    const allRooms = [...(currentUser?.chatRooms || []), ...unknownUserRooms];
    const uniqueRoomIds = Array.from(new Set(allRooms));

    if (uniqueRoomIds) {
      console.log("getting all unique room IDs");

      fetchUserChatRooms(uniqueRoomIds).then((rooms) => {
        console.log("Setting rooms: ", rooms);
        setUserRooms(rooms);
      });
    }
  }, [currentUser?.chatRooms, unknownUserRooms]);

  const getDirectMessageParticipant = (
    participants: string[]
  ): string | null => {
    // Exclude current user
    const otherParticipant = participants.filter(
      (id) => id !== currentUser?.userId
    );

    if (!otherParticipant || otherParticipant.length === 0) return null;

    const FRIEND = otherParticipant[0];

    const NAME = friendsMap[FRIEND];
    if (NAME) {
      return NAME;
    }

    const CONTACT_NAME = contactsMap[FRIEND];
    if (CONTACT_NAME) {
      return CONTACT_NAME;
    }

    return null;
  };

  useEffect(() => {
    if (!userRooms.length) return;

    const UNKNOWN_PARTICIPANTS: string[] = [];

    userRooms
      .filter((room) => room.type === "direct")
      .forEach((room) => {
        const OTHER_USER = getDirectMessageParticipant(room.participants);

        if (OTHER_USER === "" || !OTHER_USER) {
          const otherParticipant = room.participants.filter(
            (id) => id !== currentUser?.userId
          );

          if (Array.isArray(otherParticipant) && otherParticipant.length > 0)
            UNKNOWN_PARTICIPANTS.push(otherParticipant[0]);
        }
      });

    // Do call for unknown participants here
    if (UNKNOWN_PARTICIPANTS.length > 0) {
      Promise.all(
        UNKNOWN_PARTICIPANTS.map(async (participantId) => {
          const ref = doc(db, "users", participantId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const username = snap.data().username as string;
            return { [participantId]: username };
          } else return null;
        })
      ).then((res) => {
        const RESPONSES = res.filter((response) => response != null);

        const CONTACTS: { [x: string]: string } = { ...contactsMap };

        RESPONSES.forEach((mapping) => {
          for (let key in mapping) {
            CONTACTS[key] = mapping[key];
          }
        });

        setContactsMap(CONTACTS);
      });
    }
  }, [userRooms]);

  useEffect(() => {
    if (!currentUser) return;

    setUnreadMessages(currentUser.unreadMessages);
  }, [currentUser?.unreadMessages]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // On clicking messaging a friend in the friends list
  const handleDirectMessage = async (
    friendId: string,
    currentUserId: string
  ) => {
    if (!friendId || !currentUserId) return;

    const ROOM_ID = [currentUserId, friendId].sort().join("_");

    try {
      const existingRoom = await getRoom(ROOM_ID);

      if (!existingRoom) {
        const newRoom = await makeRoom(
          [currentUserId, friendId],
          "direct",
          undefined,
          currentUserId
        );
        setRoomData(newRoom);
      } else {
        setRoomData(existingRoom);
      }

      if (currentUser?.userId) {
        updateUserDocument(currentUser.userId ?? "", {
          lastOpenedChatRoom: ROOM_ID,
          [`unreadMessages.${ROOM_ID}`]: deleteField(),
        });
      }

      await refreshUserData();
    } catch (error) {
      console.error("Error handling direct message:", error);
    }
  };

  // On clicking selecting a room in the rooms list
  const handleRoomSelect = async (roomId: string) => {
    try {
      setFetchingRoomData(true);
      const roomData = await getRoom(roomId);

      updateUserDocument(currentUser?.userId ?? "", {
        lastOpenedChatRoom: roomId,
        [`unreadMessages.${roomId}`]: deleteField(),
      });

      const ALL_ROOMS = [
        ...(currentUser?.chatRooms ?? []),
        ...unknownUserRooms,
      ];

      const UNREAD_MESSAGES_ROOMS = Object.keys(
        currentUser?.unreadMessages ?? {}
      );

      // These rooms are no longer rooms the user is in
      const LEFT_ROOMS = UNREAD_MESSAGES_ROOMS.filter(
        (unreadRoom) => !ALL_ROOMS.includes(unreadRoom)
      );

      if (LEFT_ROOMS.length > 0)
        await Promise.all(
          LEFT_ROOMS.map(
            async (roomId) =>
              await updateUserDocument(currentUser?.userId ?? "", {
                [`unreadMessages.${roomId}`]: deleteField(),
              })
          )
        ).then(() => {
          console.log("Old unreads cleared");
        });

      await refreshUserData();

      setRoomData(roomData);
      setFetchingRoomData(false);
    } catch (error) {
      console.error("Couldnt get room: ", error);
      setFetchingRoomData(false);
    }
  };

  // On adding a friend in the friends search
  const handleAddFriend = async (friendId: string) => {
    if (!friendId) return;

    try {
      const CURRENT_USER_ID = currentUser?.userId ?? "";

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

  const handleUnreadMessages = (
    message: IMessageData,
    currentRoomId: string
  ): void => {
    if (message.roomId !== currentRoomId) {
      setUnreadMessages((prev) => ({
        ...prev,
        [message.roomId]: (prev[message.roomId] || 0) + 1,
      }));
    }
  };

  const createGroup = async (groupName: string, selectedFriends: string[]) => {
    if (currentUser?.userId) {
      try {
        const NEW_ROOM = await makeRoom(
          [...selectedFriends, currentUser.userId],
          "group",
          groupName,
          currentUser.userId
        );

        toast.success(`Group '${NEW_ROOM.groupName}' created!`, {
          position: "bottom-right",
          autoClose: 3000,
          style: {
            backgroundColor: "#2a2a3a",
            color: "#00a9d1",
            border: "1px solid #00a9d1",
          },
        });

        await refreshUserData();

        setRoomData(NEW_ROOM);
        setIsGroupChatModalOpen(false);
      } catch (Err) {
        console.error("Error: Couldnt create new room - ", Err);
      }
    }
  };

  const resetUserData = async () => {
    console.log("Resetting user data! ... hopefully");

    await refreshUserData();

    console.log(currentUser);

    const ROOM_DATA = await getRoom(currentUser?.lastOpenedChatRoom ?? "");

    setRoomData(ROOM_DATA);
  };

  const removeTempRoom = async (roomId: string) => {
    const REMAINING_ROOMS = unknownUserRooms.filter((room) => room !== roomId);

    if (currentUser?.userId && currentUser.lastOpenedChatRoom === roomId) {
      await updateUserDocument(currentUser.userId ?? "", {
        lastOpenedChatRoom: GENERAL_ROOM_ID,
        [`unreadMessages.${roomId}`]: deleteField(),
      });

      const ROOM_DATA = await getRoom(GENERAL_ROOM_ID);

      setRoomData(ROOM_DATA);
    }

    setUnknownUserRooms(REMAINING_ROOMS);
  };

  return (
    <div className="chat-container">
      <div className={`sidebar-container ${isSidebarOpen ? "open" : "closed"}`}>
        <Sidebar
          handleDirectMessage={handleDirectMessage}
          handleRoomSelect={handleRoomSelect}
          friends={friends}
          userRooms={userRooms}
          friendsMap={friendsMap}
          contactsMap={contactsMap}
          unreadMessages={unreadMessages}
          roomData={roomData}
          fetchingRoomData={fetchingRoomData}
          setIsGroupChatModalOpen={() => setIsGroupChatModalOpen(true)}
          setdeleteGroupModalOpen={(groupName, roomId, participants) => {
            setDeleteGroupName(groupName);
            setDeleteGroupId(roomId);
            setDeleteGroupParticipants(participants);
            setdeleteGroupModalOpen(true);
          }}
          setLeaveGroupModalOpen={(groupName, roomId) => {
            setLeaveGroupName(groupName);
            setLeaveGroupId(roomId);
            setLeaveGroupModalOpen(true);
          }}
          setSearchFriendsModalOpen={() => setSearchFriendsModalOpen(true)}
          newRooms={unknownUserRooms}
        />
      </div>

      {/* Expand/Collapse Icon */}
      <button onClick={toggleSidebar} className="toggle-icon">
        <FontAwesomeIcon
          icon={isSidebarOpen ? faAngleDoubleLeft : faAngleDoubleRight}
        />
        {Object.keys(unreadMessages).length > 0 && (
          <span className="unread-indicator" />
        )}
      </button>

      {/* Main content */}
      <div className={`main-content ${isSidebarOpen ? "with-sidebar" : ""}`}>
        <Chat
          roomData={roomData}
          contactsMap={contactsMap}
          friends={friends}
          friendsMap={friendsMap}
          handleUnreadMessages={handleUnreadMessages}
        />
      </div>

      {isGroupChatModalOpen && (
        <NewGroupChatModal
          friends={friends}
          onClose={() => setIsGroupChatModalOpen(false)}
          onCreateGroup={createGroup}
        />
      )}

      {deleteGroupModalOpen && (
        <DeleteGroupModal
          groupName={deleteGroupName}
          closeModal={() => setdeleteGroupModalOpen(false)}
          roomId={deleteGroupId}
          roomParticipants={deleteGroupParticipants}
          refreshRoomData={() => resetUserData()}
          removeTempRoom={removeTempRoom}
        />
      )}

      {leaveGroupModalOpen && (
        <LeaveGroupModal
          groupName={leaveGroupName}
          closeModal={() => setLeaveGroupModalOpen(false)}
          roomId={leaveGroupId}
          refreshRoomData={() => resetUserData()}
          userData={currentUser}
          removeTempRoom={removeTempRoom}
        />
      )}

      {searchFriendsModalOpen && (
        <SearchFriendsModal
          closeModal={() => setSearchFriendsModalOpen(false)}
          friends={friends}
          handleAddFriend={handleAddFriend}
        />
      )}
      <ToastContainer />
    </div>
  );
}
