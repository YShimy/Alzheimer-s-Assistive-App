import { apiClient } from '../mobile/src/infrastructure/api/client.js';
// We'll write a standalone node fetch script since the apiClient depends on React Native (sessionStore).

async function testPatientAPI() {
  const email = 'demo.patient01@example.com';
  const password = 'password123';
  const baseUrl = 'http://localhost:4000/api';

  console.log(`Logging in as ${email}...`);
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes.ok) {
    console.error('Login failed', await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Login successful! Got token.');

  // Test getting items
  console.log('\nFetching SR items...');
  const itemsRes = await fetch(`${baseUrl}/patients/me/spaced-retrieval/items?activeOnly=true`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!itemsRes.ok) {
    console.error('Failed to get items:', itemsRes.status, await itemsRes.text());
  } else {
    const itemsData = await itemsRes.json();
    console.log(`Success! Got ${itemsData.items?.length || 0} items.`);
    console.log(JSON.stringify(itemsData.items?.map((i: any) => i.prompt).slice(0, 5), null, 2));
  }

  // Test getting settings
  console.log('\nFetching SR settings...');
  const settingsRes = await fetch(`${baseUrl}/patients/me/spaced-retrieval/settings`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!settingsRes.ok) {
    console.error('Failed to get settings:', settingsRes.status, await settingsRes.text());
  } else {
    const settingsData = await settingsRes.json();
    console.log('Success! Settings:');
    console.log(JSON.stringify(settingsData, null, 2));
  }
}

testPatientAPI().catch(console.error);
