import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sunmi_printer_plus/column_maker.dart';
import 'package:sunmi_printer_plus/enums.dart';
import 'package:sunmi_printer_plus/sunmi_printer_plus.dart';
import 'package:sunmi_printer_plus/sunmi_style.dart';
import 'package:esc_pos_utils/esc_pos_utils.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

void main() async {

  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations(
      [DeviceOrientation.landscapeRight, DeviceOrientation.landscapeRight]);
  runApp(PrintSunnyApp(
                  QR_Code: '-',
  ));
}

class PrintSunnyApp extends StatelessWidget {
  final String QR_Code;

  const PrintSunnyApp({
    Key? key,
    required this.QR_Code,

  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Secuerity 2',
      theme: ThemeData(primaryColor: Colors.black),
      debugShowCheckedModeBanner: false,
      home: PrintSunny(
                  QR_Code: QR_Code,
      ),
    );
  }
}

class PrintSunny extends StatefulWidget {
  final String QR_Code;


  const PrintSunny({
    Key? key,
    required this.QR_Code,

  }) : super(key: key);

  @override
  _PrintSunnyState createState() => _PrintSunnyState();
}

class _PrintSunnyState extends State<PrintSunny> {
  bool printBinded = false;
  int paperSize = 0;
  String serialNumber = "";
  String printerVersion = "";

  @override
  void initState() {
    super.initState();
    _bindingPrinter().then((bool? isBind) async {
      SunmiPrinter.paperSize().then((int size) {
        setState(() {
          paperSize = size;
        });
      });

      SunmiPrinter.printerVersion().then((String version) {
        setState(() {
          printerVersion = version;
        });
      });

      SunmiPrinter.serialNumber().then((String serial) {
        setState(() {
          serialNumber = serial;
        });
      });

      setState(() {
        printBinded = isBind!;
      });
    });
  }

  Future<bool?> _bindingPrinter() async {
    final bool? result = await SunmiPrinter.bindingPrinter();
    return result;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Print'),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const Divider(),
            const Divider(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  ElevatedButton(
                    onPressed: () async {
                        PrintQrCode(widget);
                    },
                    child: const Text('Print Check IN'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void PrintQrCode(widget) async {

//https://web.mrgshrimp.com/webapi4/wayinout/GetwayInInformation
//http://192.168.21.36:7000/wayinout/GetwayInInformation
final response = await http.post(
  Uri.parse('http://192.168.21.36:7000/wayinout/GetwayInInformation'),
  headers: {
    'Content-Type': 'application/json',
  },
  body: jsonEncode({'WI_Barcode': widget.QR_Code}),
);


if (response.statusCode == 200) {

  final List<dynamic> printResponse = json.decode(response.body).cast<dynamic>();

  if (printResponse.isNotEmpty) {

      if (printResponse[0].containsKey('WI_Barcode')) {

            dynamic VT_ID = printResponse[0]['VT_ID'];

              //Printer Work

              await SunmiPrinter.initPrinter();
              await SunmiPrinter.startTransactionPrint(true);
              await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER); 

              Uint8List byte = await _getImageFromAsset('assets/images/lego.jpg');
              await SunmiPrinter.printImage(byte);

              // Add some space between the image and the QR code
              await SunmiPrinter.printBlankLines(1); // Adjust the number of lines as needed

              // Align the QR code to the right
              await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER); 

              await SunmiPrinter.printText('บริษัท รักชัยห้องเย็น จำกัด', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('Ruxchai Cold Storage', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('ประเภทผู้มาติดต่อ : ${printResponse[0]['VT_ID']}', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              //await SunmiPrinter.printText('วัตถุประสงค์ : มาติดต่อ', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('ชื่อ-สกุล : ${printResponse[0]['WI_FullName']} ', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('เลขทะเบียน : ${printResponse[0]['WI_LicensePlate']} ', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('ทะเบียนจังหวัด : ${printResponse[0]['WI_LicenseProvince']}', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('รายละเอียด :  ${printResponse[0]['WI_Remarks']}', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('จำนวนผู้มาติดต่อ : ${printResponse[0]['WI_Follower']}', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('ยานพาหะนะ : ${printResponse[0]['WI_VehicleType']}', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('ชื่อผู้รับการติดต่อ : ${printResponse[0]['WI_ContactName']}', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('เวลาเข้า : ${printResponse[0]['WI_RecordedOn']}', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('เวลาออก : -', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));
              await SunmiPrinter.printText('หมายเหตุ : ', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.LEFT,));

              await SunmiPrinter.printText('                     ');
              await SunmiPrinter.printText('                     ');


             if (VT_ID != 'รับฝากสินค้า') {
                  await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);
                  await SunmiPrinter.printQRCode('https://smartsecurity.ruxchai.co.th/index.php?param=${printResponse[0]['WI_Barcode']}', size: 5);
                  await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);
                  await SunmiPrinter.lineWrap(2);
                                    await SunmiPrinter.lineWrap(2);
                  await SunmiPrinter.printText('กรุณา Check In กับเจ้าหน้าที่ที่มาติดต่อ', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.CENTER,));
                  await SunmiPrinter.printText('ก่อนออกจากบริษัท', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.CENTER,));
                  await SunmiPrinter.printText('*** ห้ามทำใบสลิปหาย *** ', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.CENTER,));
              }else{
                  await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);
                  await SunmiPrinter.printQRCode(printResponse[0]['WI_Barcode'],size: 8);
                  await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);

                  await SunmiPrinter.lineWrap(2);

                  await SunmiPrinter.printBarCode(printResponse[0]['WI_Barcode'],barcodeType: SunmiBarcodeType.CODE128,textPosition: SunmiBarcodeTextPos.TEXT_UNDER, height: 60);

                  await SunmiPrinter.lineWrap(2);
                  await SunmiPrinter.printText('*** ห้ามทำใบสลิปหาย *** ', style: SunmiStyle(fontSize: SunmiFontSize.MD,bold: false,align: SunmiPrintAlign.CENTER,));


              }


              await SunmiPrinter.bold();
              await SunmiPrinter.lineWrap(1);
              await SunmiPrinter.resetBold();
              await SunmiPrinter.lineWrap(7);

              await SunmiPrinter.cut();

              await SunmiPrinter.exitTransactionPrint(true);


        } 
      } else {
        print('Response list is empty');
      }

}


}

