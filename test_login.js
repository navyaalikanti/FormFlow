// Simple test to check if login works
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

async function testLogin() {
  try {
    const response = await api.post('/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('Login successful:', response.data);
  } catch (error) {
    console.log('Login failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

testLogin();