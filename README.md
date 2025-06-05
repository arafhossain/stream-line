# Stream-Line

A real-time chat application built with TypeScript, React, Node.js, WebSockets, and Firebase. This project showcases full-stack development skills, focusing on scalable user and message state management.

This is the front-end of the project. The back-end can be found here: [Stream-Line Backend](https://github.com/arafhossain/stream-line-backend)

---

## 🚀 Features

### Authentication

- Email/password signup & login
- Firebase Authentication with user profile documents in Firestore

### Chat System

- **Group Chat**:

  - Join default “General” group on signup
  - Create & manage group chats
  - Delete group chats (admin only)
  - View participants of each group

- **Direct Messaging**:

  - Initiate direct messages with friends
  - Display chat participants in direct message view

- **Messages**:
  - Real-time messaging via WebSockets
  - Typing indicators
  - Timestamps on messages
  - Persist messages in Firestore

### Friends System

- Search users by username or email
- Add/remove friends
- Friends list with last seen timestamps

### Notifications

- **Unread messages tracking**:
  - Real-time updates to unread counts for each room
  - Sidebar badges for unread message counts
- **Unread message persistence**:
  - Last seen timestamps used to determine unread messages

### UI / UX

- Responsive sidebar with:

  - Profile access
  - Friends list toggle
  - Search for friends
  - Create new group
  - Logout

- Modals for:

  - Creating group chats
  - Searching for friends
  - Confirming room deletion

- **Accessibility / Usability**:
  - Welcome banner for new users
  - Smooth transitions and polished interactions
  - Consistent theming and color scheme

---

## 🛠️ Tech Stack

- **Frontend**:

  - React (with TypeScript)
  - React Router
  - Context API for global state
  - CSS Modules for styling

- **Backend**:

  - Node.js with WebSocket server
  - Firebase Firestore for real-time data
  - Firebase Authentication for user management

- **Database**:
  - Firestore collections: users, chatRooms, messages

---

## 🌟 Installation & Usage

1. **Clone the repo**:

   ```bash
   git clone https://github.com/arafhossain/stream-line.git
   ```

2. **Install dependencies**:

   ```bash
    cd your-repo
    npm install
   ```

3. **Start the websocket server**:

   ```bash
   cd server
   node server.js
   ```

4. **Start the React Client**:

   ```bash
   npm start
   ```

5. **Environment Variables**:

   - Configure Firebase project details in your .env file.

## Future Enhancements

- User presence tracking and indicators
- More robust error handling (e.g., retrying WebSocket connections)
- Message search or filters
- Profile customization (e.g., status messages, profile pictures)
- Dark mode / theming options

📄 License

MIT License. See LICENSE file for details.

⸻

Feel free to fork, improve, and share! If you found this helpful, let me know or consider contributing to future enhancements. 🚀
