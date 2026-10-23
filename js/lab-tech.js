document.addEventListener('DOMContentLoaded', async () => {
    loadLabRequests();
});

async function loadLabRequests() {
    const listDiv = document.getElementById('requests-list');
    const loggedInUserId = localStorage.getItem('user_id');
    
    try {
        const { data: techData, error: techError } = await window.db
            .from('lab_technicians')
            .select('facility_id')
            .eq('id', loggedInUserId)
            .single();

        if (techError || !techData) throw new Error("Could not verify technician facility.");

        const { data, error } = await window.db
            .from('lab_requests')
            .select(`
                id, test_name, patient_id, doctor_id, facility_id, urgency,
                patient:profiles!patient_id(full_name),
                doctor:profiles!doctor_id(full_name)
            `) // Added urgency to the select string
            .eq('status', 'pending')
            .eq('facility_id', techData.facility_id);

        if (error) throw error;

        if (!data || data.length === 0) {
            listDiv.innerHTML = '<div style="text-align:center; padding:50px; color:#888;">No pending requests.</div>';
            return;
        }

        listDiv.innerHTML = data.map(req => `
            <div class="req-card">
                <div class="req-info">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="status-badge">NEW REQUEST</span>
                        <!-- Display Urgency here -->
                        <span style="font-weight:bold; color:${req.urgency?.toLowerCase() === 'urgent' ? '#d9534f' : '#888'}; font-size:0.8rem; text-transform:uppercase;">
                            ${req.urgency || 'Routine'}
                        </span>
                    </div>
                    <h3>${req.test_name}</h3>
                    <p><strong>Patient:</strong> ${req.patient?.full_name || 'Unknown'}</p>
                    <p><strong>Ordered by:</strong> Dr. ${req.doctor?.full_name || 'System'}</p>
                </div>
                <div class="upload-area">
                    <input type="file" id="file-${req.id}" style="font-size: 0.8rem;">
                    <button class="btn-upload" onclick="uploadResult('${req.id}', '${req.patient_id}', '${req.doctor_id}', '${req.test_name}')">
                        Submit Result
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        listDiv.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
    }
}

async function uploadResult(reqId, patientId, doctorId, testName) {
    const fileInput = document.getElementById(`file-${reqId}`);
    const file = fileInput.files[0];
    if (!file) return alert("Please select a file first.");

    const btn = event.target;
    btn.innerText = "Sending...";
    btn.disabled = true;

    try {
        // ✅ Step 1: Create file path
        const fileName = `results/${patientId}/${Date.now()}_${file.name}`;

        console.log("STEP 1: uploading...");

        // ✅ Step 2: Upload file
        const { error: storageError } = await window.db.storage
            .from('lab-results') // ✅ bucket name
            .upload(fileName, file);

        if (storageError) {
            console.error("STORAGE ERROR:", storageError);
            throw storageError; // STOP execution
        }

        console.log("STEP 2: getting public URL...");

        // ✅ Step 3: Get public URL
        const { data } = window.db.storage
            .from('lab-results')
            .getPublicUrl(fileName);

        const publicUrl = data?.publicUrl;

        if (!publicUrl) {
            throw new Error("Failed to get file URL");
        }

        console.log("STEP 3: inserting DB...");

        // ✅ Step 4: Save to database
        const { error: resultError } = await window.db
            .from('lab_results') // ✅ table name
            .insert([{
                patient_id: patientId,
                doctor_id: doctorId,
                test_name: testName,
                result_value: publicUrl,
                status: 'Final',
                test_date: new Date()
            }]);

        if (resultError) {
            console.error("DB ERROR:", resultError);
            throw resultError;
        }

        // ✅ Step 5: Update request status
        await window.db
            .from('lab_requests')
            .update({ status: 'completed' })
            .eq('id', reqId);

        alert("Result uploaded successfully!");
        loadLabRequests();

    } catch (err) {
        console.error("FINAL ERROR:", err);
        alert("Upload failed: " + err.message);

        btn.innerText = "Submit Result";
        btn.disabled = false;
    }
}