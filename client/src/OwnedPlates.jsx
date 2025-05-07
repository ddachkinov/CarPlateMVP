
import React from 'react';

const OwnedPlates = ({ plates }) => {
  if (!plates.length) return null;

  return (
    <div style={{ padding: '1rem', marginTop: '1rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
      <h3>📋 Your Registered Plates</h3>
      <ul>
        {plates.map((plate, index) => (
          <li key={index} style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{plate.plate}</li>
        ))}
      </ul>
    </div>
  );
};

export default OwnedPlates;
