import { useEffect, useRef, useState } from "react";
import "./Chat.css";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Prevent multiple WebSocket connections
    if (socketRef.current) return;

    // Create a WebSocket connection to the server
    socketRef.current = new WebSocket("ws://localhost:8080");

    socketRef.current.onopen = () => {
      console.log("WebSocket connection established");
    };

    // Handle incoming messages from the server, including the messages we send
    socketRef.current.onmessage = (event) => {
      const newMessage = event.data;
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    };

    // Clean up the WebSocket connection when the component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current?.close();
        socketRef.current = null;
      }
    };
  }, []);

  // Function to handle sending the message
  const handleSendMessage = () => {
    if (socketRef.current && message.trim() !== "") {
      socketRef.current.send(message);
      setMessage("");
    }
  };

  return (
    <div className="chat-content">
      <div className="message-list">
        {/* Example messages */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${index % 2 === 0 ? "outgoing" : "incoming"}`}
          >
            {msg}
          </div>
        ))}
      </div>

      <div className="input-container">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          onKeyUp={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
        />{" "}
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}
