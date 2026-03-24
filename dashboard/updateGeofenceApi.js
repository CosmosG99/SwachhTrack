

async function update() {
  const BASE_URL = 'https://swachhtrack-4gnt.onrender.com/api/v1';

  try {
    // 1. Login to get token
    console.log('Logging in as Admin...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: 'ADMIN001', password: 'admin123' })
    });
    
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginData));
    
    const token = loginData.token;
    console.log('Login successful.');

    // 2. Fetch all geofences
    const getRes = await fetch(`${BASE_URL}/geofences`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { geofences } = await getRes.json();
    console.log('Found geofences:', geofences.length);
    
    if (geofences.length === 0) {
        console.log('No geofences found to update. Creating one...');
        // Create one if it doesn't exist
        const createRes = await fetch(`${BASE_URL}/geofences`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Yashwantrao College of Engineering, Sawantwadi',
            latitude: 15.894238,
            longitude: 73.818228,
            radius_meters: 50000,
            ward_id: 1,
            is_active: true
          })
        });
        const createData = await createRes.json();
        console.log('Geofence created:', createData);
    } else {
        // Update the first one
        const gfId = geofences[0].id;
        console.log(`Updating geofence ID: ${gfId}...`);
        
        const updateRes = await fetch(`${BASE_URL}/geofences/${gfId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Yashwantrao College of Engineering, Sawantwadi',
            latitude: 15.894238,
            longitude: 73.818228,
            radius_meters: 50000,
            ward_id: 1,
            is_active: true
          })
        });
        const updateData = await updateRes.json();
        console.log('Geofence updated:', updateData);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

update();
