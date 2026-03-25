import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:swacchtrack/utils/language_provider.dart';

class QrScannerPage extends StatefulWidget {
  const QrScannerPage({super.key});

  @override
  State<QrScannerPage> createState() => _QrScannerPageState();
}

class _QrScannerPageState extends State<QrScannerPage> {
  final MobileScannerController controller = MobileScannerController(
    autoStart: true,
  );

  String scannedData = "";

  @override
  void initState() {
    super.initState();
    scannedData = t('point_camera');
  }

  bool _hasScanned = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasScanned) return; // prevent multiple scans

    final barcode = capture.barcodes.first;

    if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
      _hasScanned = true;

      setState(() {
        scannedData = barcode.rawValue!;
      });

      // Show confirmation dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: Text(t('qr_scanned')),
          content: Text("${t('use_qr_checkin')}\n\n${t('data_label')} ${barcode.rawValue}"),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx); // close dialog
                setState(() => _hasScanned = false); // allow re-scan
              },
              child: Text(t('scan_again')),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx); // close dialog
                Navigator.pop(context, barcode.rawValue); // return QR data to caller
              },
              child: Text(t('check_in_btn')),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(t('scan_attendance_qr')),
        backgroundColor: const Color.fromRGBO(37, 30, 163, 1),
      ),
      body: Column(
        children: [
          Expanded(
            child: MobileScanner(controller: controller, onDetect: _onDetect),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              scannedData,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}
