import React, { useEffect, useState } from 'react';
import { getPlates, createPlate } from './api/plates';

function App() {
  const [plates, setPlates] = useState([]);
  const [plate, setPlate] = useState('');
  const [message, setMessage] = useState('');

  const loadPlates = async () => {
    const res = await getPlates();
    setPlates(res.data);
  };

  useEffect(() => {
    loadPlates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createPlate({ plate, message });
    setPlate('');
    setMessage('');
    loadPlates();
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Plate" />
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" />
        <button type="submit">Send</button>
      </form>

      <ul>
        {plates.map((p) => (
          <li key={p._id}>
            <strong>{p.plate}:</strong> {p.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
