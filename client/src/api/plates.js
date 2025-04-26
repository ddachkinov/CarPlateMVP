import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5001/api' });

export const getPlates = () => API.get('/plates');
export const createPlate = (data) => API.post('/plates', data);
