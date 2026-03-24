import 'package:flutter/material.dart';

class TextFields extends StatelessWidget {
  final controller;
  final String hinttext;
  final bool obscure;

  const TextFields({
    super.key,
    required this.controller,
    required this.hinttext,
    required this.obscure,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      decoration: InputDecoration(
        filled: true,
        hintText: hinttext,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: const Color.fromRGBO(37, 30, 163, 1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: BorderSide(color: Colors.white),
        ),
        fillColor: const Color.fromARGB(207, 255, 255, 255),
      ),
    );
  }
}
