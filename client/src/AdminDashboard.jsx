import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const AdminDashboard = () => {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('adminKey') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-key': adminKey
  };

  // Check if admin key is valid
  const checkAuth = async () => {
    if (!adminKey) return;

    try {
      const response = await fetch(`${API_URL}/admin/stats`, { headers });
      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('adminKey', adminKey);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setIsAuthenticated(false);
        toast.error(errorData.error || `Invalid admin key (Status: ${response.status})`);
        console.error('Admin auth failed:', errorData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      toast.error('Failed to connect to admin API');
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/stats`, { headers });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast.error('Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Error loading statistics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reports
  const fetchReports = async (status = '') => {
    setLoading(true);
    try {
      const url = status ? `${API_URL}/admin/reports?status=${status}` : `${API_URL}/admin/reports`;
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        toast.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Error loading reports');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users
  const fetchUsers = async (filters = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const url = queryParams ? `${API_URL}/admin/users?${queryParams}` : `${API_URL}/admin/users`;
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  // Update report status
  const updateReport = async (reportId, status, action, adminNotes) => {
    try {
      const response = await fetch(`${API_URL}/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, action, adminNotes })
      });

      if (response.ok) {
        toast.success('Report updated successfully');
        fetchReports();
      } else {
        toast.error('Failed to update report');
      }
    } catch (error) {
      console.error('Failed to update report:', error);
      toast.error('Error updating report');
    }
  };

  // Block/unblock user
  const toggleUserBlock = async (userId, blocked, reason = '') => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ blocked, blockedReason: reason })
      });

      if (response.ok) {
        toast.success(`User ${blocked ? 'blocked' : 'unblocked'} successfully`);
        fetchUsers();
      } else {
        toast.error('Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Error updating user');
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'stats') {
      fetchStats();
    } else if (isAuthenticated && activeTab === 'reports') {
      fetchReports('pending');
    } else if (isAuthenticated && activeTab === 'users') {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab]);

  // Login form
  if (!isAuthenticated) {
    return (
      <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
        <h2>🔒 Admin Login</h2>
        <div style={{ marginTop: '2rem' }}>
          <input
            type="password"
            placeholder="Enter admin key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '1rem'
            }}
          />
          <button
            onClick={checkAuth}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>🛡️ Admin Dashboard</h2>
        <button
          onClick={() => {
            setIsAuthenticated(false);
            localStorage.removeItem('adminKey');
            setAdminKey('');
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #ddd' }}>
        {['stats', 'reports', 'users'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === tab ? '#007bff' : 'transparent',
              color: activeTab === tab ? 'white' : '#007bff',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #007bff' : 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner />}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard title="Total Users" value={stats.totalUsers} />
          <StatCard title="Blocked Users" value={stats.blockedUsers} color="#dc3545" />
          <StatCard title="Pending Reports" value={stats.pendingReports} color="#ffc107" />
          <StatCard title="Total Reports" value={stats.totalReports} />
          <StatCard title="Avg Trust Score" value={stats.averageTrustScore.toFixed(1)} color="#28a745" />
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && !loading && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={() => fetchReports('')} style={filterButtonStyle}>All</button>
            <button onClick={() => fetchReports('pending')} style={filterButtonStyle}>Pending</button>
            <button onClick={() => fetchReports('reviewed')} style={filterButtonStyle}>Reviewed</button>
            <button onClick={() => fetchReports('dismissed')} style={filterButtonStyle}>Dismissed</button>
          </div>
          {reports.length === 0 ? (
            <p>No reports found</p>
          ) : (
            reports.map((report) => (
              <ReportCard
                key={report._id}
                report={report}
                onUpdate={updateReport}
              />
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && !loading && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={() => fetchUsers()} style={filterButtonStyle}>All Users</button>
            <button onClick={() => fetchUsers({ blocked: 'true' })} style={filterButtonStyle}>Blocked</button>
            <button onClick={() => fetchUsers({ maxTrustScore: 50 })} style={filterButtonStyle}>Low Trust</button>
          </div>
          {users.length === 0 ? (
            <p>No users found</p>
          ) : (
            users.map((user) => (
              <UserCard
                key={user.userId}
                user={user}
                onToggleBlock={toggleUserBlock}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, color = '#007bff' }) => (
  <div style={{
    padding: '1.5rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: `4px solid ${color}`
  }}>
    <h4 style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>{title}</h4>
    <p style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 'bold', color }}>{value}</p>
  </div>
);

// Report Card Component
const ReportCard = ({ report, onUpdate }) => {
  const [notes, setNotes] = useState(report.adminNotes || '');

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '1rem',
      marginBottom: '1rem',
      borderRadius: '8px',
      borderLeft: report.status === 'pending' ? '4px solid #ffc107' : '4px solid #ddd'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <strong>Reported User: {report.reportedUserId}</strong>
        <span style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: getStatusColor(report.status),
          color: 'white',
          borderRadius: '4px',
          fontSize: '0.75rem'
        }}>
          {report.status}
        </span>
      </div>
      <p><strong>Reporter:</strong> {report.reporterId}</p>
      <p><strong>Reason:</strong> {report.reason}</p>
      <p><strong>Message:</strong> "{report.messageContent}" (Plate: {report.messagePlate})</p>
      <p style={{ fontSize: '0.75rem', color: '#666' }}>
        {new Date(report.createdAt).toLocaleString()}
      </p>

      {report.status === 'pending' && (
        <div style={{ marginTop: '1rem' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Admin notes..."
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onUpdate(report._id, 'action_taken', 'block', notes)}
              style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}
            >
              Block User
            </button>
            <button
              onClick={() => onUpdate(report._id, 'action_taken', 'adjust_trust', notes)}
              style={{ ...actionButtonStyle, backgroundColor: '#ffc107' }}
            >
              Reduce Trust
            </button>
            <button
              onClick={() => onUpdate(report._id, 'dismissed', null, notes)}
              style={{ ...actionButtonStyle, backgroundColor: '#6c757d' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// User Card Component
const UserCard = ({ user, onToggleBlock }) => {
  const [blockReason, setBlockReason] = useState('');

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '1rem',
      marginBottom: '1rem',
      borderRadius: '8px',
      borderLeft: user.blocked ? '4px solid #dc3545' : '4px solid #28a745'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <strong>{user.userId}</strong>
          {user.nickname && <span> ({user.nickname})</span>}
          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
            Trust Score: <strong style={{ color: getTrustScoreColor(user.trustScore) }}>
              {user.trustScore}
            </strong>
          </p>
          {user.email && <p style={{ margin: 0, fontSize: '0.875rem' }}>Email: {user.email}</p>}
          {user.blocked && (
            <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#dc3545' }}>
              <strong>Blocked:</strong> {user.blockedReason}
            </p>
          )}
        </div>
        <div>
          {user.blocked ? (
            <button
              onClick={() => onToggleBlock(user.userId, false)}
              style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}
            >
              Unblock
            </button>
          ) : (
            <>
              <input
                type="text"
                placeholder="Reason for blocking"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                style={{
                  padding: '0.5rem',
                  marginRight: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
              <button
                onClick={() => {
                  if (blockReason) {
                    onToggleBlock(user.userId, true, blockReason);
                    setBlockReason('');
                  } else {
                    alert('Please provide a reason');
                  }
                }}
                style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}
              >
                Block
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return '#ffc107';
    case 'reviewed': return '#007bff';
    case 'dismissed': return '#6c757d';
    case 'action_taken': return '#dc3545';
    default: return '#6c757d';
  }
};

const getTrustScoreColor = (score) => {
  if (score >= 80) return '#28a745';
  if (score >= 50) return '#ffc107';
  return '#dc3545';
};

const filterButtonStyle = {
  padding: '0.5rem 1rem',
  marginRight: '0.5rem',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.875rem'
};

const actionButtonStyle = {
  padding: '0.5rem 1rem',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.875rem'
};

export default AdminDashboard;
