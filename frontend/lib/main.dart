import 'package:flutter/material.dart';
import 'package:swacchtrack/Pages/homepage.dart';
import 'package:swacchtrack/services/location_services.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await LocationService.initialize();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: HomePage(),
    );
  }
}
