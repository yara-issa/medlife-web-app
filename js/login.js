const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Login attempt started...");

    if (!window.db) {
        alert("Database connection not ready. Please wait a moment and try again.");
        return;
    }

    const enteredID = document.getElementById('patientID').value.trim();
    console.log("Checking ID:", enteredID);

    // CLEAN OLD SESSION DATA
    localStorage.clear(); 

    try {
        // 1. TRY PROFILES TABLE (Doctors, Patients, Receptionists, Lab Techs)
        const { data: profile, error: profileError } = await window.db
            .from('profiles')
            .select('id, role')
            .eq('medlife_id', enteredID)
            .single();

        if (profile) {
            console.log("Profile found! Role:", profile.role);
            
            localStorage.setItem('user_id', profile.id);
            localStorage.setItem('user_role', profile.role);

            // REDIRECTION LOGIC
            if (profile.role === 'doctor') {
                window.location.href = 'doctor-profile.html'; 
            } else if (profile.role === 'receptionist') {
                window.location.href = 'receptionist-dashboard.html'; 
            } else if (profile.role === 'lab_tech') {
                // ADDED: Explicit redirect for Lab Technicians
                window.location.href = 'lab-tech-profile.html'; 
            } else if (profile.role === 'patient') {
                window.location.href = 'patient-profile.html';
            } else {
                console.warn("Unknown role detected:", profile.role);
                alert("Role not recognized. Please contact support.");
            }
            return; 
        }

        // 2. TRY FACILITIES TABLE (Hospital Admins)
        const { data: facility, error: facilityError } = await window.db
            .from('facilities')
            .select('id, facility_id')
            .eq('facility_id', enteredID) 
            .single();

        if (facility) {
            console.log("Facility found!");
            localStorage.setItem('currentFacilityId', facility.id);
            localStorage.setItem('user_role', 'facility_admin');
            window.location.href = 'hospital-admin.html';
            return;
        }

        alert("Invalid ID. Please check and try again.");

    } catch (err) {
        console.error("Unexpected Login Error:", err);
        alert("An error occurred during login.");
    }
});