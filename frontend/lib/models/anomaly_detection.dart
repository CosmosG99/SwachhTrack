import 'dart:convert';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class HelmetVerifyPage extends StatefulWidget {
  const HelmetVerifyPage({super.key});

  @override
  State<HelmetVerifyPage> createState() => _HelmetVerifyPageState();
}

class _HelmetVerifyPageState extends State<HelmetVerifyPage> {
  CameraController? controller;

  bool cameraReady = false;
  bool isSending = false;

  String status = "Idle";
  String facesCount = "";

  /// CHANGE THIS TO YOUR PC IP
  final String apiUrl = "http://100.109.17.44:8000/verify";

  @override
  void initState() {
    super.initState();
    initCamera();
  }

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }

  Future<void> initCamera() async {
    final cameras = await availableCameras();

    controller = CameraController(
      cameras[0],
      ResolutionPreset.medium,
      enableAudio: false,
    );

    await controller!.initialize();

    setState(() {
      cameraReady = true;
    });
  }

  Future<void> captureAndSend() async {
    if (isSending) return;

    try {
      setState(() {
        isSending = true;
        status = "Capturing image...";
      });

      final image = await controller!.takePicture();

      await sendToServer(File(image.path));
    } catch (e) {
      setState(() {
        status = "Capture error: $e";
      });
    } finally {
      setState(() {
        isSending = false;
      });
    }
  }

  Future<void> sendToServer(File imageFile) async {
    try {
      setState(() {
        status = "Sending to server...";
      });

      var request = http.MultipartRequest("POST", Uri.parse(apiUrl));

      request.files.add(
        await http.MultipartFile.fromPath("file", imageFile.path),
      );

      var response = await request.send();

      if (response.statusCode == 200) {
        final respString = await response.stream.bytesToString();

        final data = jsonDecode(respString);

        if (data["success"] == true) {
          setState(() {
            status = data["message"];
            facesCount = data["faces_count"].toString();
          });
        } else {
          setState(() {
            status = data["message"] ?? data["error"];
          });
        }
      } else {
        setState(() {
          status = "Server error ${response.statusCode}";
        });
      }
    } catch (e) {
      setState(() {
        status = "Network error: $e";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Helmet / Face Verify")),
      body: cameraReady
          ? Column(
              children: [
                Expanded(child: CameraPreview(controller!)),

                const SizedBox(height: 10),

                Text(
                  status,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                Text(
                  "Faces detected: $facesCount",
                  style: const TextStyle(fontSize: 18),
                ),

                const SizedBox(height: 20),

                ElevatedButton(
                  onPressed: captureAndSend,
                  child: const Text("Capture & Verify"),
                ),

                const SizedBox(height: 20),
              ],
            )
          : const Center(child: CircularProgressIndicator()),
    );
  }
}
