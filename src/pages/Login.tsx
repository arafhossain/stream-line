import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // State to handle the error message
  const { login } = useAuth();
  const navigate = useNavigate();

  const firebaseErrorMessages: { [key: string]: string } = {
    "auth/invalid-email": "The email address is badly formatted.",
    "auth/user-disabled":
      "This user has been disabled. Please contact support.",
    "auth/user-not-found": "No user found with this email address.",
    "auth/wrong-password": "The password is incorrect. Please try again.",
    "auth/invalid-credential": "The credentials provided are invalid.",
    "auth/network-request-failed":
      "Network error. Please check your connection.",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setIsLoading(true);
    e.preventDefault();
    try {
      await login(email, password);
      console.log("User logged in");
      setError(null);
    } catch (error: any) {
      console.error(error);

      if (error?.code && firebaseErrorMessages[error.code]) {
        setError(firebaseErrorMessages[error.code]);
      } else {
        setError("An unknown error occurred. Please try again.");
      }
    }
    setIsLoading(false);
  };

  const navigateToSignUp = async (e: React.FormEvent) => {
    navigate("/signup");
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>
        {loading && (
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        )}
        {!loading && (
          <div className="inputs-container">
            <input
              style={{ marginBottom: "15px" }}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Password"
              required
            />
          </div>
        )}
        {error && <p className="error-message">{error}</p>}
        <button type="submit">Login</button>
        <button type="button" onClick={navigateToSignUp}>
          Sign up
        </button>
      </form>
    </div>
  );
}
