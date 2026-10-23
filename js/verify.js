// 1. Initialize EmailJS
(function() {
    emailjs.init("klNQMHV-JMSv0HA3z");
})();

document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.otp-inputs input');
    const timerDisplay = document.getElementById('timer');
    const resendBtn = document.getElementById('resend-btn');
    const otpForm = document.getElementById('otp-form');
    
    const userEmail = localStorage.getItem('temp_user_email');
    const medId = localStorage.getItem('temp_medlife_id');

    let timerId = null;

    // --- 2. EmailJS Send Function ---
    async function sendVerificationEmail() {
        if (!userEmail) {
            alert("Registration data missing. Please sign up again.");
            window.location.href = "patient-signup.html";
            return;
        }

        // Generate a new code ONLY if we don't already have a valid one for this session
        // This prevents the email and the storage from getting out of sync
        let generatedOTP = sessionStorage.getItem('validOTP');
        
        if (!generatedOTP) {
            generatedOTP = Math.floor(10000 + Math.random() * 90000).toString();
            sessionStorage.setItem('validOTP', generatedOTP);
        }

        const templateParams = {
            to_email: userEmail,
            otp_code: generatedOTP 
        };

        try {
            console.log("Sending OTP code:", generatedOTP, "to:", userEmail);
            await emailjs.send('service_05d60nn', 'template_1xadiok', templateParams);
            console.log("Email sent successfully!");
        } catch (error) {
            console.error("EmailJS Error:", error);
            alert("Verification service error. Try resending.");
        }
    }

    // --- 3. Submit & Verify ---
    otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Build user input string
        let userCode = "";
        inputs.forEach(input => userCode += input.value.trim());

        // Get the code stored in the session
        const correctCode = sessionStorage.getItem('validOTP');

        console.log("Comparing User Input:", userCode, "with Correct Code:", correctCode);

        // Standard comparison with trim just in case
        if (userCode === correctCode && userCode !== "") {
            alert(`Verified! Your MedLife ID is: ${medId}`);
            localStorage.clear();
            sessionStorage.removeItem('validOTP');
            window.location.href = "login.html";
        } else {
            alert("Incorrect code. Please check your email and try again.");
            // Clear inputs for retry
            inputs.forEach(input => input.value = "");
            inputs[0].focus();
        }
    });

    // --- 4. Timer & Resend ---
    function startTimer(seconds) {
        clearInterval(timerId);
        let timeLeft = seconds;
        timerId = setInterval(() => {
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timerDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            if (timeLeft <= 0) {
                clearInterval(timerId);
                resendBtn.classList.remove('disabled');
            } else { timeLeft--; }
        }, 1000);
    }

    resendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (resendBtn.classList.contains('disabled')) return;
        
        // When resending, we WANT a new code
        sessionStorage.removeItem('validOTP'); 
        resendBtn.classList.add('disabled');
        sendVerificationEmail();
        startTimer(120);
    });

    // Auto-focus logic
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // Start everything
    sendVerificationEmail();
    startTimer(120);
});