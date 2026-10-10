// =============================================================================
// Contact & Feedback Controller
// =============================================================================

import { checkAuthState, getCurrentUser } from "./auth.js";
import { showToast, setButtonLoading } from "./utils.js";
import { db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState({
        allowAnonymous: true,
        onUserReady: (user) => {
            if (user) {
                const nameInput = document.getElementById("contact-name");
                const emailInput = document.getElementById("contact-email");
                if (nameInput && !nameInput.value) nameInput.value = user.displayName || "";
                if (emailInput && !emailInput.value) emailInput.value = user.email || "";
            }
        }
    });

    const contactForm = document.getElementById("contact-form");
    const submitBtn = document.getElementById("contact-submit-btn");

    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = contactForm.name.value.trim();
            const email = contactForm.email.value.trim();
            const subject = contactForm.subject.value.trim();
            const message = contactForm.message.value.trim();

            if (!name || !email || !subject || !message) {
                showToast("Please fill in all required fields.", "warning");
                return;
            }

            setButtonLoading(submitBtn, true, "Sending message...", "Send Message");

            try {
                await addDoc(collection(db, "feedback"), {
                    name,
                    email,
                    subject,
                    message,
                    createdAt: new Date().toISOString()
                });

                showToast("Thank you! Your message has been received.", "success");
                contactForm.reset();

            } catch (error) {
                console.error("Failed to submit feedback:", error);
                showToast("Unable to send message: " + error.message, "error");
            } finally {
                setButtonLoading(submitBtn, false, "Sending message...", "Send Message");
            }
        });
    }
});
