import 'package:flutter/material.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:smartsecuerity2/entry_point.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';


class QRViewExample extends StatefulWidget {
  const QRViewExample({Key? key}) : super(key: key);

  @override
  State<StatefulWidget> createState() => _QRViewExampleState();
}

class _QRViewExampleState extends State<QRViewExample> {
  final GlobalKey _qrKey = GlobalKey(debugLabel: 'QR');
  Barcode? _result;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('QR Code Scanner'),
      ),
      body: Column(
        children: <Widget>[
          Expanded(
            flex: 1,
            child: QRView(
              key: _qrKey,
              onQRViewCreated: _onQRViewCreated,
            ),
          ),
          Expanded(
            flex: 1,
            child: Center(
                  child: (_result != null && _result!.code != null)
                            ? ElevatedButton(
                            onPressed: () {
                            _CheckOut(_result!.code!,context); // Use the null-aware operator to safely access the value
                            },
                  child: Text('Checkout: ${_result!.code}'),
                    )
    : Text('Scanning...'),
            ),
          )
        ],
      ),
    );
  }

  void _onQRViewCreated(QRViewController controller) {

     controller.scannedDataStream.listen((scanData) {
      setState(() {
        _result = scanData;
      });
    }); 
  }

/*   Future<void> _CheckOut(String url) async {

   //var qrcode = url.substring(42);
   var qrcode = url;

  final response = await http.post(
  Uri.parse('http://192.168.21.36:7000/wayinout/Checkout'),
  headers: {
    'Content-Type': 'application/json',
  },
  body: jsonEncode({'QR_Code': qrcode,'su_id':1,'remarks':'-'}),
  );


  if (response.statusCode == 200) {
     Navigator.push(
     context,
     MaterialPageRoute(builder: (context) => EntryPoint()), // Replace NextScreen with the screen you want to navigate to
     );
  }


  } */

 Future<void> _CheckOut(String url, BuildContext context) async {
  //var qrcode = url.substring(42);
  var qrcode = url;

  if(qrcode.length > 12)
  {
    qrcode = qrcode.substring(52);
  }
  

  final response = await http.post(
    Uri.parse('http://192.168.21.36:7000/wayinout/Checkout'),
    headers: {
      'Content-Type': 'application/json',
    },
    body: jsonEncode({'QR_Code': qrcode, 'su_id': 1, 'remarks': '-'}),
  );

  if (response.statusCode == 200) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => EntryPoint()), // Replace EntryPoint with the screen you want to navigate to
    );
  } else {
    // Show dialog if response error
    showDialog(
      context: context,
      builder: (BuildContext context) {
      String errorMessage = 'Unknown error'; // Default error message

      // Check if the response has an error message
      if (response.body != null && response.body.isNotEmpty) {
        // Use response body or other structure to get error message
        errorMessage = response.body; // Example: assuming response body contains error message
      }
        return AlertDialog(
          title: Text('แจ้งเตือน'),
          content: Text(errorMessage),
          actions: <Widget>[
            TextButton(
              child: Text('OK'),
              onPressed: () {
                Navigator.of(context).pop(); // Dismiss the dialog
              },
            ),
          ],
        );
      },
    );
  }
}




  @override
  void dispose() {
    super.dispose();
  }
}