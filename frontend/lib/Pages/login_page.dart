import 'package:flutter/material.dart';
import 'package:maps/Util/buttons.dart';
import 'package:maps/Util/text_field.dart';

class Login extends StatefulWidget {
  const Login({super.key});

  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
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

                      SizedBox(height: 10),

                      SizedBox(
                        width: MediaQuery.sizeOf(context).width,
                        child: Text(
                          "Forgot Password?",
                          textAlign: TextAlign.right,
                        ),
                      ),

                      SizedBox(height: 20),

                      Buttons(onPressed: () {}, buttonText: "Login"),

                      SizedBox(height: 20),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Expanded(child: Divider(color: Colors.black45)),

                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 5),
                            child: Text("or"),
                          ),

                          Expanded(child: Divider(color: Colors.black45)),
                        ],
                      ),

                      SizedBox(height: 20),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,

                        children: [
                          GoogleLoginButton(
                            onpressed: () {},
                            buttonType: "google",
                          ),
                          SizedBox(width: 10),
                          GoogleLoginButton(
                            onpressed: () {},
                            buttonType: "mac",
                          ),
                        ],
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
