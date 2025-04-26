import React from 'react';

function PlateList({ plates }) {
  if (plates.length === 0) {
    return <p>No messages yet. Be the first to send one!</p>;
  }

  return (
    <ul>
      {plates.map((p) => (
        <li key={p._id}>
          <strong>{p.plate}:</strong> {p.message}
        </li>
      ))}
    </ul>
  );
}

export default PlateList;
