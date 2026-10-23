document.getElementById('patientSignupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Submit button clicked...");

    try {
        // 1. Collect Data
        const firstName = e.target.querySelector('input[placeholder="Name"]').value;
        const familyName = e.target.querySelector('input[placeholder="Family"]').value;
        const phone = document.getElementById('whatsappNumber').value;
        const weight = document.getElementById('patientWeight').value;
        const height = document.getElementById('patientHeight').value;
        const bloodType = document.getElementById('bloodTypeSelect').value;
        
        // IMPORTANT: Capture Email for EmailJS verification
        // Make sure your HTML has <input type="email" id="patientEmail" required>
        const email = document.getElementById('patientEmail')?.value || "";

        const birthday = document.querySelector('input[type="date"]')?.value || null;
        const gender = document.querySelector('select[name="gender"]')?.value || 'Not Specified';

        // 2. Generate ID
        console.log("Generating MedLife ID...");
        const { data: medId, error: idError } = await window.db.rpc('generate_medlife_id');
        
        if (idError) throw idError;

        // 3. Create the Base Profile
        console.log("Creating Profile...");
        const { data: profile, error: pError } = await window.db
            .from('profiles')
            .insert({
                id: crypto.randomUUID(), 
                full_name: `${firstName} ${familyName}`,
                role: 'patient',
                medlife_id: medId
            })
            .select()
            .single();

        if (pError) throw pError;

        // 4. Create Patient Details
        console.log("Creating Patient Details...");
        const { error: dError } = await window.db
            .from('patients')
            .insert({
                id: profile.id, 
                father_name: firstName, 
                family_name: familyName,
                birthday: birthday,
                gender: gender,
                blood_type: bloodType,
                weight: parseFloat(weight) || 0,
                height: parseFloat(height) || 0,
                phone: phone
            });

        if (dError) throw dError;

        // 5. PREPARE FOR VERIFICATION
        // Store email and name so verify.js can send the EmailJS code
        localStorage.setItem('temp_user_email', email);
        localStorage.setItem('temp_user_name', firstName);
        localStorage.setItem('temp_medlife_id', medId); // Save ID to show after verification

        // 6. Redirect to Verification Page instead of Login
        alert(`Information saved! Please verify your email to receive your MedLife ID.`);
        window.location.href = "patient-verify.html";

    } catch (err) {
        console.error("Signup Error:", err);
        alert("Signup failed: " + (err.message || "Unknown error"));
    }
});