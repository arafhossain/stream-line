import Sidebar from "../components/Sidebar";
import Chat from "../components/Chat";
import "./ChatLayout.css";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
} from "@fortawesome/free-solid-svg-icons";

export default function ChatLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <div className={`sidebar-container ${isSidebarOpen ? "open" : "closed"}`}>
        <Sidebar />
      </div>

      {/* Expand/Collapse Icon */}
      <button onClick={toggleSidebar} className="toggle-icon">
        <FontAwesomeIcon
          icon={isSidebarOpen ? faAngleDoubleLeft : faAngleDoubleRight}
        />
      </button>

      {/* Main content */}
      <div className={`main-content ${isSidebarOpen ? "with-sidebar" : ""}`}>
        <Chat />
      </div>
    </div>
  );
}
