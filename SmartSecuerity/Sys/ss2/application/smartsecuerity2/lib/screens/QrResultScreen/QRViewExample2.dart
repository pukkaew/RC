import 'package:flutter/material.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';

class QRViewExample2 extends StatefulWidget {
  @override
  State<StatefulWidget> createState() => _QRViewExample2State();
}

class _QRViewExample2State extends State<QRViewExample2> {
  final GlobalKey _qrKey = GlobalKey(debugLabel: 'QR');
  Barcode? _result;

/*   @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Scan QR Code')),
      body: Column(
        children: <Widget>[
          Expanded(
            flex: 5,
            child: QRView(
              key: qrKey,
              onQRViewCreated: _onQRViewCreated,
            ),
          ),
        ],
      ),
    );
  } */

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
                            _CheckOut(_result!.code!); // Use the null-aware operator to safely access the value
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

    Future<void> _CheckOut(String url) async {

   //var qrcode = url.substring(42);
   var qrcode = url;

  Navigator.pop(context, qrcode);

  }

  @override
  void dispose() {
    super.dispose();
  }
}