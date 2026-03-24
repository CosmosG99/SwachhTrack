import 'package:flutter/material.dart';
import 'package:swacchtrack/Util/buttons.dart';
import 'package:swacchtrack/Util/textfields.dart';

class SignupPage extends StatefulWidget {
  const SignupPage({super.key});

  @override
  State<SignupPage> createState() => _LoginState();
}

class _LoginState extends State<SignupPage> {
  final userController = TextEditingController();
  final passwordController = TextEditingController();

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
                  alignment: AlignmentGeometry.xy(0, -0.5),
                  child: Icon(Icons.lock, size: 130),
                ),

                Positioned(
                  top: MediaQuery.sizeOf(context).height / 2 - 100,
                  left: 20,
                  right: 20,
                  child: Column(
                    children: [
                      TextFields(
                        controller: userController,
                        hinttext: "Enter Username here...",
                        obscure: false,
                      ),

                      SizedBox(height: 15),

                      TextFields(
                        controller: passwordController,
                        hinttext: "Enter password here",
                        obscure: true,
                      ),

                      SizedBox(height: 20),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          RoleSelect(onpressed: () {}, role: "engineer"),
                          RoleSelect(onpressed: () {}, role: "supervisor"),
                        ],
                      ),

                      SizedBox(height: 40),

                      Buttons(onPressed: () {}, buttonText: "Register"),
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
