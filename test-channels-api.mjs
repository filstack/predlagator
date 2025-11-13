import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Read token from somewhere (you'll need to get this)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5NjExYzM4Ni04NDQzLTQwZjUtYjdlOS0zNDMxZTNlYTRhNDAiLCJpYXQiOjE3Mjk1NjQ1MjksImV4cCI6MTcyOTU2ODEyOX0.4zj9h6C3UQAcrPK8R8iZiBGhAhtgj92LALJKxeB3IFM'; //  replace with actual token

const formData = new FormData();
formData.append('file', fs.createReadStream('backend/test-import.jsonl'));

const response = await fetch('http://localhost:3000/api/channels/import', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    ...formData.getHeaders()
  },
  body: formData
});

const data = await response.json();
console.log('Response status:', response.status);
console.log('Response data:', JSON.stringify(data, null, 2));
