let assignedDrId = '';
let selectedDay = '';
let selectedHour = '';

async function init() {
    const userId = localStorage.getItem('user_id');
    
    // 1. Fetch Receptionist details and the linked doctor's name
    const { data, error } = await window.db
        .from('receptionists')
        .select(`
            doctor_id,
            doctor_profile:doctor_id (full_name)
        `)
        .eq('id', userId)
        .single();

    if (data && data.doctor_profile) {
        assignedDrId = data.doctor_id;
        document.getElementById('managing-dr-text').textContent = `Schedule for Dr. ${data.doctor_profile.full_name}`;
        
        generateGrid();
        loadSchedule();
        loadPatients();
    } else {
        console.error("Could not load receptionist data");
    }
}

function generateGrid() {
    const grid = document.getElementById('weekly-grid');
    // Clear existing slots but keep headers (the first 6 elements)
    const headers = grid.querySelectorAll('.hour-label, .day-header');
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));

    for (let hour = 8; hour <= 16; hour++) {
        grid.innerHTML += `<div class="hour-label">${hour}:00</div>`;
        for (let day = 1; day <= 5; day++) {
            grid.innerHTML += `<div class="time-slot" id="slot-${day}-${hour}" onclick="openBooking(${day}, ${hour})"></div>`;
        }
    }
}

async function loadSchedule() {
    const { data: appts } = await window.db
        .from('appointments')
        .select('*, profiles:patient_id (full_name)')
        .eq('doctor_id', assignedDrId);

    document.querySelectorAll('.appointment-block').forEach(el => el.remove());

    if (appts) {
        appts.forEach(appt => {
            const date = new Date(appt.appointment_time);
            const dayOfWeek = date.getDay();
            const hour = date.getHours();

            const slot = document.getElementById(`slot-${dayOfWeek}-${hour}`);
            if (slot) {
                // We add an onclick that calls cancelAppointment and event.stopPropagation()
                slot.innerHTML = `
                    <div class="appointment-block" 
                         onclick="cancelAppointment(event, '${appt.id}', '${appt.profiles.full_name}')"
                         style="cursor: pointer;" 
                         title="Click to cancel">
                        ${appt.profiles.full_name}
                    </div>`;
            }
        });
    }
}
window.cancelAppointment = async (event, apptId, patientName) => {
    // Prevent the parent div (time-slot) from opening the booking modal
    event.stopPropagation();

    const confirmCancel = confirm(`Are you sure you want to cancel the appointment for ${patientName}?`);
    
    if (confirmCancel) {
        const { error } = await window.db
            .from('appointments')
            .delete()
            .eq('id', apptId);

        if (!error) {
            alert("Appointment cancelled successfully.");
            loadSchedule(); // Refresh the grid
        } else {
            console.error("Error cancelling:", error);
            alert("Failed to cancel appointment: " + error.message);
        }
    }
};
async function loadPatients() {
    // 1. Fetch unique patient IDs that have appointments with this specific doctor
    const { data: appts, error: apptError } = await window.db
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', assignedDrId);

    if (apptError || !appts) {
        console.error("Error fetching doctor's patients:", apptError);
        return;
    }

    // 2. Get unique patient IDs to avoid duplicates in the dropdown
    const uniquePatientIds = [...new Set(appts.map(a => a.patient_id))];

    if (uniquePatientIds.length === 0) {
        const select = document.getElementById('patientSelect');
        select.innerHTML = '<option value="">-- No patients found for this Dr. --</option>';
        return;
    }

    // 3. Fetch the full names from the profiles table for those specific IDs
    const { data: patients, error: profileError } = await window.db
        .from('profiles')
        .select('id, full_name')
        .in('id', uniquePatientIds)
        .eq('role', 'patient');

    if (profileError) {
        console.error("Error fetching patient profiles:", profileError);
        return;
    }

    // 4. Populate the dropdown
    const select = document.getElementById('patientSelect');
    select.innerHTML = '<option value="">-- Choose from List --</option>'; // Reset
    patients.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.full_name}</option>`;
    });
}

window.openBooking = (day, hour) => {
    selectedDay = day;
    selectedHour = hour;
    const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    document.getElementById('selected-slot-info').innerText = `Booking for ${days[day]} at ${hour}:00`;
    document.getElementById('bookModal').style.display = 'flex';
};

window.closeModal = () => {
    document.getElementById('bookModal').style.display = 'none';
};

window.confirmBooking = async () => {
    const patientId = document.getElementById('patientSelect').value;
    if (!patientId) return alert("Select a patient");

    // Calculate the date based on selectedDay (1=Mon, 2=Tue...)
    const now = new Date();
    const currentDay = now.getDay(); 
    const daysUntilSelected = (selectedDay - currentDay + 7) % 7;
    
    const appointmentDate = new Date(now);
    appointmentDate.setDate(now.getDate() + daysUntilSelected);
    appointmentDate.setHours(selectedHour, 0, 0, 0);

    const { error } = await window.db.from('appointments').insert([
        { 
            doctor_id: assignedDrId, 
            patient_id: patientId, 
            appointment_time: appointmentDate.toISOString(), // Matches schema
            status: 'confirmed'
        }
    ]);

    if (!error) {
        closeModal();
        loadSchedule();
    } else {
        alert("Booking failed: " + error.message);
    }
};

window.logout = () => {
    localStorage.clear();
    window.location.href = 'login.html';
};

init();