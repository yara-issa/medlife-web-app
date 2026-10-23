// Globals
let profileUserId = ''; 
let doctorTableId = ''; 

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Priority: Check if an Admin or Guest is viewing a specific doctor
    const viewingId = localStorage.getItem('viewing_doctor_id');
    const loggedInId = localStorage.getItem('user_id');
    
    // If viewingId exists, we use that. Otherwise, we use the logged-in ID.
    profileUserId = viewingId || loggedInId;

    // 2. SECURITY CHECK
    // Only redirect to login if BOTH IDs are missing
    if (!profileUserId || !window.db) {
        window.location.href = 'login.html';
        return;
    }

    await loadDoctorDashboard();
    
    // ... rest of your navigation and event listener code ...

    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    const switchSection = (targetId) => {
        navItems.forEach(nav => nav.classList.remove('active'));
        const activeNav = Array.from(navItems).find(n => n.getAttribute('data-target') === targetId);
        if (activeNav) activeNav.classList.add('active');
        sections.forEach(sec => {
            sec.classList.remove('active');
            if (sec.id === targetId) sec.classList.add('active');
        });
    };

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            if (targetId) switchSection(targetId);
        });
    });

    document.querySelector('.view-all')?.addEventListener('click', () => switchSection('patients-section'));
});

