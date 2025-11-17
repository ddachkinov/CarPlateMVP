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
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    // Load reported messages from localStorage
    const stored = localStorage.getItem('reportedMessages');
    if (stored) {
      setReportedMessages(new Set(JSON.parse(stored)));
    }
  }, []);

  const handleReport = async (messageId, senderId, reason = 'Inappropriate content') => {
    if (!messageId || reportedMessages.has(messageId)) return;

    // Check if user is logged in (has registered userId)
    if (!userId) {
      toast.error('You must be a registered user to report messages. Please claim a plate first.');
      return;
    }

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
    <div>
      <h2 className="card-title mb-3">Your Messages</h2>
      {plates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✉</div>
          <h3 className="empty-state-title">No messages yet</h3>
          <p className="empty-state-description">
            Messages sent to your claimed plates will appear here
          </p>
        </div>
      ) : (
        <div>
          {plates.map((p) => {
            const currentPlate = normalizePlate(p.plate);
            const relatedMessages = messages.filter(
              (m) => normalizePlate(m.plate) === currentPlate
            );

            return (
              <div key={currentPlate} className="card">
                <h3 className="card-title" style={{ color: 'var(--color-primary)' }}>
                  {currentPlate}
                </h3>
                <ul className="message-list">
                  {relatedMessages.map((m) => {
                    const isNew = (Date.now() - new Date(m.createdAt).getTime()) < 5 * 60 * 1000;
                    const wasUnread = m.isRead === false;

                    return (
                      <li
                        key={m._id}
                        className={`message-item ${wasUnread || isNew ? 'unread' : ''}`}
                      >
                        <div className="message-content">
                          <div className="message-sender">
                            <span>{m.senderId === userId ? 'You' : `From ${m.senderId}`}</span>
                            {m.senderPremium && (
                              <span className="badge badge-premium">PREMIUM</span>
                            )}
                          </div>
                          <div className="message-text">{m.message}</div>
                          <div className="message-time">
                            {formatRelativeTime(m.createdAt)}
                          </div>
                        </div>

                        {m.senderId !== userId && (
                          <div className="message-actions">
                            {reportedMessages.has(m._id) ? (
                              <button
                                disabled
                                className="btn btn-sm btn-error"
                                style={{ opacity: 0.5 }}
                              >
                                Reported
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReport(m._id, m.senderId)}
                                className="btn btn-sm btn-error"
                              >
                                Report
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlateList;
