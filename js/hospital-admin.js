// js/hospital-admin.js

document.addEventListener('DOMContentLoaded', async () => {
    const facilityId = localStorage.getItem('currentFacilityId');

    // --- 1. SECURITY CHECK ---
    if (!facilityId) {
        window.location.href = 'login.html';
        return;
    }

    // --- 2. NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            const targetId = this.getAttribute('data-target');
            if (this.classList.contains('logout') || !targetId) return;
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) section.classList.add('active');
            });
        });
    });

    // --- 3. DATA LOADING ---
    await loadDashboardData();

    async function loadDashboardData() {
        try {
            const { data: fac } = await window.db
                .from('facilities')
                .select('facility_name')
                .eq('id', facilityId)
                .single();
            
            if (fac) document.getElementById('hospital-abbr').innerText = fac.facility_name;

            // 1. Fetch Doctors
            const { data: doctors } = await window.db
                .from('doctor_verification_view')
                .select('*')
                .eq('facility_id', facilityId);

            // 2. Fetch Receptionists
            const { data: receptionists, error: recError } = await window.db
                .from('receptionists')
                .select(`
                    id, 
                    status, 
                    phone, 
                    doctor_id,
                    facility_id,
                    profiles:id (full_name),
                    doctor_profile:doctor_id (full_name)
                `)
                .eq('facility_id', facilityId);

            if (recError) console.error("Receptionist Fetch Error:", recError.message);

            // 3. Fetch Lab Technicians
            const { data: labTechs, error: labError } = await window.db
                .from('lab_technicians')
                .select(`
                    id,
                    status,
                    phone,
                    facility_id,
                    profiles:id (full_name)
                `)
                .eq('facility_id', facilityId);

            if (labError) console.error("Lab Tech Fetch Error:", labError.message);

            // Combine and render
            renderStaff(doctors || [], receptionists || [], labTechs || []);
        } catch (err) {
            console.error("Load Error:", err.message);
        }
    }

    // --- 4. RENDERING STAFF ---
    function renderStaff(doctors, receptionists, labTechs) {
        const pendingTable = document.querySelector('#pending-requests-section tbody');
        const activeGrid = document.getElementById('doctorGrid');
        
        if (pendingTable) pendingTable.innerHTML = '';
        if (activeGrid) activeGrid.innerHTML = '';

        let pendingCount = 0;

        // --- Render Doctors ---
        doctors.forEach(doc => {
            if (doc.status === 'pending') {
                pendingCount++;
                pendingTable.innerHTML += `
                    <tr>
                        <td>${doc.full_name}</td>
                        <td><span class="badge-role">Doctor</span></td>
                        <td>${doc.specialty}</td>
                        <td>${doc.license_id}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-approve" onclick="updateStatus('${doc.doctor_uuid}', 'active', 'doctors')">Approve</button>
                                <button class="btn-reject" onclick="updateStatus('${doc.doctor_uuid}', 'rejected', 'doctors')">Reject</button>
                            </div>
                        </td>
                    </tr>`;
            } else if (doc.status === 'active') {
                activeGrid.innerHTML += createMiniCard(doc.full_name, doc.specialty, doc.doctor_uuid);
            }
        });

        // --- Render Receptionists ---
        receptionists.forEach(rec => {
            const name = rec.profiles?.full_name || "Unknown";
            const managedDr = rec.doctor_profile ? `Managing ${rec.doctor_profile.full_name}` : 'N/A';

            if (rec.status === 'pending') {
                pendingCount++;
                pendingTable.innerHTML += `
                    <tr>
                        <td>${name}</td>
                        <td><span class="badge-role" style="background: #9b59b6; color: white;">Receptionist</span></td>
                        <td>${managedDr}</td>
                        <td>${rec.phone || 'No Phone'}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-approve" onclick="updateStatus('${rec.id}', 'active', 'receptionists')">Approve</button>
                                <button class="btn-reject" onclick="updateStatus('${rec.id}', 'rejected', 'receptionists')">Reject</button>
                            </div>
                        </td>
                    </tr>`;
            } else if (rec.status === 'active') {
                activeGrid.innerHTML += createMiniCard(name, 'Receptionist', null);
            }
        });

        // --- Render Lab Technicians ---
        labTechs.forEach(lt => {
            const name = lt.profiles?.full_name || "Unknown";

            if (lt.status === 'pending') {
                pendingCount++;
                pendingTable.innerHTML += `
                    <tr>
                        <td>${name}</td>
                        <td><span class="badge-role" style="background: #e67e22; color: white;">Lab Tech</span></td>
                        <td>Laboratory Dept</td>
                        <td>${lt.phone || 'No Phone'}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-approve" onclick="updateStatus('${lt.id}', 'active', 'lab_technicians')">Approve</button>
                                <button class="btn-reject" onclick="updateStatus('${lt.id}', 'rejected', 'lab_technicians')">Reject</button>
                            </div>
                        </td>
                    </tr>`;
            } else if (lt.status === 'active') {
                activeGrid.innerHTML += createMiniCard(name, 'Lab Technician', null);
            }
        });

        const badge = document.querySelector('.badge');
        if (badge) badge.innerText = pendingCount;
    }

    function createMiniCard(name, subtitle, id) {
        return `
            <div class="card doctor-mini-card" ${id ? `onclick="viewDoctorProfile('${id}')"` : ''} style="cursor: ${id ? 'pointer' : 'default'};">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=008b8b&color=fff" alt="User">
                <div class="doc-info">
                    <h4>${name}</h4>
                    <p>${subtitle}</p>
                    <span class="status-active">Active</span>
                </div>
            </div>`;
    }

    // --- 5. GLOBAL ACTIONS ---
    window.updateStatus = async (id, newStatus, tableName) => {
        try {
            const { error } = await window.db
                .from(tableName)
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            alert(`Request ${newStatus}!`);
            await loadDashboardData();
        } catch (err) {
            alert("Update failed: " + err.message);
        }
    };

    window.viewDoctorProfile = (docId) => {
        if (!docId) return;
        localStorage.setItem('viewing_doctor_id', docId);
        window.location.href = 'doctor-profile.html';
    };

    const manualForm = document.getElementById('manualDocForm');
    if (manualForm) {
        manualForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert("Manual addition simulated.");
            closeModal();
            this.reset();
        });
    }
});

function openModal() { document.getElementById('doctorModal').style.display = 'block'; }
function closeModal() { document.getElementById('doctorModal').style.display = 'none'; }
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}