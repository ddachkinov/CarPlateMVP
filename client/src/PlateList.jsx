import React, { useState, useEffect } from 'react';

const normalizePlate = (plate) => plate.trim().toUpperCase();

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
    <ul>
      {plates.map((p) => {
        const currentPlate = normalizePlate(p.plate);
        const relatedMessages = messages.filter(
          (m) => normalizePlate(m.plate) === currentPlate
        );

        return (
          <li key={p._id}>
            <strong>{currentPlate}:</strong>
            <ul>
              {relatedMessages.map((m) => (
                <li
                  key={m._id}
                  style={{
                    fontSize: '0.9rem',
                    color: '#555',
                    marginBottom: '0.5rem',
                  }}
                >
                  {m.message}{' '}
                  {m.senderId === userId ? null : (
                    reportedSenders.includes(m.senderId) ? (
                      <button
                        disabled
                        style={{
                          marginLeft: '1rem',
                          padding: '2px 8px',
                          backgroundColor: '#ffcccc',
                          border: '1px solid red',
                          color: 'red',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          cursor: 'not-allowed',
                          opacity: 0.8,
                        }}
                      >
                        Reported
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReport(m.senderId)}
                        style={{
                          marginLeft: '1rem',
                          padding: '2px 8px',
                          background: 'transparent',
                          border: '1px solid red',
                          color: 'red',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
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
  );
};

export default PlateList;
