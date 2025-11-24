// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">HealthCare</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/dashboard" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200">Dashboard</Link>
            {user && (
              <>
                {user.role === 'patient' && (
                  <Link to="/patient" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200">Patient Portal</Link>
                )}
                {user.role === 'doctor' && (
                  <Link to="/doctor" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200">Doctor Portal</Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200">Admin Panel</Link>
                )}
              </>
            )}
            <Link to="/appointments" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200">Appointments</Link>
            <Link to="/doctors" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200">Find Doctors</Link>
            
            {/* User Menu */}
            {user ? (
              <div className="relative dropdown-container">
                <button 
                  onClick={toggleDropdown}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200"
                >
                  <span className="hidden md:inline">Hi, {user.firstName}</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <div className={`absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 ${isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'} transition-all duration-200`}>
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</Link>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200">Login</Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden text-gray-700 focus:outline-none"
            onClick={toggleMenu}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <Link to="/dashboard" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
              {user && (
                <>
                  {user.role === 'patient' && (
                    <Link to="/patient" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Patient Portal</Link>
                  )}
                  {user.role === 'doctor' && (
                    <Link to="/doctor" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Doctor Portal</Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Admin Panel</Link>
                  )}
                </>
              )}
              <Link to="/appointments" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Appointments</Link>
              <Link to="/doctors" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Find Doctors</Link>
              
              {user ? (
                <div className="pt-2 border-t border-gray-200">
                  <Link to="/profile" className="block text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Profile</Link>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link to="/login" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200" onClick={() => setIsMenuOpen(false)}>Login</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;