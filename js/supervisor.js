// 1. Function to render the Facility List
async function renderHospitals() {
    const grid = document.getElementById('master-grid');
    const title = document.getElementById('view-title');
    
    document.getElementById('layer-2').textContent = "";
    document.getElementById('layer-3').textContent = "";
    title.textContent = "Facility Network";
    grid.innerHTML = '<p style="padding:20px;">Updating Network Stats...</p>';

    const { data: facilities, error } = await window.db
        .from('facilities') 
        .select(`
            *,
            doctors(count)
        `)
        .order('facility_name', { ascending: true });

    if (error) {
        console.error("Database Error:", error);
        grid.innerHTML = `<p style="color:red; padding:20px;">Error: ${error.message}</p>`;
        return;
    }

    grid.innerHTML = facilities.map(fac => {
        const doctorCount = fac.doctors?.[0]?.count || 0;

        return `
            <div class="card entity-card" onclick="goToFacilityAdmin('${fac.id}')">
                <div class="entity-info">
                    <h3>${fac.facility_name}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${fac.location || 'Lebanon'}</p>
                    <small style="color: #008b8b; font-weight: bold;">Click to Manage Facility →</small>
                </div>
                <div class="entity-stats">
                    <div class="stat-item">
                        <span>Doctors</span>
                        <strong>${doctorCount}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Status</span>
                        <strong style="color: #28a745;">Active</strong> 
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * NEW: Redirects the Supervisor to the Hospital Admin dashboard
 * for the selected facility.
 */
function goToFacilityAdmin(facilityId) {
    // Store the ID so hospital-admin.html knows which facility to display
    localStorage.setItem('facility_id', facilityId);
    
    // Optional: Set a flag so the admin page knows it's being viewed by a supervisor
    localStorage.setItem('is_supervisor_view', 'true');
    
    window.location.href = 'hospital-admin.html';
}

// 3. Sidebar Click Listener
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');

        const type = this.getAttribute('data-type');
        document.getElementById('layer-1').textContent = type.charAt(0).toUpperCase() + type.slice(1);
        
        if (type === 'hospitals' || type === 'facilities') {
            renderHospitals();
        } else {
            document.getElementById('master-grid').innerHTML = `<div class="card"><h2>${type} directory coming soon...</h2></div>`;
            document.getElementById('layer-2').textContent = "";
            document.getElementById('layer-3').textContent = "";
            document.getElementById('view-title').textContent = type.charAt(0).toUpperCase() + type.slice(1);
        }
    });
});

window.onload = renderHospitals;