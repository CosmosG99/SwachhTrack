import 'package:flutter/material.dart';
import 'package:swacchtrack/Pages/homepage.dart';
import 'package:swacchtrack/Pages/signup_page.dart';
import 'package:swacchtrack/Util/buttons.dart';
import 'package:swacchtrack/Util/textfields.dart';
import 'package:swacchtrack/services/api_service.dart';

class Login extends StatefulWidget {
  const Login({super.key});

  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
  final employeeIdController = TextEditingController();
  final passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _handleLogin() async {
    final employeeId = employeeIdController.text.trim();
    final password = passwordController.text.trim();

    if (employeeId.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter Employee ID and password')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      await ApiService.login(employeeId, password);

      if (!mounted) return;

      // Navigate to HomePage and remove Login from the stack
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomePage()),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connection error. Please try again.')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: SingleChildScrollView(
          child: SizedBox(
            height: height,
            child: Stack(
              children: [
                Container(
                  height: height,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color.fromRGBO(15, 15, 15, 1),
                        Color.fromRGBO(37, 30, 163, 1),
                        Color.fromRGBO(199, 199, 241, 1),
                      ],
                      stops: [0.0, 0.4, 1.0],
                    ),
                  ),
                ),

                Align(
                  alignment: AlignmentGeometry.xy(0, -0.3),
                  child: Icon(Icons.lock, size: 130),
                ),

                Positioned(
                  top: MediaQuery.sizeOf(context).height / 2 + 10,
                  left: 20,
                  right: 20,
                  child: Column(
                    children: [
                      TextFields(
                        controller: employeeIdController,
                        hinttext: "Enter Employee ID...",
                        obscure: false,
                      ),

                      SizedBox(height: 15),

                      TextFields(
                        controller: passwordController,
                        hinttext: "Enter password here",
                        obscure: true,
                      ),

                      SizedBox(height: 10),

                      SizedBox(
                        width: MediaQuery.sizeOf(context).width,
                        child: Text(
                          "Forgot Password?",
                          textAlign: TextAlign.right,
                        ),
                      ),

                      SizedBox(height: 20),

                      // Show spinner while loading, otherwise show Login button
                      _isLoading
                          ? const CircularProgressIndicator(
                              color: Colors.white,
                            )
                          : Buttons(
                              onPressed: _handleLogin,
                              buttonText: "Login",
                            ),

                      SizedBox(height: 30),

                      GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => SignupPage(),
                            ),
                          );
                        },
                        child: SizedBox(
                          width: MediaQuery.sizeOf(context).width,
                          child: Text(
                            "Register new account",
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
