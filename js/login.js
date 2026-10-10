// =============================================================================
// Login Page Controller
// =============================================================================

import { loginUser, resetPassword, checkAuthState, getFriendlyAuthErrorMessage } from "./auth.js";
import { showToast, setButtonLoading } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
    // Redirect if user is already logged in
    checkAuthState({
        allowAnonymous: true,
        redirectIfAuth: true
    });

    const loginForm = document.getElementById("login-form");
    const errorBanner = document.getElementById("auth-error-banner");
    const loginBtn = document.getElementById("login-submit-btn");

    // Forgot password modal elements
    const forgotPasswordLink = document.getElementById("forgot-password-link");
    const forgotModal = document.getElementById("forgot-password-modal");
    const closeForgotModal = document.getElementById("close-forgot-modal");
    const cancelForgotBtn = document.getElementById("cancel-forgot-btn");
    const forgotForm = document.getElementById("forgot-password-form");
    const sendResetBtn = document.getElementById("send-reset-btn");

    // Clear error banner
    const clearError = () => {
        if (errorBanner) {
            errorBanner.classList.remove("active");
            errorBanner.textContent = "";
        }
    };

    const showError = (msg) => {
        if (errorBanner) {
            errorBanner.textContent = msg;
            errorBanner.classList.add("active");
        } else {
            showToast(msg, "error");
        }
    };

    // Handle Login submission
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearError();

            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;

            if (!email || !password) {
                showError("Please enter both email and password.");
                return;
            }

            setButtonLoading(loginBtn, true, "Logging in...", "Login");

            try {
                const { role } = await loginUser(email, password);
                showToast("Login successful! Redirecting...", "success");

                // Role-based redirection
                setTimeout(() => {
                    if (role === "admin") {
                        window.location.href = "admin-dashboard.html";
                    } else {
                        window.location.href = "dashboard.html";
                    }
                }, 800);
            } catch (error) {
                console.error("Login failed:", error);
                const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
                showError(friendlyMessage);
                setButtonLoading(loginBtn, false, "Logging in...", "Login");
            }
        });
    }

    // Forgot Password Modal
    if (forgotPasswordLink && forgotModal) {
        forgotPasswordLink.addEventListener("click", (e) => {
            e.preventDefault();
            forgotModal.classList.add("active");
            clearError();
            if (loginForm && loginForm.email.value) {
                document.getElementById("reset-email").value = loginForm.email.value;
            }
        });

        const closeModal = () => {
            forgotModal.classList.remove("active");
        };

        if (closeForgotModal) closeForgotModal.addEventListener("click", closeModal);
        if (cancelForgotBtn) cancelForgotBtn.addEventListener("click", closeModal);
        forgotModal.addEventListener("click", (e) => {
            if (e.target === forgotModal) closeModal();
        });

        if (forgotForm) {
            forgotForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const resetEmail = document.getElementById("reset-email").value.trim();

                if (!resetEmail) {
                    showToast("Please enter your registered email address.", "warning");
                    return;
                }

                setButtonLoading(sendResetBtn, true, "Sending email...", "Send Reset Link");

                try {
                    await resetPassword(resetEmail);
                    showToast("Password reset email sent! Check your inbox.", "success");
                    closeModal();
                } catch (err) {
                    console.error("Reset password error:", err);
                    showToast(getFriendlyAuthErrorMessage(err.code), "error");
                } finally {
                    setButtonLoading(sendResetBtn, false, "Sending email...", "Send Reset Link");
                }
            });
        }
    }
});
