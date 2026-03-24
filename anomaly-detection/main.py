from fastapi import FastAPI, UploadFile, File
import cv2
import numpy as np

app = FastAPI()

@app.post("/verify")
async def verify_helmet(file: UploadFile = File(...)):
    try:
        # 1. Read the file bytes
        contents = await file.read()
        
        # 2. Check if we actually got data
        if not contents:
            return {"success": False, "error": "No data received from file upload"}

        # 3. Convert to numpy array
        nparr = np.frombuffer(contents, np.uint8)
        
        # 4. Decode the image - THIS IS WHERE IT WAS FAILING
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Safety check: If imdecode fails, img will be None
        if img is None:
            return {"success": False, "error": "Could not decode image. Ensure you are uploading a valid JPG/PNG."}

        # --- Your Face Detection Logic ---
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) == 0:
            return {"success": False, "message": "No face detected"}

        # Return a simple success to test the endpoint first
        return {"success": True, "message": "Image received and face found!", "faces_count": len(faces)}

    except Exception as e:
        return {"success": False, "error": str(e)}