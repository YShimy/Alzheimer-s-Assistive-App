import fs from 'fs';

async function testPdfExport() {
  try {
    // 1. Sign in
    console.log('Signing in...');
    const signinRes = await fetch('https://alzheimer-s-assistive-app.vercel.app/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo.caregiver1@example.com', password: 'DemoPass123!' })
    });
    const signinData = await signinRes.json();
    if (!signinData.accessToken) {
      console.error('Signin failed:', signinData);
      return;
    }
    const token = signinData.accessToken;
    console.log('Signed in successfully.');

    // 2. Get patient ID
    const userRes = await fetch('https://alzheimer-s-assistive-app.vercel.app/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userData = await userRes.json();
    const patientId = userData.user?.caregiverProfile?.careLinks?.[0]?.patientId;
    
    if (!patientId) {
      console.error('No patient ID found:', JSON.stringify(userData, null, 2));
      return;
    }
    console.log('Found patient ID:', patientId);

    // 3. Generate PDF
    console.log('Generating PDF...');
    const exportRes = await fetch(`https://alzheimer-s-assistive-app.vercel.app/api/patients/${patientId}/summary-exports`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rangePreset: 'LAST_30_DAYS',
        language: 'ar'
      })
    });
    
    const exportData = await exportRes.json();
    console.log('Export response status:', exportRes.status);
    console.log('Export response data:', JSON.stringify(exportData, null, 2));

  } catch (err) {
    console.error('Error:', err);
  }
}

testPdfExport();
