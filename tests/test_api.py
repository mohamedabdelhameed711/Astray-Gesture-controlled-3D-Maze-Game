from fastapi.testclient import TestClient
from app.main import app
import cv2, numpy as np

client = TestClient(app)

def test_predict_route():
    dummy = np.zeros((64, 64, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", dummy)
    resp = client.post("/predict/predict", files={"file": ("x.jpg", buf.tobytes(), "image/jpeg")})
    assert resp.status_code == 200
    assert "class" in resp.json()