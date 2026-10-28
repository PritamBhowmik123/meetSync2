#!/usr/bin/env python3
"""
FaceNet Biometric Engine for MeetSync2
======================================
Deep learning face recognition using:
- FaceNet (Inception-ResNet-v1, 512D L2-normalized embeddings via ONNX Runtime)
- OpenCV YuNet (Deep learning face detection & alignment)
"""

import os
import sys
import json
import base64
import argparse
from typing import List, Optional, Dict, Any

import numpy as np
import cv2
import onnxruntime as ort

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)

# Dynamically locate models directory
possible_dirs = [
    os.path.join(BACKEND_DIR, "models"),
    os.path.join(CURRENT_DIR, "models"),
    os.path.join(os.path.dirname(BACKEND_DIR), "models"),
    os.path.join(os.path.dirname(BACKEND_DIR), "backend", "models")
]
MODELS_DIR = next(
    (d for d in possible_dirs if os.path.exists(os.path.join(d, "facenet.onnx"))),
    os.path.join(BACKEND_DIR, "models")
)

FACENET_PATH = os.path.join(MODELS_DIR, "facenet.onnx")
YUNET_PATH = os.path.join(MODELS_DIR, "face_detection_yunet.onnx")


class FaceNetEngine:
    def __init__(self):
        if not os.path.exists(FACENET_PATH):
            raise FileNotFoundError(f"FaceNet ONNX model not found at {FACENET_PATH}")

        # Initialize FaceNet ONNX Session
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        opts.intra_op_num_threads = max(1, os.cpu_count() or 2)

        self.facenet_session = ort.InferenceSession(
            FACENET_PATH, sess_options=opts, providers=["CPUExecutionProvider"]
        )
        self.input_name = self.facenet_session.get_inputs()[0].name
        self.output_name = self.facenet_session.get_outputs()[0].name

        # Initialize YuNet Detector
        self.detector = None
        if os.path.exists(YUNET_PATH):
            try:
                self.detector = cv2.FaceDetectorYN.create(
                    YUNET_PATH, "", (320, 320), score_threshold=0.5, nms_threshold=0.3, top_k=5000
                )
            except Exception as e:
                pass

    @staticmethod
    def decode_image(image_input: str) -> Optional[np.ndarray]:
        """Decodes base64 string or file path into BGR numpy array."""
        if not image_input:
            return None

        if os.path.isfile(image_input):
            return cv2.imread(image_input)

        if "," in image_input:
            image_input = image_input.split(",", 1)[1]

        try:
            img_bytes = base64.b64decode(image_input)
            nparr = np.frombuffer(img_bytes, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception:
            return None

    def detect_faces(self, bgr_image: np.ndarray) -> List[Dict[str, Any]]:
        """Detects faces in a BGR image using YuNet."""
        if bgr_image is None or self.detector is None:
            return []

        h, w = bgr_image.shape[:2]
        if h <= 0 or w <= 0:
            return []

        self.detector.setInputSize((w, h))
        _, faces = self.detector.detect(bgr_image)

        if faces is None or len(faces) == 0:
            return []

        results = []
        for face in faces:
            x, y, fw, fh = int(face[0]), int(face[1]), int(face[2]), int(face[3])
            score = float(face[-1])
            results.append({"bbox": [x, y, fw, fh], "score": score})
        return results

    def preprocess_face(self, bgr_crop: np.ndarray) -> np.ndarray:
        """Preprocesses face crop: 160x160, RGB, (x - 127.5)/128.0, NCHW float32."""
        resized = cv2.resize(bgr_crop, (160, 160), interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32)
        normalized = (rgb - 127.5) / 128.0
        chw = np.transpose(normalized, (2, 0, 1))
        return np.expand_dims(chw, axis=0).astype(np.float32)

    def extract_embedding(self, image_input: str) -> Optional[Dict[str, Any]]:
        """Extracts 512D L2-normalized FaceNet embedding."""
        img = self.decode_image(image_input)
        if img is None:
            return None

        h, w = img.shape[:2]
        target_crop = img
        face_detected = False
        face_confidence = 1.0

        if self.detector is not None:
            faces = self.detect_faces(img)
            if len(faces) > 0:
                face_detected = True
                best_face = max(faces, key=lambda f: f["score"] * (f["bbox"][2] * f["bbox"][3]))
                face_confidence = best_face["score"]
                x, y, fw, fh = best_face["bbox"]

                # 15% margin around face
                margin_x = int(fw * 0.15)
                margin_y = int(fh * 0.15)
                x1 = max(0, x - margin_x)
                y1 = max(0, y - margin_y)
                x2 = min(w, x + fw + margin_x)
                y2 = min(h, y + fh + margin_y)

                if x2 > x1 and y2 > y1:
                    target_crop = img[y1:y2, x1:x2]

        blob = self.preprocess_face(target_crop)
        raw_output = self.facenet_session.run([self.output_name], {self.input_name: blob})[0]

        # L2-normalization
        norm = np.linalg.norm(raw_output)
        normalized = (raw_output / norm)[0] if norm > 0 else raw_output[0]

        return {
            "embedding": normalized.tolist(),
            "face_detected": face_detected,
            "confidence": float(face_confidence)
        }


def main():
    parser = argparse.ArgumentParser(description="FaceNet Biometric Feature Extractor")
    parser.add_argument("--batch", action="store_true", help="Process batch of images from JSON on stdin")
    parser.add_argument("--single", action="store_true", help="Process single image from JSON on stdin")
    args = parser.parse_args()

    engine = FaceNetEngine()

    try:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input)

        if args.batch or isinstance(data, list):
            # Batch of up to 5 photos
            images = data if isinstance(data, list) else data.get("images", [])
            valid_embeddings = []

            for img_str in images:
                res = engine.extract_embedding(img_str)
                if res and res.get("embedding"):
                    valid_embeddings.append(res["embedding"])

            if not valid_embeddings:
                print(json.dumps({"success": False, "error": "No valid faces detected in provided photos"}))
                return

            # Compute normalized centroid / average vector across photos
            arr = np.array(valid_embeddings, dtype=np.float32)
            avg_vec = np.mean(arr, axis=0)
            norm = np.linalg.norm(avg_vec)
            if norm > 0:
                avg_vec = avg_vec / norm

            print(json.dumps({
                "success": True,
                "dimension": 512,
                "embedding": avg_vec.tolist(),
                "individual_embeddings": valid_embeddings,
                "processed_count": len(valid_embeddings)
            }))

        else:
            # Single image verification
            img_str = data.get("image", "") if isinstance(data, dict) else str(data)
            res = engine.extract_embedding(img_str)

            if not res or not res.get("embedding"):
                print(json.dumps({"success": False, "error": "Could not detect or extract face from image"}))
                return

            print(json.dumps({
                "success": True,
                "dimension": 512,
                "embedding": res["embedding"],
                "face_detected": res["face_detected"],
                "confidence": res["confidence"]
            }))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))


if __name__ == "__main__":
    main()
