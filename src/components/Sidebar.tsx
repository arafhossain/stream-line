import React from "react";
import "./Sidebar.css";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h2>Menu</h2>
      <ul>
        <li>
          <button>Profile</button>
        </li>
        <li>
          <button>Friends List</button>
        </li>
        <li>
          <button>Search for Friends</button>
        </li>
        <li>
          <button>Settings</button>
        </li>
        <li>
          <button>Logout</button>
        </li>
      </ul>
    </div>
  );
}
