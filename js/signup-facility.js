// js/signup-facility.js

document.getElementById('facilitySignupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const db = window.db;

    // 1. Data Collection
    const facilityName = document.getElementById('facilityName').value.trim();
    const facilityData = {
        facility_name: facilityName,
        facility_type: document.getElementById('facilityType').value,
        location: document.getElementById('facilityLocation').value,
        phone_number: document.getElementById('facilityPhone').value,
        owner_first_name: document.getElementById('ownerFirst').value,
        owner_last_name: document.getElementById('ownerLast').value
    };

    try {
        // --- 2. UNIQUE NAME CHECK ---
        // Check if the hospital name already exists (Case-Insensitive)
        const { data: existing, error: checkError } = await db
            .from('facilities')
            .select('facility_name')
            .ilike('facility_name', facilityName)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
            alert(`The facility name "${facilityName}" is already registered. Please use a different name or contact support.`);
            return; // Stop the registration process
        }

        // --- 3. REGISTRATION ---
        const { data, error } = await db
            .from('facilities') 
            .insert([facilityData])
            .select('facility_id') // Specifically select the new 6-digit ID
            .single();

        if (error) {
            // Check for a database-level unique constraint error if the frontend check missed it
            if (error.code === '23505') {
                throw new Error("This hospital name is already taken.");
            }
            throw error;
        }

        // 4. Success Response
        alert(`Facility Registered!\n\nYour Login ID is: ${data.facility_id}\nPlease save this ID for login.`);
        
        window.location.href = 'login.html'; 

    } catch (error) {
        console.error("Facility Signup Error:", error);
        alert('Registration failed: ' + error.message);
    }
});