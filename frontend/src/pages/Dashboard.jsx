// src/pages/Dashboard.js
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Redirect based on user role
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" />;
    case 'doctor':
      return <Navigate to="/doctor" />;
    case 'patient':
      return <Navigate to="/patient" />;
    default:
      return <Navigate to="/login" />;
  }
};

export default Dashboard;