import 'package:flutter/material.dart';
import 'package:swacchtrack/Pages/homepage.dart';
import 'package:swacchtrack/Pages/login_page.dart';
import 'package:swacchtrack/services/api_service.dart';
import 'package:swacchtrack/services/location_services.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await LocationService.initialize();
  } catch (e) {
    print('[GPS] LocationService init failed: $e');
  }

  // Check if user is already logged in
  final isLoggedIn = await ApiService.isLoggedIn();

  runApp(MyApp(isLoggedIn: isLoggedIn));
}

class MyApp extends StatelessWidget {
  final bool isLoggedIn;

  const MyApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: isLoggedIn ? const HomePage() : const Login(),
    );
  }
}
