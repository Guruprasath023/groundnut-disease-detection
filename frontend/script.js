const input = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const loader = document.getElementById("loader");
const resultCard = document.getElementById("resultCard");

// Check connection on page load
document.addEventListener("DOMContentLoaded", () => {
    checkConnection();
});

async function checkConnection() {
    try {
        let response = await fetch("http://127.0.0.1:5000/health");
        let data = await response.json();
        
        const status = document.getElementById("connectionStatus");
        if (data.status === "ok") {
            const modelStatus = data.model_loaded ? "✅ Ready" : "⏳ Model not loaded yet";
            status.innerHTML = `<span style="color: #27ae60; font-weight: bold;">✓ Server connected - ${modelStatus}</span>`;
        }
    } catch (error) {
        const status = document.getElementById("connectionStatus");
        status.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">✗ Server not reachable</span>`;
    }
}

input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.classList.remove("hidden");
    }
});

async function preloadModel() {
    loader.classList.remove("hidden");
    resultCard.classList.add("hidden");

    let loaderText = document.createElement("p");
    loaderText.id = "loaderText";
    loaderText.style.textAlign = "center";
    loaderText.style.marginTop = "10px";
    loaderText.innerText = "Loading model... This may take 1-2 minutes on first load";
    loader.parentElement.appendChild(loaderText);

    try {
        // Set timeout to 3 minutes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        // Send a dummy request to trigger model loading
        let formData = new FormData();
        formData.append("image", new Blob([]), "dummy.jpg");

        let response = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        loader.classList.add("hidden");
        loaderText.remove();

        alert("Model pre-loaded successfully! Now you can upload images for faster detection.");
        checkConnection();

    } catch (error) {
        loader.classList.add("hidden");
        const loaderTextElement = document.getElementById("loaderText");
        if (loaderTextElement) loaderTextElement.remove();

        if (error.name === "AbortError") {
            alert("Pre-load timed out. Try again or upload an image directly (will be slower on first request).");
        } else {
            alert("Error pre-loading model: " + error.message);
        }
    }
}

async function uploadImage() {

    if (input.files.length === 0) {
        alert("Please upload an image");
        return;
    }

    loader.classList.remove("hidden");
    resultCard.classList.add("hidden");

    let loaderText = document.createElement("p");
    loaderText.id = "loaderText";
    loaderText.style.textAlign = "center";
    loaderText.style.marginTop = "10px";
    loaderText.innerText = "Detecting disease... Please wait";
    loader.parentElement.appendChild(loaderText);

    let formData = new FormData();
    formData.append("image", input.files[0]);

    try {
        // Set timeout to 3 minutes for first request, 30 seconds for subsequent
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        let response = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        let data = await response.json();

        loader.classList.add("hidden");
        loaderText.remove();
        resultCard.classList.remove("hidden");

        // Show processed image
        document.getElementById("outputImage").src =
            "data:image/jpeg;base64," + data.image;

        // Show detections
        let resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";

        if (data.detections.length === 0) {
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
        loader.classList.add("hidden");
        const loaderTextElement = document.getElementById("loaderText");
        if (loaderTextElement) loaderTextElement.remove();
        
        if (error.name === "AbortError") {
            alert("Request timed out. The server may be slow. Please check if the backend is running or try again.");
        } else {
            alert("Error connecting to server: " + error.message);
        }
        console.error(error);
    }
}