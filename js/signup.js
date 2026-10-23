function selectRole(role) {
    if (role === 'patient') window.location.href = 'signup-patient.html';
    else if (role === 'professional') window.location.href = 'signup-professional.html';
    else if (role === 'facility') window.location.href = 'signup-facility.html';
}