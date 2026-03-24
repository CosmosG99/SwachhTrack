import 'dart:io';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;

class ProofOfWorkPage extends StatefulWidget {
  const ProofOfWorkPage({super.key});

  @override
  State<ProofOfWorkPage> createState() => _ProofOfWorkPageState();
}

class _ProofOfWorkPageState extends State<ProofOfWorkPage>
    with AutomaticKeepAliveClientMixin {
  final ImagePicker _picker = ImagePicker();

  List<File> images = [];

  @override
  bool get wantKeepAlive => true;

  /*
  -----------------------------
  TAKE PICTURE
  -----------------------------
  */

  Future<void> takePicture() async {
    final XFile? photo = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 70,
    );

    if (photo == null) return;

    final directory = await getApplicationDocumentsDirectory();

    final String newPath =
        '${directory.path}/${DateTime.now().millisecondsSinceEpoch}.jpg';

    final File newImage = await File(photo.path).copy(newPath);

    setState(() {
      images.add(newImage);
    });
  }

  /*
  -----------------------------
  REMOVE IMAGE
  -----------------------------
  */

  Future<void> removeImage(int index) async {
    await images[index].delete();

    setState(() {
      images.removeAt(index);
    });
  }

  /*
  -----------------------------
  CONVERT TO BASE64
  -----------------------------
  */

  Future<List<String>> convertImagesToBase64() async {
    List<String> base64Images = [];

    for (File image in images) {
      List<int> bytes = await image.readAsBytes();

      String base64String = base64Encode(bytes);

      base64Images.add(base64String);
    }

    return base64Images;
  }

  /*
  -----------------------------
  SEND PROOF
  -----------------------------
  */

  Future<void> sendProof() async {
    if (images.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Add at least one photo")));
      return;
    }

    try {
      /*
      Convert images
      */

      List<String> base64Images = await convertImagesToBase64();

      print("Converted ${base64Images.length} images");

      /*
      Send to backend
      */

      final response = await http.post(
        Uri.parse("http://100.109.17.44:3000/upload"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"images": base64Images}),
      );

      /*
      Success
      */

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Proof sent successfully")),
        );

        /*
        Optional: clear images after send
        */

        setState(() {
          images.clear();
        });
      }
      /*
      Failure
      */
      else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Failed to send proof: ${response.statusCode}"),
          ),
        );
      }
    } catch (e) {
      print("Error sending proof: $e");

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Error sending proof")));
    }
  }

  /*
  -----------------------------
  UI
  -----------------------------
  */

  @override
  Widget build(BuildContext context) {
    super.build(context);

    return Padding(
      padding: const EdgeInsets.all(15),
      child: Column(
        children: [
          Expanded(
            child: images.isEmpty
                ? const Center(
                    child: Text(
                      "No proof uploaded yet",
                      style: TextStyle(fontSize: 16),
                    ),
                  )
                : GridView.builder(
                    itemCount: images.length,
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                        ),
                    itemBuilder: (context, index) {
                      return Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.file(
                              images[index],
                              fit: BoxFit.cover,
                              width: double.infinity,
                              height: double.infinity,
                            ),
                          ),
                          Positioned(
                            top: 5,
                            right: 5,
                            child: GestureDetector(
                              onTap: () => removeImage(index),
                              child: Container(
                                decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                                padding: const EdgeInsets.all(6),
                                child: const Icon(
                                  Icons.close,
                                  color: Colors.white,
                                  size: 18,
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),

          const SizedBox(height: 10),

          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 55,
                  child: ElevatedButton.icon(
                    onPressed: takePicture,
                    icon: const Icon(Icons.camera_alt),
                    label: const Text("Add Proof"),
                  ),
                ),
              ),

              const SizedBox(width: 10),

              Expanded(
                child: SizedBox(
                  height: 55,
                  child: ElevatedButton.icon(
                    onPressed: sendProof,
                    icon: const Icon(Icons.send),
                    label: const Text("Send"),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
