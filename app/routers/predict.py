from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import cv2, numpy as np, joblib, pathlib
from app.utils.preprocess import extract_landmarks

ROOT = pathlib.Path(__file__).resolve().parents[2]
MODEL = joblib.load(ROOT / "app" / "models" / "lgbm.pkl")

router = APIRouter(prefix="/predict", tags=["predict"])

@router.post("/predict")
async def predict_gesture(file: UploadFile = File(...)):
    try:
        if file.content_type not in ("image/jpeg", "image/png"):
            raise HTTPException(400, "File must be an image (JPEG/PNG)")

        img_bytes = await file.read()
        img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Could not decode image")

        print("[INFO] Image shape:", img.shape)

        feats = extract_landmarks(img)
        if feats is None:
            raise HTTPException(status_code=422, detail="No hand detected – please try again")

        print("[INFO] Feature vector:", feats.shape)

        pred = MODEL.predict([feats])[0]
        return JSONResponse({"class": str(pred)})

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Internal Server Error: {e}")