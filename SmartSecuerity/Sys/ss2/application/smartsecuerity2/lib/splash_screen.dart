import 'package:flutter/material.dart';
import 'package:smartsecuerity2/screens/authen_screen.dart';

class SplashScreen extends StatefulWidget {
  @override
  _SplashScreenState createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Delay for 3 seconds, then navigate to main screen
    Future.delayed(Duration(seconds: 3), () {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => MyApp()), // Replace MainScreen with your main screen widget
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Image.asset(  "assets/images/LOGO_RUXCHAI_COLD_STORAGE.png", width: 350,), // Replace with your image path
      ),
    );
  }
}