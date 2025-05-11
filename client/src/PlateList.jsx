import React, { useState, useEffect } from 'react';

const normalizePlate = (plate) => plate.trim().toUpperCase();

const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleString();
};

const PlateList = ({ plates, messages }) => {
  const [reportedSenders, setReportedSenders] = useState([]);
  const userId = localStorage.getItem('userId') || 'guest';

  useEffect(() => {
    const stored = localStorage.getItem('reportedSenders');
    if (stored) {
      setReportedSenders(JSON.parse(stored));
    } else {
      localStorage.setItem('reportedSenders', JSON.stringify([]));
      setReportedSenders([]);
    }
  }, []);

  const handleReport = (senderId) => {
    if (!senderId || reportedSenders.includes(senderId)) return;

    const currentTrust = parseInt(localStorage.getItem('trustScore') || '0', 10);
    localStorage.setItem('trustScore', Math.max(currentTrust - 2, 0));

    const updated = [...reportedSenders, senderId];
    setReportedSenders(updated);
    localStorage.setItem('reportedSenders', JSON.stringify(updated));
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>📥 Inbox</h2>
      {plates.length === 0 ? (
        <p style={{ color: '#777' }}>No messages received yet.</p>
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
                  {relatedMessages.map((m) => (
                    <li
                      key={m._id}
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '0.5rem',
                        fontSize: '0.95rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>
                          {m.senderId === userId ? 'You' : `From ${m.senderId}`}
                        </div>
                        <div>{m.message}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                          {formatDate(m.createdAt)}
                        </div>
                      </div>

                      {m.senderId !== userId && (
                        reportedSenders.includes(m.senderId) ? (
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
                            onClick={() => handleReport(m.senderId)}
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
                  ))}
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
