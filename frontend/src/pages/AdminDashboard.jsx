// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  DocumentTextIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    totalTreatments: 0,
  });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get(
          'http://localhost:8080/api/admin/dashboard'
        );
        const { stats, recentPatients, recentDoctors, recentAppointments } =
          res.data;

        setStats(stats);
        setPatients(recentPatients);
        setDoctors(recentDoctors);
        setAppointments(recentAppointments);
      } catch (err) {
        console.error('Error loading admin dashboard:', err);
      }
    };

    fetchDashboard();
  }, []);

  const StatCard = ({ title, value, icon, color }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-${color}-500`}
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </motion.div>
  );

  const RecentItemCard = ({ item, type }) => (
    <motion.div
      whileHover={{ x: 5 }}
      className="bg-white rounded-lg shadow-md p-4 mb-3"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900">
            {type === 'patient'
              ? `${item.first_name} ${item.last_name}`
              : type === 'doctor'
              ? `Dr. ${item.first_name} ${item.last_name}`
              : `${item.patient_first_name} ${item.patient_last_name}`}
          </h3>

          <p className="text-sm text-gray-500">
            {type === 'patient' && item.email}
            {type === 'doctor' &&
              `${item.specialization}${
                item.department_name ? ` • ${item.department_name}` : ''
              }`}
            {type === 'appointment' &&
              `${new Date(item.appointment_date).toLocaleDateString()} at ${
                item.appointment_time
              } (Dr. ${item.doctor_first_name} ${item.doctor_last_name})`}
          </p>

          {type === 'appointment' && (
            <span
              className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                item.status === 'scheduled'
                  ? 'bg-green-100 text-green-800'
                  : item.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : item.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {item.status}
            </span>
          )}
        </div>

        <div className="flex items-center">
          {(type === 'patient' || type === 'doctor') && (
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                item.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {item.status}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  HealthCare Admin
                </h1>
              </div>
            </div>
            <div className="flex items-center">
              <div className="mr-4">
                <span className="text-gray-700 mr-4">
                  Welcome, {user.firstName} {user.lastName}
                </span>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor your hospital operations and manage resources efficiently.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={<UsersIcon className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="Total Doctors"
            value={stats.totalDoctors}
            icon={<ChartBarIcon className="h-6 w-6" />}
            color="green"
          />
          <StatCard
            title="Total Appointments"
            value={stats.totalAppointments}
            icon={<CalendarIcon className="h-6 w-6" />}
            color="yellow"
          />
          <StatCard
            title="Total Treatments"
            value={stats.totalTreatments}
            icon={<DocumentTextIcon className="h-6 w-6" />}
            color="purple"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Patients */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Patients
              </h3>
              <Link
                to="/patients"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {patients.map((patient) => (
                <RecentItemCard
                  key={patient.id}
                  item={patient}
                  type="patient"
                />
              ))}
            </div>
          </div>

          {/* Recent Doctors */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Active Doctors
              </h3>
              <Link
                to="/doctors"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {doctors.map((doctor) => (
                <RecentItemCard
                  key={doctor.id}
                  item={doctor}
                  type="doctor"
                />
              ))}
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Appointments
              </h3>
              <Link
                to="/appointments"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <RecentItemCard
                  key={appointment.id}
                  item={appointment}
                  type="appointment"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions – still UI only for now */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <PlusIcon className="h-5 w-5 mr-2 text-gray-600" />
              <span className="text-gray-700">Add New Patient</span>
            </button>
            <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <PlusIcon className="h-5 w-5 mr-2 text-gray-600" />
              <span className="text-gray-700">Add New Doctor</span>
            </button>
            <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <CalendarIcon className="h-5 w-5 mr-2 text-gray-600" />
              <span className="text-gray-700">Schedule Appointment</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
