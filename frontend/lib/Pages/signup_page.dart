import 'package:flutter/material.dart';

class SignupPage extends StatelessWidget {
  const SignupPage({super.key});

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: SafeArea(
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
                child: Icon(Icons.admin_panel_settings, size: 130, color: Colors.white70),
              ),

              Positioned(
                top: MediaQuery.sizeOf(context).height / 2 - 40,
                left: 30,
                right: 30,
                child: Column(
                  children: [
                    Text(
                      "Registration is managed\nby your administrator",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),

                    SizedBox(height: 20),

                    Text(
                      "Please contact your supervisor to get your Employee ID and password for login.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white70,
                      ),
                    ),

                    SizedBox(height: 40),

                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: Icon(Icons.arrow_back),
                        label: Text(
                          "Back to Login",
                          style: TextStyle(fontSize: 18),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(15),
                            side: BorderSide(
                              color: const Color.fromARGB(181, 255, 255, 255),
                            ),
                          ),
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
    );
  }
}
