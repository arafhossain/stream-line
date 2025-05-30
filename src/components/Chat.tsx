import { useEffect, useRef, useState } from "react";
import "./Chat.css";
import { IMessageData } from "../models/IMessageData";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { saveMessageToFirestore } from "../services/messageService";
import { useAuth } from "../contexts/AuthContext";
import { IRoomData } from "../models/IRoomData";
import { getRoom } from "../services/roomService";
import { IUserData } from "../models/IUserData";
import { useWebSocket } from "../contexts/WebSocketContext";
import { updateUserDocument } from "../services/userService";
import { EMOJIS, GENERAL_ROOM_ID } from "../helpers/Defaults";
import type { Faker } from "@faker-js/faker";
import { formatLastSeen } from "./Sidebar";

interface IChatProps {
  roomData: IRoomData | null;
  friends: IUserData[];
  friendsMap: Record<string, string>;
  contactsMap: Record<string, string>;
  handleUnreadMessages: (message: IMessageData, currentRoomId: string) => void;
}

const Chat: React.FC<IChatProps> = (props: IChatProps) => {
  // Contexts
  const { currentUser } = useAuth();
  const { isConnected, sendMessage, registerMessageHandler } = useWebSocket();

  // Room State
  const [roomData, setRoomData] = useState<IRoomData | null>(null);
  const roomDataRef = useRef<IRoomData | null>(null);

  // Message State
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<IMessageData[]>([]);
  const [didloadMessages, setDidLoadMessages] = useState(false);
  const [fakerInstance, setFakerInstance] = useState<Faker | null>(null);

  // Typing-related State
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const isTyping = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket and DOM Refs
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  // Page Visibility and Unread Messages
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const isPageVisibleRef = useRef(isPageVisible);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  // Loading state
  const [hasConnectionError, setHasConnectionError] = useState(false);

  // Scroll to the latest message whenever the messages array changes
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleTabClose = async () => {
      if (currentUser?.userId) {
        const userRef = doc(db, "users", currentUser.userId);
        await updateDoc(userRef, {
          lastSeen: serverTimestamp(),
        });
      }
    };

    window.addEventListener("beforeunload", handleTabClose);

    if (currentUser) {
      setShowWelcomeBanner(!currentUser.seenWelcome);
    }
    if (currentUser)
      return () => {
        window.removeEventListener("beforeunload", handleTabClose);
      };
  }, [currentUser]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const newVisibility = !document.hidden;
      setIsPageVisible(newVisibility);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    isPageVisibleRef.current = isPageVisible;
  }, [isPageVisible]);

  useEffect(() => {
    const initializeRoom = async () => {
      if (props.roomData === null) {
        let ROOM_ID = "";

        if (currentUser?.lastOpenedChatRoom) {
          ROOM_ID = currentUser.lastOpenedChatRoom;
        } else {
          ROOM_ID =
            currentUser &&
            Array.isArray(currentUser.chatRooms) &&
            currentUser.chatRooms.length > 0
              ? currentUser.chatRooms[0]
              : "";
        }

        if (ROOM_ID) {
          const ROOM_DATA = await getRoom(ROOM_ID);

          if (ROOM_DATA) {
            roomDataRef.current = ROOM_DATA;
            console.log("New room data: ", roomDataRef.current);

            setRoomData(ROOM_DATA);
          }
        }
      } else {
        roomDataRef.current = props.roomData;
        setRoomData(props.roomData);
      }
    };
    initializeRoom();
  }, [props.roomData]);

  useEffect(() => {
    if (!isPageVisible && unreadMessages > 0) {
      document.title = `(${unreadMessages}) New Messages - StreamLine`;
    } else {
      document.title = "StreamLine";
    }
  }, [unreadMessages, isPageVisible]);

  useEffect(() => {
    if (isPageVisible) {
      setUnreadMessages(0);
      document.title = "StreamLine";
    }
  }, [isPageVisible]);

  useEffect(() => {
    if (!roomData || !isConnected) return;

    const JOIN_MESSAGE: IMessageData = {
      userId: currentUser?.userId ?? "",
      username: currentUser?.username ?? "",
      type: "join",
      roomId: roomData.roomId,
    };

    sendMessage(JOIN_MESSAGE);
  }, [roomData, isConnected]);

  useEffect(() => {
    const handleNewMessage = (messageData: IMessageData) => {
      const currentRoomId = roomDataRef.current?.roomId ?? "";

      console.log("MD: ", messageData);
      if (messageData.type === "typing") {
        setTypingUser(messageData.username);
      } else if (messageData.type === "stop_typing") {
        setTypingUser(null);
      } else if (
        messageData.type === "message" &&
        messageData.roomId === currentRoomId &&
        messageData.timestamp
      ) {
        props.handleUnreadMessages(messageData, currentRoomId);

        const localTime = convertToLocalTime(messageData.timestamp);

        if (messageData.roomId === currentRoomId) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { ...messageData, timestamp: localTime },
          ]);

          if (!isPageVisibleRef.current) {
            setUnreadMessages((prev) => prev + 1);
          }
        }
      }
    };

    registerMessageHandler(handleNewMessage);

    return () => {
      registerMessageHandler(() => {});
    };
  }, [roomData, registerMessageHandler]);

  useEffect(() => {
    if (!roomData) return;

    const ROOM_ID = roomData?.roomId ? roomData.roomId : null;

    if (ROOM_ID) {
      const loadMessages = async () => {
        const historicalMessages = await loadHistoricalMessages(ROOM_ID);

        setMessages(historicalMessages);
        setDidLoadMessages(true);
      };

      loadMessages();
    }
  }, [roomData]);

  useEffect(() => {
    const loadFaker = async () => {
      const { faker } = await import("@faker-js/faker");
      setFakerInstance(faker);
    };

    loadFaker();
  }, []);

  const useFakeMessageGenerator = (
    isActive: boolean,
    callback: () => void
  ): void => {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      if (isActive) {
        intervalRef.current = setInterval(() => {
          callback();
        }, Math.random() * 4000 + 2000);
      }

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [isActive, callback]);
  };

  useFakeMessageGenerator(
    didloadMessages && !!fakerInstance && roomData?.roomId === GENERAL_ROOM_ID,
    () => {
      if (!fakerInstance) return;

      const userName =
        fakerInstance.internet.username() +
        EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

      const FAKE_MESSAGE: IMessageData = {
        username: userName,
        type: "message",
        text:
          Math.random() > 0.5
            ? fakerInstance.hacker.phrase()
            : fakerInstance.company.buzzPhrase(),
        roomId: roomData?.roomId ?? "",
        timestamp: convertToLocalTime(new Date().toISOString()),
        userId: "",
      };

      setMessages((prev) => [...prev, FAKE_MESSAGE]);
    }
  );

  const loadHistoricalMessages = async (
    roomId: string
  ): Promise<IMessageData[]> => {
    try {
      const messagesRef = collection(db, "messages");
      const q = query(
        messagesRef,
        orderBy("timestamp", "desc"),
        limit(50),
        where("roomId", "==", roomId)
      );

      const querySnapshot = await getDocs(q);

      const messages = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            username: data.username as string,
            userId: data.uid as string,
            text: data.text as string,
            timestamp: convertToLocalTime(
              (data.timestamp as Timestamp).toDate().toISOString()
            ),
            roomId: data.roomId as string,
            type: data.type as string,
            email: data.email as string,
          } as IMessageData;
        })
        .reverse();

      return messages;
    } catch (err) {
      console.error("Error: ", err);
      return [];
    }
  };

  const handleSendMessage = () => {
    if (message.trim() !== "") {
      const NEW_MESSAGE: IMessageData = {
        username: currentUser?.username ?? "",
        userId: currentUser?.userId ?? "",
        text: message,
        timestamp: new Date().toISOString(),
        type: "message",
        roomId: roomData?.roomId ?? "ERROR",
        email: currentUser?.email ?? "",
      };
      sendMessage(NEW_MESSAGE);

      saveMessageToFirestore(NEW_MESSAGE);

      setMessage("");

      stopTyping();
    }
  };

  const stopTyping = () => {
    const STOP_MESSAGE: IMessageData = {
      type: "stop_typing",
      username: currentUser?.username ?? "",
      userId: currentUser?.userId ?? "",
      roomId: roomData?.roomId ?? "",
    };

    sendMessage(STOP_MESSAGE);
    isTyping.current = false;
  };

  const handleTyping = () => {
    if (!isTyping.current) {
      const TYPING_MESSAGE: IMessageData = {
        type: "typing",
        username: currentUser?.username ?? "",
        userId: currentUser?.userId ?? "",
        roomId: roomData?.roomId ?? "",
      };
      sendMessage(TYPING_MESSAGE);
      isTyping.current = true;
    }

    // Reset the typing timeout if the user keeps typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };

  const convertToLocalTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const today = new Date();

    // Check if the message is from today
    const isToday =
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();

    if (isToday) {
      return `Today, ${messageDate.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })}`;
    } else {
      return messageDate.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
    }
  };

  const getUserColor = (userId: string) => {
    const colors = [
      "#3a3a3a",
      "#454545",
      "#505050",
      "#5a5a5a",
      "#666",
      "#717171",
      "#7b7b7b",
      "#868686",
      "#919191",
      "#9c9c9c",
    ];
    let hash = 0;

    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
      hash = Math.floor(Math.random() * 10);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  if (!isConnected) {
    return (
      <div className="connecting-container">
        <div className="spinner"></div>
        <p>Connecting to the server...</p>
      </div>
    );
  }

  if (hasConnectionError) {
    return (
      <div className="server-status">
        <p>Can't reach server. Please reload the page.</p>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="connecting-container">
        <div className="spinner"></div>
        <p>Joining the room...</p>
      </div>
    );
  } else
    return (
      <div className="chat-content">
        <div className="chat-header">
          {roomData?.type === "group" ? (
            <h3 className="chat-title">
              Group Chat: {roomData.groupName || "Unnamed Group"}
            </h3>
          ) : (
            <h3 className="chat-title">
              Chat with{" "}
              {roomData?.participants
                .filter((uid) => uid !== currentUser?.userId) // Exclude current user
                .map(
                  (uid) =>
                    props.friendsMap[uid] ||
                    props.contactsMap[uid] ||
                    "Unknown User"
                )
                .join(", ")}
              {roomData.type === "direct" && (
                <div className="chat-last-seen">
                  Last seen:{" "}
                  {formatLastSeen(
                    props.friends.filter(
                      (friendData) =>
                        friendData.userId === roomData.participants[0]
                    )[0].lastSeen
                  )}
                </div>
              )}
            </h3>
          )}
          {roomData?.type === "group" && roomData.participants.length > 0 && (
            <p className="chat-participants">
              {roomData.participants
                .map((participantId) => {
                  let NAME =
                    participantId === currentUser?.userId
                      ? "You"
                      : props.friendsMap[participantId]
                      ? props.friendsMap[participantId]
                      : props.contactsMap[participantId]
                      ? props.contactsMap[participantId]
                      : "";

                  const ADMIN_ID = roomData.adminId;

                  if (participantId === ADMIN_ID) NAME = NAME.concat("(Admin)");

                  return NAME;
                })
                .join(", ")}
            </p>
          )}
        </div>
        <div className="chat-window">
          <div className="message-list">
            {messages.length === 0 && (
              <p className="message" style={{ fontStyle: "italic" }}>
                You have no messages! Chat to get started!
              </p>
            )}
            {messages.length > 0 &&
              messages.map((msg, index) =>
                msg.text?.includes("has left the chat") ? (
                  <div key={index} className="system-message">
                    <span>{msg.username} has left the chat.</span>
                    <small>{msg.timestamp}</small>
                  </div>
                ) : (
                  <div
                    key={index}
                    className={`message ${
                      msg.email === currentUser?.email ? "outgoing" : "incoming"
                    }`}
                    style={{ backgroundColor: getUserColor(msg.username) }}
                  >
                    <strong>
                      {msg.email === currentUser?.email
                        ? `${msg.username}(me)`
                        : msg.username}
                    </strong>
                    : {msg.text} <br />
                    <small>{msg.timestamp}</small>
                  </div>
                )
              )}
            <div ref={messageEndRef} />
          </div>
          {typingUser && (
            <div className="typing-indicator">
              <em>{typingUser} is typing...</em>
            </div>
          )}
        </div>

        <div className="input-container">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyUp={(e) => {
              handleTyping();
              if (e.key === "Enter") handleSendMessage();
            }}
          />{" "}
          <button onClick={handleSendMessage}>Send</button>
        </div>

        {showWelcomeBanner && (
          <div className="welcome-banner">
            <div className="welcome-content">
              <h2>👋 Welcome to StreamLine!</h2>
              <p>
                You’ve joined the default room, <strong>The Pit</strong>. You
                can start a group chat or search for friends using the sidebar.
              </p>
              <button
                onClick={() => {
                  updateUserDocument(currentUser?.userId ?? "", {
                    seenWelcome: true,
                  });
                  setShowWelcomeBanner(false);
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    );
};

export default Chat;
