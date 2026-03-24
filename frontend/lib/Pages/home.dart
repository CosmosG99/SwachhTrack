import 'package:flutter/material.dart';
import 'package:swacchtrack/Pages/qrScan.dart';
import 'package:swacchtrack/services/location_services.dart';

class Home extends StatefulWidget {
  const Home({super.key});

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  bool checkInStatus = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
      child: Column(
        children: [
          const SizedBox(height: 20),

          /// START GPS
          SizedBox(
            height: 70,
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                if (!checkInStatus) {
                  try {
                    await LocationService.start();
                    setState(() {
                      checkInStatus = true;
                    });
                  } catch (e) {
                    print('[GPS] Check-in error: $e');
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: checkInStatus
                    ? const Color.fromRGBO(86, 85, 91, 0.744)
                    : Colors.green,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
              ),
              child: const Text(
                "GPS Check In",
                style: TextStyle(fontSize: 24, color: Colors.black),
              ),
            ),
          ),

          const SizedBox(height: 20),

          /// STOP GPS
          SizedBox(
            height: 70,
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                if (checkInStatus) {
                  LocationService.stop();

                  setState(() {
                    checkInStatus = false;
                  });
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: checkInStatus
                    ? Colors.red
                    : const Color.fromRGBO(86, 85, 91, 0.744),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
              ),
              child: const Text(
                "Check Out",
                style: TextStyle(fontSize: 24, color: Colors.black),
              ),
            ),
          ),

          const SizedBox(height: 20),

          /// SCANNER BUTTON (separate)
          SizedBox(
            height: 70,
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const QrScannerPage()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
              ),
              child: const Text(
                "Scan QR",
                style: TextStyle(fontSize: 24, color: Colors.black),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
