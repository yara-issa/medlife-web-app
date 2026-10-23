document.addEventListener('DOMContentLoaded', async () => {
    const hospitalSelect = document.getElementById('hospitalSelect');
    const roleSelect = document.getElementById('roleSelect');
    const receptionistDoctorField = document.getElementById('receptionistDoctorField');
    const specialtyGroup = document.getElementById('specialtyGroup');
    const licenseGroup = document.getElementById('licenseGroup');

    // --- 1. INITIALIZE PAGE: Load Hospitals ---
    try {
        const { data: hospitals, error } = await window.db
            .from('facilities')
            .select('id, facility_name')
            .order('facility_name', { ascending: true });

        if (error) throw error;

        hospitals.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.id;
            opt.textContent = h.facility_name;
            hospitalSelect.appendChild(opt); // Simplified append
        });
    } catch (err) {
        console.error("Error loading hospitals:", err.message);
    }

    // --- 2. UI LOGIC: Role and Field Toggling ---
    roleSelect?.addEventListener('change', function() {
        const role = this.value;
        const specialtySelect = document.getElementById('specialtySelect');
        const licenseInput = document.getElementById('licenseInput');

        // Reset visibilities
        specialtyGroup.style.display = 'none';
        licenseGroup.style.display = 'none';
        receptionistDoctorField.style.display = 'none';

        if (role === 'doctor') {
            specialtyGroup.style.display = 'block';
            licenseGroup.style.display = 'block';
            specialtySelect?.setAttribute('required', '');
            licenseInput?.setAttribute('required', '');
        } else if (role === 'receptionist') {
            receptionistDoctorField.style.display = 'block';
            specialtySelect?.removeAttribute('required');
            licenseInput?.removeAttribute('required');
        } else {
            specialtySelect?.removeAttribute('required');
            licenseInput?.removeAttribute('required');
        }
    });

    // Load Doctors when a Hospital is selected (for Receptionist use)
    hospitalSelect.addEventListener('change', async function() {
        const hospitalId = this.value;
        const doctorSelect = document.getElementById('doctorSelect');
        const role = roleSelect?.value;

        if (hospitalId && role === 'receptionist') {
            try {
                doctorSelect.innerHTML = '<option value="" disabled selected>Loading Doctors...</option>';
                
                // Fetch doctors belonging to this facility
                const { data: doctors, error } = await window.db
                    .from('profiles')
                    .select(`id, full_name, doctors!inner(facility_id)`)
                    .eq('doctors.facility_id', hospitalId)
                    .eq('role', 'doctor');

                if (error) throw error;

                doctorSelect.innerHTML = '<option value="" disabled selected>Select Doctor</option>';
                doctors.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = d.full_name;
                    doctorSelect.appendChild(opt);
                });
            } catch (err) {
                console.error("Error loading doctors:", err.message);
                doctorSelect.innerHTML = '<option value="" disabled>Error loading doctors</option>';
            }
        }
    });

    // --- 3. SUBMISSION LOGIC ---
    document.getElementById('proSignupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const db = window.db;

        try {
            const role = roleSelect.value;
            const firstName = e.target.querySelector('input[placeholder="Dr. Name"]').value;
            const familyName = e.target.querySelector('input[placeholder="Family"]').value;
            const phone = e.target.querySelector('input[type="tel"]').value;
            const selectedHospitalId = hospitalSelect.value;

            // Generate MedLife ID
            const { data: medId, error: idError } = await db.rpc('generate_medlife_id');
            if (idError) throw idError;

            // Create the Base Profile
            const { data: profile, error: pError } = await db
                .from('profiles')
                .insert({
                    id: crypto.randomUUID(),
                    full_name: role === 'doctor' ? `Dr. ${firstName} ${familyName}` : `${firstName} ${familyName}`,
                    role: role,
                    medlife_id: medId
                })
                .select()
                .single();

            if (pError) throw pError;

            // Role-Specific Logic
            if (role === 'doctor') {
                const { error: dError } = await db.from('doctors').insert({
                    id: profile.id,
                    specialty: document.getElementById('specialtySelect').value,
                    license_id: document.getElementById('licenseInput').value,
                    phone: phone,
                    status: 'pending',
                    facility_id: selectedHospitalId
                });
                if (dError) throw dError;

            } else if (role === 'receptionist') {
                const docId = document.getElementById('doctorSelect').value;
                if (!docId) throw new Error("Please select a doctor to manage.");

                const { error: rError } = await db.from('receptionists').insert({
                    id: profile.id,
                    doctor_id: docId,
                    facility_id: selectedHospitalId,
                    phone: phone,
                    status: 'pending'
                });
                if (rError) throw rError;

            } else if (role === 'lab_tech') {
                const { error: ltError } = await db.from('lab_technicians').insert({
                    id: profile.id,
                    facility_id: selectedHospitalId,
                    phone: phone,
                    status: 'pending'
                });
                if (ltError) throw ltError;
            }

            alert(`Request Sent Successfully!\n\nYour MedLife ID is: ${medId}\n\nPlease wait for administrator approval.`);
            window.location.href = "login.html";

        } catch (err) {
            console.error("Signup Error:", err);
            alert("Registration failed: " + (err.message || "Unknown error"));
        }
    });
});