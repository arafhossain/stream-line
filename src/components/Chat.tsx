import { useEffect, useRef, useState } from "react";
import "./Chat.css";
import { IMessageData } from "../models/IMessageData";

export default function Chat() {
  const [username, setUsername] = useState("");
  const [hasEnteredChat, setHasEnteredChat] = useState(false);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<IMessageData[]>([]);

  const [typingUser, setTypingUser] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTyping = useRef(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Scroll to the latest message whenever the messages array changes
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    // Prevent multiple WebSocket connections
    if (socketRef.current) return;

    if (hasEnteredChat) {
      socketRef.current = new WebSocket("ws://localhost:8080");

      socketRef.current.onopen = () => {
        console.log("WebSocket connection established");
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

          if (!isPageVisible) {
            setUnreadMessages((prev) => prev + 1);
          }
        }
      };

      // Clean up the WebSocket connection when the component unmounts
      return () => {
        if (socketRef.current) {
          socketRef.current?.close();
          socketRef.current = null;
        }
      };
    }
  }, [hasEnteredChat]);

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

  // Function to handle sending the message
  const handleSendMessage = () => {
    if (socketRef.current && message.trim() !== "") {
      const messageData = {
        user: username,
        text: message,
        timestamp: new Date().toISOString(),
      };
      socketRef.current.send(
        JSON.stringify({ type: "message", ...messageData })
      ); // Send message data to server
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
          {/* Typing Indicator Inline with Messages */}
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