async function loadDoctorDashboard() {
    const recentList = document.getElementById('recent-patients-list');
    const directoryList = document.getElementById('full-patient-table');
    const apptSelect = document.getElementById('apptPatientSelect');
    
    recentList.innerHTML = '<tr><td colspan="3">Loading...</td></tr>'; 
    directoryList.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    if(apptSelect) apptSelect.innerHTML = '<option value="">-- Choose Patient --</option>';

    try {
        const { data: docData, error: docError } = await window.db
            .from('profiles')
            .select(`full_name, doctors (id, specialty, license_id, hospital_name, experience_years, status)`)
            .eq('id', profileUserId)
            .single();

        if (docError || !docData.doctors) {
            console.error("Doctor profile not found.");
            return;
        }

        const details = docData.doctors;
        doctorTableId = details.id; 

        // Update UI Elements
        if(document.getElementById('current-page-name')) document.getElementById('current-page-name').textContent = docData.full_name;
        if(document.getElementById('doctor-name-span')) document.getElementById('doctor-name-span').textContent = docData.full_name;
        if(document.getElementById('specialty-tag-span')) document.getElementById('specialty-tag-span').textContent = details.specialty;
        if(document.getElementById('degree-text')) document.getElementById('degree-text').textContent = `MD - ${details.specialty}`;
        
        const profileImg = document.getElementById('doctor-profile-img');
        if(profileImg) profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(docData.full_name)}&background=e6f4f1&color=008b8b`;

        const stats = document.querySelectorAll('.stat-card p');
        if(stats[1]) stats[1].innerHTML = `${details.experience_years || '0'} <span>yrs</span>`;
        
        if(document.getElementById('cred-name')) document.getElementById('cred-name').textContent = docData.full_name;
        if(document.getElementById('cred-specialty')) document.getElementById('cred-specialty').textContent = details.specialty;
        if(document.getElementById('cred-hospital')) document.getElementById('cred-hospital').textContent = details.hospital_name || "N/A";
        if(document.getElementById('cred-license')) document.getElementById('cred-license').textContent = details.license_id || "N/A";

        const isVerified = details.status === 'active';
        const licenseEl = document.getElementById('license-status');
        if(licenseEl) {
            licenseEl.textContent = isVerified ? "✓ Verified" : "🕒 Pending";
            licenseEl.style.color = isVerified ? "#28a745" : "orange";
        }

        const { data: appointments, error: apptError } = await window.db
            .from('appointments')
            .select(`id, appointment_time, status, patient:profiles!patient_id (id, full_name, medlife_id)`)
            .eq('doctor_id', doctorTableId) 
            .order('appointment_time', { ascending: false, nullsFirst: false });

        if (apptError) throw apptError;

        recentList.innerHTML = ''; 
        directoryList.innerHTML = '';

        if (appointments && appointments.length > 0) {
            const uniquePatientIds = new Set();
            const displayedInDirectory = new Set();
            
            appointments.forEach(a => uniquePatientIds.add(a.patient.id));
            const uniqueCount = uniquePatientIds.size;
            if(document.getElementById('stat-total-patients')) document.getElementById('stat-total-patients').textContent = uniqueCount;
            
            const totalPatientsText = document.querySelector('.text-muted');
            if(totalPatientsText) totalPatientsText.textContent = `${uniqueCount} Total Patients`;

            const actualAppointments = appointments.filter(a => a.appointment_time !== null && a.status !== 'Added to Directory');
            
            if (actualAppointments.length > 0) {
                actualAppointments.slice(0, 3).forEach(appt => {
                    const p = appt.patient;
                    const dateObj = new Date(appt.appointment_time);
                    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    recentList.innerHTML += `<tr><td>${p.full_name}</td><td>${timeStr}</td><td><span class="status-normal">${appt.status}</span></td></tr>`;
                });
            } else {
                recentList.innerHTML = '<tr><td colspan="3">No upcoming appointments</td></tr>';
            }

            const dropdownIds = new Set();
            appointments.forEach((appt) => {
                const p = appt.patient;
                
                if(!displayedInDirectory.has(p.id)) {
                    const lastVisitAppt = appointments.find(a => a.patient.id === p.id && a.appointment_time !== null);
                    const dateStr = lastVisitAppt 
                        ? new Date(lastVisitAppt.appointment_time).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
                        : "No visits yet";

                    directoryList.innerHTML += `
                        <tr>
                            <td>${p.full_name}</td>
                            <td>#${p.medlife_id}</td>
                            <td>${dateStr}</td>
                            <td><button class="btn-add" onclick="openFile('${p.medlife_id}')">Open</button></td>
                        </tr>`;
                    displayedInDirectory.add(p.id);
                }
                
                if(!dropdownIds.has(p.id) && apptSelect) {
                    apptSelect.innerHTML += `<option value="${p.id}">${p.full_name} (#${p.medlife_id})</option>`;
                    dropdownIds.add(p.id);
                }
            });
        } else {
            if(document.getElementById('stat-total-patients')) document.getElementById('stat-total-patients').textContent = "0";
            recentList.innerHTML = '<tr><td colspan="3">No appointments found</td></tr>';
            directoryList.innerHTML = '<tr><td colspan="4">No patients found</td></tr>';
        }
    } catch (err) { 
        console.error("Load Error:", err);
    }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function addNewPatient() {
    const medIdInput = document.getElementById('newPatientMedID');
    const medId = medIdInput.value.replace('#', '').trim();
    if(!medId) return alert("Enter a MedLife ID");

    try {
        const { data: patient, error: pError } = await window.db
            .from('profiles')
            .select('id')
            .eq('medlife_id', medId)
            .single();

        if(pError || !patient) return alert("Patient ID not found in system.");

        const { data: existing, error: checkError } = await window.db
            .from('appointments')
            .select('id')
            .eq('doctor_id', doctorTableId)
            .eq('patient_id', patient.id)
            .limit(1);

        if (existing && existing.length > 0) {
            return alert("This patient is already in your directory.");
        }

        const { error: insError } = await window.db.from('appointments').insert([{
            doctor_id: doctorTableId,
            patient_id: patient.id,
            status: 'Added to Directory', 
            appointment_time: null
        }]);

        if(insError) throw insError;
        
        alert("Patient added to your directory!");
        medIdInput.value = "";
        closeModal('addPatientModal');
        await loadDoctorDashboard(); 
    } catch (err) { 
        console.error(err);
        alert("Error linking patient."); 
    }
}

async function scheduleAppointment() {
    const patientId = document.getElementById('apptPatientSelect').value;
    const timeInput = document.getElementById('apptDateTime').value;

    if(!patientId || !timeInput) return alert("Please fill all fields");

    try {
        const isoTime = new Date(timeInput).toISOString();

        const { error } = await window.db.from('appointments').insert([{
            doctor_id: doctorTableId,
            patient_id: patientId,
            appointment_time: isoTime,
            status: 'Scheduled'
        }]);

        if(error) throw error;
        alert("Appointment Scheduled!");
        closeModal('addApptModal');
        await loadDoctorDashboard();
    } catch (err) { alert("Error scheduling appointment"); }
}

function openFile(medId) {
    if (!medId) return;
    // Store only the patient we are viewing
    localStorage.setItem('viewing_patient_id', medId.replace('#', ''));
    window.location.href = 'patient-profile.html';
}