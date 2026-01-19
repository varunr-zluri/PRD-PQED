import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import SubmitRequest from './pages/SubmitRequest';
import ApprovalDashboard from './pages/ApprovalDashboard';
import MySubmissions from './pages/MySubmissions';
import Profile from './pages/Profile';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '12px'
      }}>
        <span className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Role-based route protection
const ManagerRoute = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'MANAGER') {
    return <Navigate to="/" />;
  }
  return children;
};

const DeveloperRoute = ({ children }) => {
  const { user } = useAuth();
  if (user?.role === 'MANAGER') {
    return <Navigate to="/approvals" />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="submit" element={
              <DeveloperRoute>
                <SubmitRequest />
              </DeveloperRoute>
            } />
            <Route path="approvals" element={
              <ManagerRoute>
                <ApprovalDashboard />
              </ManagerRoute>
            } />
            <Route path="history" element={
              <DeveloperRoute>
                <MySubmissions />
              </DeveloperRoute>
            } />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
        />
      </AuthProvider>
    </Router>
  );
}

export default App;

