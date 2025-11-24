// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse stored user, clearing auth data');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  // ---------- LOGIN ----------
  const login = async (email, password) => {
    try {
      const response = await axios.post(
        'http://localhost:8080/api/auth/login',
        { email, password }
      );

      const { token, user } = response.data;

      // Store token + full user (including phone)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error.response || error.message);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          'Login failed. Please check your credentials.'
      };
    }
  };

  // ---------- REGISTER ----------
  // NOTE: we DO NOT log in the user here anymore.
  const register = async (userData) => {
    try {
      await axios.post('http://localhost:8080/api/auth/register', userData);

      // No token / user saved here – user must log in manually
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error.response || error.message);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          'Registration failed. Please try again.'
      };
    }
  };

  // ---------- LOGOUT ----------
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
