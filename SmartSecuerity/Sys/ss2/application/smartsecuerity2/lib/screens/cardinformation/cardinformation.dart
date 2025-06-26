import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../print_sunny/sunmi.dart';
import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/services.dart';

class CreditCardsPage extends StatelessWidget {
@override
Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Visit Details'),
      ),
      body: SingleChildScrollView(
        child: Container(
          padding: const EdgeInsets.all(8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _buildCreditCard(
                  color: Color(0xFF090943),
                  cardExpiration: "08/2022",
                  cardHolder: "HOUSSEM SELMI",
                  cardNumber: "Veerapat Somkum"),
              SizedBox(
                height: 15,
              ),
              _buildCreditCard(
                  color: Color(0xFF000000),
                  cardExpiration: "05/2024",
                  cardHolder: "HOUSSEM SELMI",
                  cardNumber: "Montri Pukkaew"),
              _buildAddCardButton(
                icon: Icon(Icons.print),
                color: Color.fromARGB(255, 255, 255, 255),
                context: context,
              )
            ],
          ),
        ),
      ),
    );
  }

Column _buildTitleSection({required String title, required String subTitle}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.only(left: 8.0, top: 16.0),
          child: Text(
            '$title',
            style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(left: 8.0, bottom: 16.0),
          child: Text(
            '$subTitle',
            style: TextStyle(fontSize: 21, color: Colors.white),
          ),
        )
      ],
    );
  }

Card _buildCreditCard(
      {required Color color,
      required String cardNumber,
      required String cardHolder,
      required String cardExpiration}) {
    return Card(
      elevation: 4.0,
      color: color,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      child: Container(
        height: 200,
        padding: const EdgeInsets.only(left: 16.0, right: 16.0, bottom: 22.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            //_buildLogosBlock(),
            Padding(
              padding: const EdgeInsets.only(top: 16.0),
              child: Text(
                '$cardNumber',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 21,
                    fontFamily: 'CourierPrime'),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: <Widget>[
                _buildDetailsBlock(
                  label: 'CARDHOLDER',
                  value: cardHolder,
                ),
                _buildDetailsBlock(label: 'VALID THRU', value: cardExpiration),
              ],
            ),
          ],
        ),
      ),
    );
  }

Row _buildLogosBlock() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: <Widget>[
        Image.asset(
          "assets/images/contact_less.png",
          height: 20,
          width: 18,
        ),
        Image.asset(
          "assets/images/mastercard.png",
          height: 50,
          width: 50,
        ),
      ],
    );
  }

Column _buildDetailsBlock({required String label, required String value}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          '$label',
          style: TextStyle(
              color: Colors.grey, fontSize: 9, fontWeight: FontWeight.bold),
        ),
        Text(
          '$value',
          style: TextStyle(
              color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
        )
      ],
    );
  }

Container _buildAddCardButton({
  required Icon icon,
  required Color color,
  required BuildContext context,
}) {
  return Container(
    margin: const EdgeInsets.only(top: 24.0),
    alignment: Alignment.center,
    child: FloatingActionButton(
      elevation: 2.0,
      onPressed: () async {
          Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => PrintSunnyApp(
            QR_Code: 'วีรภัทร สมคำ', 
          )),
        );
      },
      backgroundColor: Colors.greenAccent, // Use the provided color
      foregroundColor: Colors.white,
      mini: false,
      child: icon,
    ),
  );
}
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations(
      [DeviceOrientation.landscapeRight, DeviceOrientation.landscapeRight]);
  runApp(MaterialApp(
    home: CreditCardsPage(),
  ));
}

