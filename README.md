TO RUN THE YOLO MODEL FOR HELMET DETECTION AND ATTENDANCE
To run your SwachhTrack AI model and the FastAPI server reliably for your PCCE project demo, you need a specific set of Python libraries and a few system-level configurations.

Since you are running this on Windows (as seen in your terminal), follow this checklist to ensure everything is "production-ready."

1. Python Environment Requirements
You should use Python 3.10 or 3.11. You can check your version by running python --version.

Install these core libraries via your terminal:

PowerShell
# Core API and Server
pip install fastapi uvicorn python-multipart

# Computer Vision and Math
pip install opencv-python numpy

# Only if you plan to use the YOLOv8 model in your folder
pip install ultralytics
2. File & Folder Requirements
Based on your folder structure, ensure these files are in the same directory as your main.py:

haarcascade_frontalface_default.xml (OpenCV usually handles this, but having the file locally is safer for demos).

FaceModel_lbph.yml or FaceModel.pkl (Your trained face data).

yolov8n.pt (If you are switching to YOLO detection).

3. Hardware & Network Requirements
Camera: A standard 720p or 1080p USB webcam.

Networking (For Flutter): * Your laptop and your phone must be on the same Wi-Fi network.

Firewall: You must allow Python through the Windows Firewall, or the "200 OK" you saw in Postman will turn into a "Connection Timed Out" on your phone.

4. The requirements.txt File
It is a best practice for Computer Engineering projects to include a requirements.txt file. This allows your teammates or examiners to install everything in one go.

Create a file named requirements.txt in your anomaly-detection folder and paste this:

Plaintext
fastapi==0.109.0
uvicorn==0.27.0
python-multipart==0.0.6
opencv-python==4.9.0.80
numpy==1.26.3
ultralytics==8.1.0
To install from this file later, anyone can just run: pip install -r requirements.txt.

5. Deployment Command
To keep the server alive and auto-update when you change the code, always run it with the --reload flag:

PowerShell
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
Note: Using --host 0.0.0.0 is what allows your Flutter app to find the server. If you use 127.0.0.1, only Postman on the same computer can talk to it.
