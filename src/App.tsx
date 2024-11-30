import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import { useAuth } from "./contexts/AuthContext";
import ChatLayout from "./pages/ChatLayout";
import Profile from "./pages/Profile";

function App() {
  const { currentUser } = useAuth();

  return (
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
          element={currentUser ? <ChatLayout /> : <Navigate to="/login" />}
        />

        <Route
          path="/profile"
          element={currentUser ? <Profile /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
