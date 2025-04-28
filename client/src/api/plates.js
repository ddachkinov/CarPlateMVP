import axios from 'axios';

// Local for development
const API = axios.create({ baseURL: 'http://localhost:5001/api' });

// Remote for deployment (uncomment when pushing)
// const API = axios.create({ baseURL: 'https://carplatemvp.onrender.com/api' });

export const getPlates = () => API.get('/plates');
export const createPlate = (data) => API.post('/plates', data);
export const sendMessage = (data) => API.post('/plates/send', data);

