import Sidebar from "../components/Sidebar";
import Chat from "../components/Chat";
import "./ChatLayout.css";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
} from "@fortawesome/free-solid-svg-icons";
import { ToastContainer } from "react-toastify";
import { getRoom, makeRoom } from "../services/roomService";
import { IRoomData } from "../models/IRoomData";

export default function ChatLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [roomData, setRoomData] = useState<IRoomData | null>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleDirectMessage = async (
    friendId: string,
    currentUserId: string
  ) => {
    const roomId = [currentUserId, friendId].sort().join("_");

    try {
      const existingRoom = await getRoom(roomId);
      if (!existingRoom) {
        const newRoom = await makeRoom([currentUserId, friendId], "direct");
        setRoomData(newRoom);
      } else {
        setRoomData(existingRoom);
      }
    } catch (error) {
      console.error("Error handling direct message:", error);
    }
  };

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className={`sidebar-container ${isSidebarOpen ? "open" : "closed"}`}>
        <Sidebar handleDirectMessage={handleDirectMessage} />
      </div>

      {/* Expand/Collapse Icon */}
      <button onClick={toggleSidebar} className="toggle-icon">
        <FontAwesomeIcon
          icon={isSidebarOpen ? faAngleDoubleLeft : faAngleDoubleRight}
        />
      </button>

      {/* Main content */}
      <div className={`main-content ${isSidebarOpen ? "with-sidebar" : ""}`}>
        <Chat roomData={roomData} />
      </div>
      <ToastContainer />
    </div>
  );
}
