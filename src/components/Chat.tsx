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
} from "firebase/firestore";
import { db } from "../services/firebase";
import { saveMessageToFirestore } from "../services/messageService";
import { useAuth } from "../contexts/AuthContext";
import { IRoomData } from "../models/IRoomData";
import { v4 as uuidv4 } from "uuid";
import { getRoom, makeRoom } from "../services/roomService";

const GENERAL_ROOM_ID = "630c57bc-48ac-4873-ac43-d87715b8813a";

export default function Chat() {
  const { currentUser } = useAuth();

  // Room State
  const [roomData, setRoomData] = useState<IRoomData | null>(null);

  // Message State
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<IMessageData[]>([]);

  // Typing-related State
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const isTyping = useRef(false); // Mutable ref for typing status
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket and DOM Refs
  const socketRef = useRef<WebSocket | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  // Page Visibility and Unread Messages
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const isPageVisibleRef = useRef(isPageVisible);

  // Loading state
  const [isConnecting, setIsConnecting] = useState(true);
  const [hasConnectionError, setHasConnectionError] = useState(false);

  // Scroll to the latest message whenever the messages array changes
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const newVisibility = !document.hidden;
      setIsPageVisible(newVisibility); // Update state
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    isPageVisibleRef.current = isPageVisible; // Keep the ref up to date with the latest state
  }, [isPageVisible]);

  useEffect(() => {
    // Prevent multiple WebSocket connections
    if (socketRef.current) return;

    socketRef.current = new WebSocket("ws://localhost:8080");

    socketRef.current.onopen = () => {
      console.log("WebSocket connection established");
      setIsConnecting(false);
      setHasConnectionError(false);
    };

    socketRef.current.onmessage = handleSocketMessage;

    socketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnecting(false);
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setHasConnectionError(true);
    };

    // Clean up WebSocket connection on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current?.close();
        socketRef.current = null;
      }
    };
  }, []);

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
    const initializeRoom = async () => {
      const ROOM_DATA = await getRoom(GENERAL_ROOM_ID);

      if (ROOM_DATA !== null) {
        setRoomData(ROOM_DATA);
      } else {
        await makeRoom([], "group", "General");
      }
    };

    initializeRoom();
  }, []);

  useEffect(() => {
    if (!roomData) return;

    const ROOM_ID = roomData?.roomId ? roomData.roomId : null;

    if (ROOM_ID) {
      const loadMessages = async () => {
        const historicalMessages = await loadHistoricalMessages(ROOM_ID);

        setMessages(historicalMessages);
      };
      loadMessages();
    }
  }, [roomData]);

  const loadHistoricalMessages = async (
    roomId: string
  ): Promise<IMessageData[]> => {
    try {
      const messagesRef = collection(db, "messages");
      const q = query(
        messagesRef,
        orderBy("timestamp", "asc"),
        limit(50),
        where("roomId", "==", roomId)
      ); // Last 50 messages

      const querySnapshot = await getDocs(q);

      const messages = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          username: data.username as string,
          text: data.text as string,
          timestamp: convertToLocalTime(
            (data.timestamp as Timestamp).toDate().toISOString()
          ),
          roomId: data.roomId as string,
          type: data.type as string,
          email: data.email as string,
        } as IMessageData;
      });

      return messages;
    } catch (err) {
      console.error("Error: ", err);
      return [];
    }
  };

  const handleSocketMessage = (event: MessageEvent) => {
    const messageData: IMessageData = JSON.parse(event.data);

    if (messageData.type === "typing") {
      setTypingUser(messageData.username);
    } else if (messageData.type === "stop_typing") {
      setTypingUser(null);
    } else if (messageData.type === "message" && messageData.timestamp) {
      const localTime = convertToLocalTime(messageData.timestamp);

      setMessages((prevMessages) => [
        ...prevMessages,
        { ...messageData, timestamp: localTime },
      ]);

      // Use the ref to check the latest page visibility state
      if (!isPageVisibleRef.current) {
        setUnreadMessages((prev) => prev + 1);
      }
    }
  };

  // Function to handle sending the message
  const handleSendMessage = () => {
    if (socketRef.current && message.trim() !== "") {
      const NEW_MESSAGE: IMessageData = {
        username: currentUser?.userName ?? "",
        text: message,
        timestamp: new Date().toISOString(),
        type: "message",
        roomId: roomData?.roomId ?? "ERROR",
        email: currentUser?.email ?? "",
      };
      socketRef.current.send(JSON.stringify(NEW_MESSAGE)); // Send message data to server

      saveMessageToFirestore(NEW_MESSAGE);

      setMessage("");

      stopTyping();
    }
  };

  const stopTyping = () => {
    const STOP_MESSAGE: IMessageData = {
      type: "stop_typing",
      username: currentUser?.userName ?? "",
    };
    socketRef.current?.send(JSON.stringify(STOP_MESSAGE));
    isTyping.current = false;
  };

  const handleTyping = () => {
    if (!isTyping.current && socketRef.current) {
      const TYPING_MESSAGE: IMessageData = {
        type: "typing",
        username: currentUser?.userName ?? "",
      };
      socketRef.current.send(JSON.stringify(TYPING_MESSAGE));
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

  if (isConnecting) {
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
        <div className="message-list">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.email === currentUser?.email ? "outgoing" : "incoming"
              }`}
            >
              <strong>
                {msg.email === currentUser?.email
                  ? `${msg.username}(me)`
                  : msg.username}
              </strong>
              : {msg.text} <br />
              <small>{msg.timestamp}</small>
            </div>
          ))}
          {typingUser && (
            <div className="typing-indicator">
              <em>{typingUser} is typing...</em>
            </div>
          )}
          <div ref={messageEndRef} />
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
      </div>
    );
}
