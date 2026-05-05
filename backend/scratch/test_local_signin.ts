async function test() {
  try {
    const response = await fetch('http://localhost:4000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.caregiver1@example.com', password: 'DemoPass123!' })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Data:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
