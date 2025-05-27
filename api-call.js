import * as tf from "@tensorflow/tfjs"; // Ensure tf is loaded

// ✅ Replace with your actual FastAPI backend URL
const API_URL = "http://localhost:8000/predict/predict";

// ✅ Gesture class → maze direction map
const GESTURE_TO_DIRECTION = {
  one: "up",
  fist: "down",
  two: "left",
  three: "right"
};

// ⏱️ Throttle control
let lastPredictionTime = 0;
const PREDICTION_INTERVAL = 1000; // milliseconds

/**
 * 🔁 Called each time a frame is ready — safely throttles calls
 * @param {tf.Tensor3D} processed_t - A [H,W,3] image tensor
 */
export async function maybePredictGesture(processed_t) {
  const now = Date.now();
  if (now - lastPredictionTime < PREDICTION_INTERVAL) {
    tf.dispose(processed_t);
    return; // ⏳ Skip if too soon
  }

  lastPredictionTime = now;
  const direction = await getPredictedLabel(processed_t);
  if (direction) {
    console.log("🧭 Move:", direction);
    // Trigger the corresponding arrow key event
    triggerArrowKey("keydown", direction);
    setTimeout(() => {
      triggerArrowKey("keyup", direction);
    }, 100);
  }
}

/**
 * 🧠 Sends image tensor to FastAPI, gets predicted class, and maps to direction
 * @param {tf.Tensor3D} processed_t - RGB image [H,W,3]
 * @returns {"up" | "down" | "left" | "right" | null}
 */
export async function getPredictedLabel(processed_t) {
  try {
    // Convert tensor to array
    const landmarksArray = await processed_t.array();
    
    // Send landmarks to backend
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ landmarks: landmarksArray })
    });

    if (!resp.ok) {
      console.warn("⚠️ API Error:", await resp.text());
      return null;
    }

    const { class: rawGesture } = await resp.json();
    console.log("🎯 Backend prediction:", rawGesture);

    return GESTURE_TO_DIRECTION[rawGesture] ?? null;

  } catch (err) {
    console.error("❌ getPredictedLabel() error:", err);
    return null;

  } finally {
    tf.dispose(processed_t); // ✅ Always clean up
  }
}