Future<Uint8List> readFileBytes(String path) async {
  ByteData fileData = await rootBundle.load(path);
  Uint8List fileUnit8List = fileData.buffer
      .asUint8List(fileData.offsetInBytes, fileData.lengthInBytes);
  return fileUnit8List;
}

Future<Uint8List> _getImageFromAsset(String iconPath) async {
  return await readFileBytes(iconPath);
}

Future<List<int>> _customEscPos() async {
  final profile = await CapabilityProfile.load();
  final generator = Generator(PaperSize.mm58, profile);
  List<int> bytes = [];

  bytes += generator.text(
      'Regular: aA bB cC dD eE fF gG hH iI jJ kK lL mM nN oO pP qQ rR sS tT uU vV wW xX yY zZ');
  bytes += generator.text('Special 1: àÀ èÈ éÉ ûÛ üÜ çÇ ôÔ',
      styles: const PosStyles(codeTable: 'CP1252'));
  bytes += generator.text('Special 2: blåbærgrød',
      styles: const PosStyles(codeTable: 'CP1252'));

  bytes += generator.text('Bold text', styles: const PosStyles(bold: true));
  bytes +=
      generator.text('Reverse text', styles: const PosStyles(reverse: true));
  bytes += generator.text('Underlined text',
      styles: const PosStyles(underline: true), linesAfter: 1);
  bytes += generator.text('Align left',
      styles: const PosStyles(align: PosAlign.left));
  bytes += generator.text('Align center',
      styles: const PosStyles(align: PosAlign.center));
  bytes += generator.text('Align right',
      styles: const PosStyles(align: PosAlign.right), linesAfter: 1);
  bytes += generator.qrcode('Barcode by escpos',
      size: QRSize.Size4, cor: QRCorrection.H);
  bytes += generator.feed(2);

  bytes += generator.row([
    PosColumn(
      text: 'col3',
      width: 3,
      styles: const PosStyles(align: PosAlign.center, underline: true),
    ),
    PosColumn(
      text: 'col6',
      width: 6,
      styles: const PosStyles(align: PosAlign.center, underline: true),
    ),
    PosColumn(
      text: 'col3',
      width: 3,
      styles: const PosStyles(align: PosAlign.center, underline: true),
    ),
  ]);

  bytes += generator.text('Text size 200%',
      styles: const PosStyles(
        height: PosTextSize.size2,
        width: PosTextSize.size2,
      ));

  bytes += generator.reset();
  bytes += generator.cut();

  return bytes;
}