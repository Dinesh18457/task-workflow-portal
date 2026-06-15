import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { getAuthUser } from './api/client';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import './App.css';

function PrivateRoute({ children }) {
  return getAuthUser() ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  return getAuthUser() ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
