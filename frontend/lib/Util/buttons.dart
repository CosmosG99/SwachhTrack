import 'package:flutter/material.dart';

class Buttons extends StatelessWidget {
  final VoidCallback onPressed;
  final String buttonText;

  const Buttons({super.key, required this.onPressed, required this.buttonText});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton.icon(
        icon: Padding(
          padding: const EdgeInsetsGeometry.only(left: 25.0),
          child: Icon(Icons.lock_open_outlined, size: 30, color: Colors.white),
        ),
        onPressed: onPressed,
        label: Text(
          "Login",
          style: TextStyle(fontSize: 30, color: Colors.white),
        ),
        style: ElevatedButton.styleFrom(
          splashFactory: InkRipple.splashFactory,
          overlayColor: const Color.fromARGB(255, 194, 213, 229).withAlpha(200),
          backgroundColor: Colors.black,
          iconColor: const Color.fromARGB(153, 255, 255, 255),
          iconAlignment: IconAlignment.end,
          shape: RoundedRectangleBorder(
            side: BorderSide(color: const Color.fromARGB(181, 255, 255, 255)),
            borderRadius: BorderRadiusGeometry.circular(15),
          ),
        ),
      ),
    );
  }
}

class GoogleLoginButton extends StatelessWidget {
  final VoidCallback onpressed;
  final String buttonType;
  const GoogleLoginButton({
    super.key,
    required this.onpressed,
    required this.buttonType,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      child: ElevatedButton(
        onPressed: onpressed,
        style: ElevatedButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadiusGeometry.circular(10),
          ),
        ),
        child: buttonType == "google"
            ? Image.asset('assets/images/download.png', height: 50, width: 40)
            : Image.asset('assets/images/mac.png', height: 50, width: 40),
      ),
    );
  }
}
