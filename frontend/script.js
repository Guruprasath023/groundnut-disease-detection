const input = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const loader = document.getElementById("loader");
const resultCard = document.getElementById("resultCard");

input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.classList.remove("hidden");
    }
});

async function uploadImage() {

    if (input.files.length === 0) {
        alert("Please upload an image");
        return;
    }

    loader.classList.remove("hidden");
    resultCard.classList.add("hidden");

    let formData = new FormData();
    formData.append("image", input.files[0]);

    try {
        let response = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            body: formData
        });

        let data = await response.json();

        loader.classList.add("hidden");
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

    } catch (error) {
        loader.classList.add("hidden");
        alert("Error connecting to server");
        console.error(error);
    }
}