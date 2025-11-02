import React, { useState, useEffect } from 'react';
import { reportMessage } from './api/plates';
import { toast } from 'react-toastify';

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const diff = (Date.now() - date.getTime()) / 1000; // in seconds

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  return date.toLocaleDateString();
};

const normalizePlate = (plate) => plate.trim().toUpperCase();

const PlateList = ({ plates, messages }) => {
  const [reportedMessages, setReportedMessages] = useState(new Set());
  const userId = localStorage.getItem('userId') || 'guest';

  useEffect(() => {
    // Load reported messages from localStorage
    const stored = localStorage.getItem('reportedMessages');
    if (stored) {
      setReportedMessages(new Set(JSON.parse(stored)));
    }
  }, []);

  const handleReport = async (messageId, senderId, reason = 'Inappropriate content') => {
    if (!messageId || reportedMessages.has(messageId)) return;

    try {
      const response = await reportMessage({
        messageId,
        reporterId: userId,
        reason
      });

      // Update local state
      const updated = new Set(reportedMessages);
      updated.add(messageId);
      setReportedMessages(updated);
      localStorage.setItem('reportedMessages', JSON.stringify([...updated]));

      // Show success toast
      if (response.data.userBlocked) {
        toast.success('Report submitted. User has been automatically blocked.');
      } else {
        toast.success('Report submitted successfully. Thank you for keeping our community safe.');
      }
    } catch (error) {
      console.error('Failed to report message:', error);

      if (error.response?.status === 400) {
        toast.error(error.response.data.error || 'Unable to submit report');
      } else {
        toast.error('Failed to submit report. Please try again.');
      }
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>📥 Inbox</h2>
      {plates.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginTop: '2rem'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📬</div>
          <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No messages yet</h3>
          <p style={{ color: '#999', fontSize: '14px' }}>
            Messages sent to your claimed plates will appear here
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {plates.map((p) => {
            const currentPlate = normalizePlate(p.plate);
            const relatedMessages = messages.filter(
              (m) => normalizePlate(m.plate) === currentPlate
            );

            return (
              <li key={currentPlate} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#007bff', marginBottom: '0.5rem' }}>
                  {currentPlate}
                </h3>
                <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {relatedMessages.map((m) => {
  const isNew = (Date.now() - new Date(m.createdAt).getTime()) < 5 * 60 * 1000;
  const wasUnread = m.isRead === false;

  return (
    <li
      key={m._id}
      style={{
        backgroundColor: isNew || wasUnread ? '#e6f7ff' : '#f5f5f5',
        fontWeight: isNew || wasUnread ? 'bold' : 'normal',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '0.5rem',
        fontSize: '0.95rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeft: wasUnread ? '4px solid #1890ff' : 'none'
      }}
    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>
                          {m.senderId === userId ? 'You' : `From ${m.senderId}`}
                        </div>
                        <div>{m.message}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
  {formatRelativeTime(m.createdAt)}
</div>
                      </div>

                      {m.senderId !== userId && (
                        reportedMessages.has(m._id) ? (
                          <button
                            disabled
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ffcccc',
                              border: '1px solid red',
                              color: 'red',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              opacity: 0.7,
                              cursor: 'not-allowed'
                            }}
                          >
                            Reported
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReport(m._id, m.senderId)}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid red',
                              color: 'red',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              backgroundColor: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            Report
                          </button>
                        )
                      )}
                    </li> 
                    );
                })}
                </ul> 
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PlateList;
