from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import numpy as np
import cv2
import base64

app = Flask(__name__)
CORS(app)

# Load model once (important)
model = YOLO(r"D:\groundnut\actual\backend\best.pt")

@app.route("/")
def home():
    return "YOLO API Running"

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]

    # Convert image to OpenCV format
    img_bytes = file.read()
    np_arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # Run YOLO
    results = model(img)

    detections = []
    names = model.names

    for r in results:
        for box in r.boxes.data.tolist():
            x1, y1, x2, y2, conf, cls = box
            detections.append({
                "class": names[int(cls)],
                "confidence": round(float(conf), 3)
            })

    # Draw bounding boxes
    plotted = results[0].plot()

    # Convert image to base64
    _, buffer = cv2.imencode('.jpg', plotted)
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    return jsonify({
        "detections": detections,
        "image": img_base64
    })

if __name__ == "__main__":
    app.run(debug=True)