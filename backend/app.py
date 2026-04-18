from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import base64
import os

app = Flask(__name__)
CORS(app)

model = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")

def load_model():
    global model
    if model is None:
        print("Loading YOLO model...")
        from ultralytics import YOLO
        model = YOLO("https://drive.google.com/file/d/1mxAqGvAyw5A66QgvDie2BbN4wMV2DwHN/view?usp=sharing")
        print("Model loaded!")
    return model

@app.route("/")
def home():
    return "YOLO API Running"

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})

@app.route("/predict", methods=["POST"])
def predict():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]

        img_bytes = file.read()
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"error": "Invalid image"}), 400

        model_instance = load_model()
        results = model_instance(img)

        detections = []
        names = model_instance.names

        for r in results:
            for box in r.boxes.data.tolist():
                x1, y1, x2, y2, conf, cls = box
                detections.append({
                    "class": names[int(cls)],
                    "confidence": round(float(conf), 3)
                })

        plotted = results[0].plot() if results else img

        _, buffer = cv2.imencode('.jpg', plotted)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            "detections": detections,
            "image": img_base64
        })

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(debug=False, host="0.0.0.0", port=port)