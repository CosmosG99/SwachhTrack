import 'package:flutter/material.dart';
import 'package:swacchtrack/Pages/home.dart';
import 'package:swacchtrack/Pages/maps.dart';
import 'package:swacchtrack/Pages/profile.dart';
import 'package:swacchtrack/Pages/tasks.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int currentIndex = 0;
  List Pages = [Home(), MapsPage(), ProofOfWorkPage(), Profile()];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Scaffold(
        body: Pages[currentIndex],
        bottomNavigationBar: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 20),
          child: Container(
            height: 70,
            decoration: BoxDecoration(
              color: Color.fromRGBO(37, 30, 163, 0.76),
              borderRadius: BorderRadius.circular(20),
            ),

            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                SizedBox(
                  height: 50,
                  width: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {
                        currentIndex = 0;
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: currentIndex == 0
                          ? const Color.fromARGB(253, 12, 12, 12)
                          : Color.fromRGBO(229, 229, 235, 1),
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadiusGeometry.circular(10),
                        side: BorderSide(
                          color: Color.fromRGBO(229, 229, 235, 1),
                        ),
                      ),
                    ),
                    child: Center(child: Icon(Icons.home, size: 25)),
                  ),
                ),

                SizedBox(
                  height: 50,
                  width: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {
                        currentIndex = 1;
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: currentIndex == 1
                          ? const Color.fromARGB(253, 12, 12, 12)
                          : Color.fromRGBO(229, 229, 235, 1),
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadiusGeometry.circular(10),
                        side: BorderSide(
                          color: Color.fromRGBO(229, 229, 235, 1),
                        ),
                      ),
                    ),
                    child: Center(child: Icon(Icons.map, size: 25)),
                  ),
                ),

                SizedBox(
                  height: 50,
                  width: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {
                        currentIndex = 2;
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: currentIndex == 2
                          ? const Color.fromARGB(253, 12, 12, 12)
                          : Color.fromRGBO(229, 229, 235, 1),
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadiusGeometry.circular(10),
                        side: BorderSide(
                          color: Color.fromRGBO(229, 229, 235, 1),
                        ),
                      ),
                    ),
                    child: Center(child: Icon(Icons.task, size: 25)),
                  ),
                ),

                SizedBox(
                  height: 50,
                  width: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {
                        currentIndex = 3;
                      });
                    },
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      backgroundColor: currentIndex == 3
                          ? const Color.fromARGB(253, 12, 12, 12)
                          : Color.fromRGBO(229, 229, 235, 1),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadiusGeometry.circular(10),
                        side: BorderSide(
                          color: Color.fromRGBO(229, 229, 235, 1),
                        ),
                      ),
                    ),
                    child: Center(
                      child: Icon(Icons.account_box_rounded, size: 25),
                    ),
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
