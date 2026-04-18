const input = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const loader = document.getElementById("loader");
const resultCard = document.getElementById("resultCard");

// 🔥 CHANGE THIS ONLY IF YOUR BACKEND URL CHANGES
const BASE_URL = "https://groundnut-disease-detection.onrender.com";

// Check connection on page load
document.addEventListener("DOMContentLoaded", () => {
    checkConnection();
});

async function checkConnection() {
    const status = document.getElementById("connectionStatus");

    try {
        let response = await fetch(`${BASE_URL}/health`);
        let data = await response.json();

        if (data.status === "ok") {
            const modelStatus = data.model_loaded
                ? "✅ Ready"
                : "⏳ Model not loaded yet";

            status.innerHTML = `<span style="color: #27ae60; font-weight: bold;">
                ✓ Server connected - ${modelStatus}
            </span>`;
        }
    } catch (error) {
        status.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">
            ✗ Server not reachable
        </span>`;
    }
}

// Image preview
input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.classList.remove("hidden");
    }
});

// Helper: show loader text
function showLoader(text) {
    loader.classList.remove("hidden");

    let existing = document.getElementById("loaderText");
    if (existing) existing.remove();

    let loaderText = document.createElement("p");
    loaderText.id = "loaderText";
    loaderText.style.textAlign = "center";
    loaderText.style.marginTop = "10px";
    loaderText.innerText = text;

    loader.parentElement.appendChild(loaderText);
}

// Helper: hide loader
function hideLoader() {
    loader.classList.add("hidden");
    let loaderText = document.getElementById("loaderText");
    if (loaderText) loaderText.remove();
}

// 🔥 Preload model (sends tiny valid image)
async function preloadModel() {
    showLoader("Loading model... This may take 1-2 minutes");

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        // Tiny 1x1 pixel image (valid JPEG)
        const tinyImage = new Uint8Array([
            255, 216, 255, 217
        ]);
        let blob = new Blob([tinyImage], { type: "image/jpeg" });

        let formData = new FormData();
        formData.append("image", blob, "tiny.jpg");

        let response = await fetch(`${BASE_URL}/predict`, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        hideLoader();

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        alert("✅ Model pre-loaded successfully!");
        checkConnection();

    } catch (error) {
        hideLoader();

        if (error.name === "AbortError") {
            alert("⏱️ Pre-load timed out. Try again or upload an image directly.");
        } else {
            alert("❌ Error pre-loading model: " + error.message);
        }
    }
}

// 🔥 Upload image for prediction
async function uploadImage() {

    if (input.files.length === 0) {
        alert("Please upload an image");
        return;
    }

    showLoader("Detecting disease... Please wait");
    resultCard.classList.add("hidden");

    let formData = new FormData();
    formData.append("image", input.files[0]);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        let response = await fetch(`${BASE_URL}/predict`, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        let data = await response.json();

        hideLoader();
        resultCard.classList.remove("hidden");

        // Show processed image
        document.getElementById("outputImage").src =
            "data:image/jpeg;base64," + data.image;

        // Show detections
        let resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";

        if (!data.detections || data.detections.length === 0) {
            resultsDiv.innerHTML = "<p>No disease detected</p>";
            return;
        }

        data.detections.forEach(d => {
            let badge = document.createElement("span");
            badge.className = "badge";
            badge.innerText = `${d.class} (${d.confidence})`;
            resultsDiv.appendChild(badge);
        });

        checkConnection();

    } catch (error) {
        hideLoader();

        if (error.name === "AbortError") {
            alert("⏱️ Request timed out. Server may be slow or waking up.");
        } else {
            alert("❌ Error connecting to server: " + error.message);
        }

        console.error(error);
    }
}