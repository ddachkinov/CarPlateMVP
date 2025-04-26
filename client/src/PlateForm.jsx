import React from 'react';

function PlateForm({ plate, setPlate, message, setMessage, handleSubmit, loading }) {
    // now you can use `loading` inside PlateForm
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={plate}
        onChange={(e) => setPlate(e.target.value)}
        placeholder="Plate"
      />
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message"
      />
      <button type="submit" disabled={loading}>
  {loading ? 'Sending...' : 'Send'}
</button>

    </form>
  );
}

export default PlateForm;
