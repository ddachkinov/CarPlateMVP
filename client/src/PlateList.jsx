import React from 'react';

const PlateList = ({ plates, messages = [] }) => {
  if (plates.length === 0) {
    return <p>No plates yet. Be the first to send one!</p>;
  }

  return (
    <ul>
      {plates.map((p) => (
        <li key={p._id}>
          <strong>{p.plate}:</strong>
          <ul>
            {(messages || [])
              .filter((m) => m.plate.toLowerCase() === p.plate.toLowerCase())
              .map((m) => (
                <li key={m._id} style={{ fontSize: '0.9rem', color: '#555' }}>
                  {m.message}
                </li>
              ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};

export default PlateList;
