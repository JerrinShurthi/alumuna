// =============================================================================
// Alumni Registration Controller
// =============================================================================

import { registerUser, checkAuthState, getFriendlyAuthErrorMessage } from "./auth.js";
import { showToast, setButtonLoading } from "./utils.js";
import { storage } from "./firebase-config.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
    // Redirect if user is already logged in
    checkAuthState({
        allowAnonymous: true,
        redirectIfAuth: true
    });

    const regForm = document.getElementById("register-form");
    const errorBanner = document.getElementById("auth-error-banner");
    const submitBtn = document.getElementById("register-submit-btn");
    const imageInput = document.getElementById("profile-image-input");
    const imagePreview = document.getElementById("avatar-preview-img");

    // Preview uploaded image
    if (imageInput && imagePreview) {
        imageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const clearError = () => {
        if (errorBanner) {
            errorBanner.classList.remove("active");
            errorBanner.textContent = "";
        }
        document.querySelectorAll(".form-group").forEach((el) => el.classList.remove("has-error"));
    };

    const showError = (msg, inputElement = null) => {
        if (errorBanner) {
            errorBanner.textContent = msg;
            errorBanner.classList.add("active");
        } else {
            showToast(msg, "error");
        }
        if (inputElement) {
            const group = inputElement.closest(".form-group");
            if (group) group.classList.add("has-error");
            inputElement.focus();
        }
    };

    if (regForm) {
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearError();

            const name = regForm.fullName.value.trim();
            const email = regForm.email.value.trim();
            const password = regForm.password.value;
            const confirmPassword = regForm.confirmPassword.value;
            const phone = regForm.phone.value.trim();
            const gender = regForm.gender.value;
            const dob = regForm.dob.value;
            const graduationYear = regForm.graduationYear.value.trim();
            const department = regForm.department.value;
            const degree = regForm.degree.value;
            const company = regForm.company.value.trim();
            const jobPosition = regForm.jobPosition.value.trim();
            const location = regForm.location.value.trim();
            const linkedin = regForm.linkedin.value.trim();
            const bio = regForm.bio.value.trim();

            // Client-side validations
            if (!name) {
                showError("Please enter your full name.", regForm.fullName);
                return;
            }
            if (!email) {
                showError("Please enter your email address.", regForm.email);
                return;
            }
            if (!password) {
                showError("Please create a password.", regForm.password);
                return;
            }
            if (password.length < 6) {
                showError("Password must be at least 6 characters long.", regForm.password);
                return;
            }
            if (password !== confirmPassword) {
                showError("Passwords do not match.", regForm.confirmPassword);
                return;
            }
            if (!phone) {
                showError("Please provide your phone number.", regForm.phone);
                return;
            }
            if (!department) {
                showError("Please select your department.", regForm.department);
                return;
            }
            if (!degree) {
                showError("Please select your degree.", regForm.degree);
                return;
            }
            if (!graduationYear) {
                showError("Please enter your graduation year.", regForm.graduationYear);
                return;
            }
            const currentYear = new Date().getFullYear();
            const gradYearNum = parseInt(graduationYear, 10);
            if (isNaN(gradYearNum) || gradYearNum < 1950 || gradYearNum > currentYear + 6) {
                showError("Please enter a valid graduation year.", regForm.graduationYear);
                return;
            }

            setButtonLoading(submitBtn, true, "Registering account...", "Create Account");

            // Handle optional profile image upload
            let profileImageUrl = "assets/images/avatar-default.svg";
            const imageFile = imageInput ? imageInput.files[0] : null;

            if (imageFile) {
                try {
                    const storageRef = ref(storage, `profileImages/${Date.now()}_${imageFile.name}`);
                    const uploadResult = await uploadBytes(storageRef, imageFile);
                    profileImageUrl = await getDownloadURL(uploadResult.ref);
                } catch (uploadErr) {
                    console.warn("Storage upload failed (using placeholder/data URL):", uploadErr);
                    // If Storage bucket is unconfigured or blocked by rules, fallback to data url or placeholder
                    if (imagePreview && imagePreview.src.startsWith("data:")) {
                        profileImageUrl = imagePreview.src;
                    }
                }
            }

            try {
                // Register with Firebase Auth & save to Firestore (role is hardcoded 'alumni')
                await registerUser({
                    name,
                    email,
                    password,
                    phone,
                    gender,
                    dob,
                    graduationYear,
                    department,
                    degree,
                    company,
                    jobPosition,
                    location,
                    linkedin,
                    bio,
                    profileImage: profileImageUrl
                });

                showToast("Account created successfully! Welcome to Alumni Network.", "success");
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1000);

            } catch (error) {
                console.error("Registration error:", error);
                const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
                showError(friendlyMessage);
                setButtonLoading(submitBtn, false, "Registering account...", "Create Account");
            }
        });
    }
});
