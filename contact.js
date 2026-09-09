const contactForm = document.getElementById("contactForm");
const contactStatus = document.getElementById("contactStatus");
const contactSubmitBtn = document.getElementById("contactSubmitBtn");

contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    contactSubmitBtn.disabled = true;
    contactStatus.className = "";
    contactStatus.textContent = "送信中…";

    try {
        const res = await fetch(contactForm.action, {
            method: "POST",
            body: new FormData(contactForm),
            headers: { "Accept": "application/json" }
        });

        if (res.ok) {
            contactStatus.className = "success";
            contactStatus.textContent = "送信しました。ありがとうございます！";
            contactForm.reset();
        } else {
            contactStatus.className = "error";
            contactStatus.textContent = "送信に失敗しました。時間をおいて再度お試しください。";
        }
    } catch (err) {
        contactStatus.className = "error";
        contactStatus.textContent = "送信に失敗しました。通信環境をご確認のうえ再度お試しください。";
    } finally {
        contactSubmitBtn.disabled = false;
    }
});
