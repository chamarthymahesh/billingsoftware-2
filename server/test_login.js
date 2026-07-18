import axios from 'axios';

const testLogin = async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/users/login', {
      email: 'admin@billbook.com',
      password: 'password123'
    });
    console.log('Login success:', res.data);
  } catch (err) {
    console.error('Login failed:', err.response ? err.response.data : err.message);
  }
}
testLogin();
