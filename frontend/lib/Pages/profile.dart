import 'package:flutter/material.dart';

class Profile extends StatelessWidget {
  const Profile({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsetsGeometry.all(20),
      child: Column(
        children: [
          Container(
            height: 70,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Color.fromRGBO(51, 45, 152, 0.715),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Text(
                  "User",
                  style: TextStyle(fontSize: 24, color: Colors.black),
                ),

                Text("user@123"),
              ],
            ),
          ),

          SizedBox(height: 30),

          Container(
            height: 70,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Color.fromRGBO(51, 45, 152, 0.715),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Text(
                  "Name",
                  style: TextStyle(fontSize: 24, color: Colors.black),
                ),

                Text("xxxx"),
              ],
            ),
          ),

          SizedBox(height: 30),

          Container(
            height: 70,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Color.fromRGBO(51, 45, 152, 0.715),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Text(
                  "additonal",
                  style: TextStyle(fontSize: 24, color: Colors.black),
                ),

                Text("xxxxx"),
              ],
            ),
          ),

          SizedBox(height: 300),

          SizedBox(
            height: 60,
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color.fromARGB(255, 193, 33, 21),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadiusGeometry.circular(15),
                ),
              ),
              child: Text(
                "Check Out",
                style: TextStyle(color: Colors.black, fontSize: 24),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
