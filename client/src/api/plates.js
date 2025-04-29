import axios from 'axios';

// Local for development
const API = axios.create({ baseURL: 'http://localhost:5001/api' });

// Remote for deployment (uncomment when pushing)
// const API = axios.create({ baseURL: 'https://carplatemvp.onrender.com/api' });

export const getPlates = () => API.get('/plates');
export const claimPlate = (data) => API.post('/plates/claim', data); // <-- this!
export const sendMessage = (data) => API.post('/message', data);
export const getMessages = () => API.get('/plates/messages');
export const registerPlate = (data) => API.post('/register', data);
