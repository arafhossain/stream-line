import { useEffect, useRef, useState } from "react";
import "./Chat.css";
import { IMessageData } from "../models/IMessageData";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { saveMessageToFirestore } from "../services/messageService";

export default function Chat() {
  // User State
  const [username, setUsername] = useState("");
  const [hasEnteredChat, setHasEnteredChat] = useState(false);

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

    socketRef.current.onmessage = (event) => {
      const messageData: IMessageData = JSON.parse(event.data);

      if (messageData.type === "typing") {
        setTypingUser(messageData.user);
      } else if (messageData.type === "stop_typing") {
        setTypingUser(null);
      } else if (messageData.type === "message" && messageData.timestamp) {
        const localTime = new Date(messageData.timestamp).toLocaleString(
          "en-US",
          {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }
        );

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
    const loadMessages = async () => {
      const historicalMessages = await loadHistoricalMessages();
      // setMessages(historicalMessages);
    };

    loadMessages();
  }, []);

  const loadHistoricalMessages = async () => {
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50)); // Last 50 messages

    const querySnapshot = await getDocs(q);
    console.log("His messages: ", querySnapshot.docs);

    const messages = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(messages);

    return messages;
  };

  // Function to handle sending the message
  const handleSendMessage = () => {
    if (socketRef.current && message.trim() !== "") {
      const messageData: IMessageData = {
        user: username,
        text: message,
        timestamp: new Date().toISOString(),
        type: "message",
      };
      socketRef.current.send(JSON.stringify({ ...messageData })); // Send message data to server

      saveMessageToFirestore(messageData);

      setMessage("");

      // Stop typing indicator when the message is sent
      socketRef.current.send(
        JSON.stringify({ type: "stop_typing", user: username })
      );
      isTyping.current = false;
    }
  };

  const handleTyping = () => {
    if (!isTyping.current && socketRef.current) {
      socketRef.current.send(
        JSON.stringify({ type: "typing", user: username })
      );
      isTyping.current = true;
    }

    // Reset the typing timeout if the user keeps typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.send(
        JSON.stringify({ type: "stop_typing", user: username })
      );
      isTyping.current = false;
    }, 2000);
  };

  if (isConnecting) {
    return (
      <div className="connecting-container">
        <div className="spinner"></div>
        <p>Connecting to the server...</p>
      </div>
    );
  }
  console.log(hasConnectionError);
  // If the server connection failed, show a "Server Disconnected" message
  if (hasConnectionError) {
    return (
      <div className="server-status">
        <p>Can't reach server. Please reload the page.</p>
      </div>
    );
  }

  if (!hasEnteredChat) {
    return (
      <div className="username-entry">
        <h2>Enter a Username</h2>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyUp={(e) => {
            if (e.key === "Enter") setHasEnteredChat(true);
          }}
        />
        <button onClick={() => setHasEnteredChat(true)} disabled={!username}>
          Join Chat
        </button>
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
                msg.user === username ? "outgoing" : "incoming"
              }`}
            >
              <strong>
                {msg.user === username ? `${msg.user}(me)` : msg.user}
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
