document.addEventListener('DOMContentLoaded', async () => {
    const viewingMedLifeId = localStorage.getItem('viewing_patient_id');
    const loggedInUserId = localStorage.getItem('user_id');
    const userRole = localStorage.getItem('user_role');

    if (!viewingMedLifeId && !loggedInUserId) {
        window.location.href = 'login.html';
        return;
    }

    try {
        let query = window.db
            .from('profiles')
            .select(`
                id,
                full_name,
                medlife_id,
                created_at,
                patients (
                    id,
                    phone,
                    blood_type,
                    weight,
                    height,
                    gender,
                    birthday
                )
            `);

        if (viewingMedLifeId) {
            query = query.eq('medlife_id', viewingMedLifeId.replace('#', ''));
        } else {
            query = query.eq('id', loggedInUserId);
        }

        const { data: patientData, error } = await query.single();

        if (error || !patientData) {
            if (viewingMedLifeId) {
                alert("Patient record not found.");
                window.location.href = 'doctor-profile.html';
            } else {
                window.location.href = 'login.html';
            }
            return;
        }

        window.currentPatientTableId = patientData.patients.id;
        const details = patientData.patients || {};

        // --- UI BASIC INFO ---
        if(document.getElementById('current-page-name')) {
            document.getElementById('current-page-name').textContent = patientData.full_name;
        }

        const h1 = document.querySelector('.patient-info-main h1');
        if(h1) h1.innerHTML = `${patientData.full_name} <span class="gender-tag">${details.gender || 'Patient'}</span>`;

        const pId = document.querySelector('.patient-id');
        if(pId) pId.textContent = `MedLife ID: #${patientData.medlife_id} • Registered ${new Date(patientData.created_at).getFullYear()}`;

        const contactFast = document.querySelector('.contact-fast');
        if(contactFast) {
            contactFast.innerHTML = `
                <span><img src="images/icons/phone-flip.png" class="icon-xs"> ${details.phone || 'No Phone'}</span>
                <span><img src="images/icons/marker.png" class="icon-xs"> Beirut, Lebanon</span>
            `;
        }

        const vitalCards = document.querySelectorAll('.vital-card');
        vitalCards.forEach(card => {
            const label = card.querySelector('label')?.textContent.toLowerCase();
            const valueDisplay = card.querySelector('p');
            if (!label || !valueDisplay) return;

            if (label.includes('weight')) valueDisplay.innerHTML = `${details.weight || '--'} <span>kg</span>`;
            else if (label.includes('height')) valueDisplay.innerHTML = `${details.height || '--'} <span>cm</span>`;
            else if (label.includes('age')) valueDisplay.innerHTML = calculateAge(details.birthday) || '--';
            else if (label.includes('blood type')) valueDisplay.innerHTML = details.blood_type || '--';
        });

        // --- FETCH RELATED DATA ---
        const patientId = window.currentPatientTableId;

        const [
            { data: meds },
            { data: notes },
            { data: results },
            { data: allergies }
        ] = await Promise.all([
            window.db.from('medications').select('*, doctor:profiles!doctor_id(full_name)').eq('patient_id', patientId).order('created_at', { ascending: false }),
            window.db.from('clinical_notes').select('*').eq('patient_id', patientId).order('visit_date', { ascending: false }),
            window.db.from('lab_results').select('*').eq('patient_id', patientId).order('test_date', { ascending: false }),
            window.db.from('allergies').select('*').eq('patient_id', patientId)
        ]);

        const emptyMsg = '<p style="color:#999; padding:15px;">No records added yet.</p>';

        // 1. Medications - Updated to use 'frequency' from your DB schema
        const medsHtml = meds?.length ? meds.map(m => `
            <div class="med-item" style="border-left: 4px solid #008b8b; padding: 12px; margin-bottom: 12px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <strong style="font-size: 1.1rem; color: #333;">${m.name}</strong>
                    <small style="color: #888;">${new Date(m.created_at).toLocaleDateString()}</small>
                </div>
                <div style="margin: 5px 0; font-size: 0.95rem;">
                    <span style="color: #008b8b; font-weight: 600;">Dosage:</span> ${m.dosage || 'N/A'}
                </div>
                ${m.frequency ? `<div style="font-size: 0.9rem; color: #555; font-style: italic; margin-bottom: 5px;">"${m.frequency}"</div>` : ''}
                <div style="font-size: 0.8rem; color: #999;">
                    Prescribed by: ${m.doctor?.full_name || 'Medical Staff'}
                </div>
            </div>
        `).join('') : emptyMsg;

        if(document.getElementById('active-meds-list')) document.getElementById('active-meds-list').innerHTML = medsHtml;
        if(document.getElementById('medication-management-content')) document.getElementById('medication-management-content').innerHTML = medsHtml;

        // 2. Clinical Notes
        const notesHtml = notes?.length ? notes.map(n => `<div class="note-item"><p>${n.note_text}</p><small>${new Date(n.visit_date).toLocaleDateString()}</small></div>`).join('') : emptyMsg;
        if(document.getElementById('recent-notes-list')) document.getElementById('recent-notes-list').innerHTML = notesHtml;
        if(document.getElementById('history-section-content')) document.getElementById('history-section-content').innerHTML = notesHtml;

        // 3. Lab Results
        const resultsHtml = results?.length
            ? results.map(r => `
                <tr>
                    <td>${r.test_name}</td>
                    <td>
                        <a href="${r.file_url || r.result_value}" target="_blank" style="color:#008b8b;">
                            View Result
                        </a>
                    </td>
                    <td>${r.status}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="3">No results</td></tr>';

        if(document.getElementById('recent-results-table')) document.getElementById('recent-results-table').innerHTML = resultsHtml;
        if(document.getElementById('lab-repository-content')) document.getElementById('lab-repository-content').innerHTML = `<table class="data-table" style="width:100%">${resultsHtml}</table>`;

        // 4. Allergies
        const allergyHtml = allergies?.length ? allergies.map(a => `<span class="tag">${a.allergen}</span>`).join('') : '<span class="tag">No Allergies</span>';
        if(document.getElementById('allergies-list')) document.getElementById('allergies-list').innerHTML = allergyHtml;
        if(document.getElementById('allergy-report-content')) document.getElementById('allergy-report-content').innerHTML = allergyHtml;

        if (userRole === 'doctor' && viewingMedLifeId) {
            injectDoctorActions();
        }

    } catch (err) {
        console.error("Error:", err);
    }

    // --- NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item, .view-all');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            if(!targetId) return;
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelector(`.nav-item[data-target="${targetId}"]`)?.classList.add('active');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetId)?.classList.add('active');
        });
    });
});

function injectDoctorActions() {
    const header = document.querySelector('.top-header');
    if (header && !document.getElementById('btn-back-dash')) {
        const backBtn = document.createElement('button');
        backBtn.id = 'btn-back-dash';
        backBtn.innerHTML = '← Back to Dashboard';
        backBtn.style.cssText = "background:#008b8b; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; position: absolute; right: 20px;";
        backBtn.onclick = () => window.location.href = 'doctor-profile.html';
        header.appendChild(backBtn);
    }

    const toolMap = [
        { id: 'meds-section', label: '+ Add Medication', type: 'med' },
        { id: 'history-section', label: '+ Add Note', type: 'note' },
        { id: 'results-section', label: '+ Request Lab Test', type: 'lab_request' },
        { id: 'allergies-section', label: '+ Add Allergy', type: 'allergy' }
    ];

    toolMap.forEach(tool => {
        const sec = document.getElementById(tool.id);
        if (sec) {
            const h2 = sec.querySelector('h2');
            if (h2 && !sec.querySelector('.doctor-action-btn')) {
                const btn = document.createElement('button');
                btn.className = 'doctor-action-btn';
                btn.innerText = tool.label;
                btn.style.cssText = "background:#e6f4f1; color:#008b8b; border:1px solid #008b8b; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem; margin-left:20px; font-weight:600;";
                btn.onclick = () => showInlineForm(tool.id, tool.type);
                h2.after(btn);
            }
        }
    });
}

function showInlineForm(sectionId, type) {
    const existingForm = document.getElementById('active-inline-form');
    if (existingForm) existingForm.remove();

    const formDiv = document.createElement('div');
    formDiv.id = 'active-inline-form';
    formDiv.style.cssText = "background:#f9f9f9; padding:15px; border-radius:8px; border:1px solid #ddd; margin: 15px 0; width: 100%; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;";

    let inputs = '';
    if (type === 'med') {
        inputs = `
            <input type="text" id="f1" placeholder="Medication Name" style="flex:2; min-width: 200px; padding:8px;">
            <input type="text" id="f2" placeholder="Dosage (e.g. 500mg)" style="flex:1; min-width: 100px; padding:8px;">
            <input type="text" id="f3" placeholder="Frequency (e.g. Twice a day)" style="flex:2; min-width: 200px; padding:8px;">
        `;
    } else if (type === 'note') {
        inputs = `<input type="text" id="f1" placeholder="Enter clinical note..." style="flex:1; padding:8px;">`;
    } else if (type === 'lab_request') {
        inputs = `
            <select id="f1" style="flex:1; padding:8px;">
                <option value="">-- Select Test Type --</option>
                <option value="Blood Test (CBC)">Blood Test (CBC)</option>
                <option value="Urine Analysis">Urine Analysis</option>
                <option value="Lipid Profile">Lipid Profile</option>
                <option value="Glucose Test">Glucose Test</option>
                <option value="Liver Function">Liver Function</option>
            </select>
            <input type="text" id="f2" placeholder="Urgency (e.g. Routine)" style="flex:1; padding:8px;">`;
    } else if (type === 'allergy') {
        inputs = `<input type="text" id="f1" placeholder="Allergen Name" style="flex:1; padding:8px;">`;
    }

    formDiv.innerHTML = `
        <div style="width: 100%; display: flex; gap: 10px; margin-bottom: 10px;">${inputs}</div>
        <div style="display: flex; gap: 10px;">
            <button onclick="submitInlineForm('${type}')" style="background:#008b8b; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">Save</button>
            <button onclick="this.parentElement.parentElement.remove()" style="background:#ccc; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">Cancel</button>
        </div>
    `;
    document.getElementById(sectionId).querySelector('h2').parentElement.after(formDiv);
}

async function submitInlineForm(type) {
    const v1 = document.getElementById('f1')?.value;
    const v2 = document.getElementById('f2')?.value;
    const v3 = document.getElementById('f3')?.value; // This is the frequency/instructions value
    if (!v1) return alert("Please fill in the required fields.");

    try {
        let tableName = '', insertData = {};
        const loggedInDoctorId = localStorage.getItem('user_id');

        if (type === 'med') {
            tableName = 'medications';
            insertData = { 
                patient_id: window.currentPatientTableId, 
                doctor_id: loggedInDoctorId, 
                name: v1, 
                dosage: v2,
                frequency: v3, // Changed from 'instructions' to 'frequency' to match your DB
                created_at: new Date()
            };
        } else if (type === 'note') {
            tableName = 'clinical_notes';
            insertData = { patient_id: window.currentPatientTableId, doctor_id: loggedInDoctorId, note_text: v1, visit_date: new Date() };
        } else if (type === 'lab_request') {
            tableName = 'lab_requests';
            // First, fetch the doctor's facility_id from their profile/doctor table
            const { data: docInfo } = await window.db
                .from('doctors')
                .select('facility_id')
                .eq('id', loggedInDoctorId)
                .single();
            insertData = { 
                patient_id: window.currentPatientTableId, 
                doctor_id: loggedInDoctorId, 
                facility_id: docInfo.facility_id, // Add this line
                test_name: v1, 
                urgency: v2, // ADD THIS LINE: captures the text from the urgency input field
                status: 'pending',
                created_at: new Date() 
            };
        } else if (type === 'allergy') {
            tableName = 'allergies';
            insertData = { patient_id: window.currentPatientTableId, allergen: v1, severity: 'Moderate' };
        }

        const { error } = await window.db.from(tableName).insert([insertData]);
        if (error) throw error;
        
        alert(type === 'lab_request' ? "Lab test requested successfully!" : "Record saved.");
        location.reload();
    } catch (e) {
        console.error(e);
        alert("Error saving record: " + e.message);
    }
}

function calculateAge(birthday) {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
}