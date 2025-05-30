import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import { useAuth } from "./contexts/AuthContext";
import ChatContainer from "./pages/ChatContainer";
import Profile from "./pages/Profile";
import { WebSocketProvider } from "./contexts/WebSocketContext";

function App() {
  const { currentUser } = useAuth();

  return (
    <WebSocketProvider>
      <Router>
        <Routes>
          {/* Redirect to Chat if the user is already logged in */}
          <Route
            path="/"
            element={
              currentUser ? <Navigate to="/chat" /> : <Navigate to="/login" />
            }
          />

          {/* Public Routes */}
          <Route
            path="/signup"
            element={currentUser ? <Navigate to="/chat" /> : <Signup />}
          />
          <Route
            path="/login"
            element={currentUser ? <Navigate to="/chat" /> : <Login />}
          />

          {/* Private Route: only accessible if logged in */}
          <Route
            path="/chat"
            element={currentUser ? <ChatContainer /> : <Navigate to="/login" />}
          />

          <Route
            path="/profile"
            element={currentUser ? <Profile /> : <Navigate to="/login" />}
          />
        </Routes>
      </Router>
    </WebSocketProvider>
  );
}

export default App;
