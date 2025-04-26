import axios from 'axios';

// const API = axios.create({ baseURL: 'http://localhost:5001/api' });
const API = axios.create({ baseURL: 'https://carplatemvp.onrender.com/api' });


export const getPlates = () => API.get('/plates');
export const createPlate = (data) => API.post('/plates', data);
