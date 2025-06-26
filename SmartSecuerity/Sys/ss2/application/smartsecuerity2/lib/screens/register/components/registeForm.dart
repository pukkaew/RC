import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../cardinformation/cardinformation.dart';
import '../../qr_code//qr_screen.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:async';
import 'dart:io';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:image_cropper/image_cropper.dart';
import '../../print_sunny/sunmi.dart';
import 'package:flutter/services.dart';
import 'package:smartsecuerity2/screens/QrResultScreen/QRViewExample2.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

void main() {
  dotenv.load();
  String baseUrl = dotenv.env['BASE_URL']!;
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Register Form',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const RegisterPage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class RegisterPage extends StatefulWidget {
  const RegisterPage({Key? key}) : super(key: key);

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  
  // Create the controllers
  TextEditingController citizenIDController = TextEditingController();
  TextEditingController fullNameController = TextEditingController();
  //TextEditingController addressController = TextEditingController();
  TextEditingController plateController = TextEditingController();
  TextEditingController plateprovinceController = TextEditingController();
  TextEditingController companyController = TextEditingController();
  TextEditingController contactNameController = TextEditingController();
  TextEditingController VihicleController = TextEditingController();
  TextEditingController VisitorFollowController = TextEditingController();
  TextEditingController VisitorFromController = TextEditingController();
  TextEditingController WI_RemarksController = TextEditingController();
  TextEditingController QDeviceController = TextEditingController();
  TextEditingController WI_ContactNameController = TextEditingController();

  final ImagePicker _picker = ImagePicker();

  String? _selectedType;
  String? _selectedCarType;
  String? _selectedCompany;
  String? _selectedDepartment;

  List<String> _companyOptions = [];
  List<String> _departmentOptions = [];

  @override
  void initState() {
    super.initState();

      _selectedType = 'รับฝากสินค้า';
    // Load data for dropdowns from API
    fetchDepartmentDropdownOptions();
    fetchCompanyDropdownOptions();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ลงทะเบียน'),
      ),
      body: Center(
        child: Container(
          padding: const EdgeInsets.fromLTRB(15.0, 5.0, 8.0, 10.0),
          child: ListView(
            shrinkWrap: false,
            children: [
              const Text('ประเภทผู้ติดต่อ'),
              const SizedBox(
                height: 10,
              ),

              DropdownButton<String>(
                value: _selectedType ?? 'รับฝากสินค้า', // Default value 'Visitor'
                items: <String>['รับฝากสินค้า','ขอดูสินค้า', 'ผู้มาติดต่อ', 'ซัพพลายเออร์']
                    .map((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Row(
                      children: <Widget>[
                        Text(value), // Display the item value
                        SizedBox(
                            width:
                                10), // Optional: Adjust spacing between text and description
                        Text(
                          getDescription(
                              value), // Call a function to get description
                          style: TextStyle(
                            color: Colors
                                .grey, // Optional: Adjust color for description
                            fontSize:
                                12, // Optional: Adjust font size for description
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  setState(() {
                    _selectedType = newValue;
                  });
                },
              ),


              const Text('รหัสบัตรประชาชน'),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: citizenIDController,
                      decoration: const InputDecoration(
                        hintText: '',
                      ),
                      keyboardType:
                          TextInputType.number, // Set keyboard type to number
                      inputFormatters: <TextInputFormatter>[
                        FilteringTextInputFormatter
                            .digitsOnly // Allow only digits (numbers)
                      ],
                    ),
                  ),


ElevatedButton.icon(
  onPressed: () {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          contentPadding: EdgeInsets.only(top: 20.0), // ปรับระยะห่างด้านบนของเนื้อหาจากขอบของ dialog
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center, // จัดตำแหน่งข้อความและปุ่มให้ตรงกลางแนวขวาง
            children: <Widget>[
              Text(
                "สแกนรูปจาก",
                style: TextStyle(
                  fontSize: 18,  // ขนาดตัวอักษร
                  fontWeight: FontWeight.bold,  // น้ำหนักตัวอักษร
                  color: Colors.black,  // สีตัวอักษร
                ),
              ),
              SizedBox(height: 20),  // เพิ่มระยะห่างระหว่างข้อความและปุ่ม
              TextButton(
                child: Text("บัตรประชาชน"),
                onPressed: () {
                  // Handle zencard option
                  takePhotoAndSend();
                  Navigator.of(context).pop();
                  // Perform the action after choosing zencard
                },
              ),
              TextButton(
                child: Text("ใบขับขี่"),
                onPressed: () {
                  // Handle driver license option
                  takePhotoDriverlicenseAndSend();
                  Navigator.of(context).pop();
                  // Perform the action after choosing driver license
                },
              ),
            ],
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),  // ปรับขอบของ dialog
          ),
        );
      },
    );
  },
  icon: Icon(Icons.camera_alt),
  label: Text(''),
  style: ElevatedButton.styleFrom(
    padding: EdgeInsets.symmetric(vertical: 20.0),
    alignment: Alignment.center,
  ),
),





                ],
              ),
              const Text('ชื่อ-สกุล'),
              TextField(
                controller: fullNameController,
                decoration: const InputDecoration(
                  hintText: '',
                ),
              ),

              const Text('เลขทะเบียน'),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: plateController,
                      decoration: const InputDecoration(
                        hintText: '',
                      ),
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: takePhotoLicensePlateAndSend,
                    icon: Icon(Icons.camera_alt), // Icon you want to use
                    label: Text(''), // Empty text as you want only the icon
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.symmetric(
                          vertical: 20.0), // Adjust padding as needed
                      alignment: Alignment.center, // Center align the content
                    ),
                  ),
                ],
              ),
              const Text('ทะเบียนจังหวัด'),
              TextField(
                controller: plateprovinceController,
                decoration: const InputDecoration(
                  hintText: '',
                ),
              ),
              const Text('รายละเอียด'),
              TextField(
                controller: WI_RemarksController,
                decoration: const InputDecoration(
                  hintText: '',
                ),
              ),
              const Text('จำนวนผู้มาติดต่อ'),
              TextField(
                controller: VisitorFollowController,
                decoration: const InputDecoration(
                  hintText: '',
                ),
                keyboardType:
                    TextInputType.number, // Set keyboard type to number
                inputFormatters: <TextInputFormatter>[
                  FilteringTextInputFormatter
                      .digitsOnly // Allow only digits (numbers)
                ],
              ),
              const Text('ยานพาหะนะ'),
              const SizedBox(
                height: 10,
              ),
              DropdownButton<String>(
                value: _selectedCarType ?? 'รถยนต์', // Default value 'Visitor'
                items: <String>[
                  'รถมอไซค์',
                  'รถสามล้อ',
                  'รถยนต์',
                  'รถกระบะ',
                  'รถ 6 ล้อ',
                  'รถ 10 ล้อ',
                  'รถ 12 ล้อ',
                  'รถ 20 ล้อ',
                  'รถ 40 ล้อ',
                ].map((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  setState(() {
                    _selectedCarType = newValue;
                  });
                },
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: 50), // Adjust height as needed
                  const Text('เลือกบริษัทที่ต้องการติดต่อ'),
                  SizedBox(height: 10), // Adjust height as needed
                  DropdownButton<String>(
                    value: _selectedCompany ??
                        (_companyOptions.isNotEmpty ? _companyOptions[0] : ''),
                    items: _companyOptions.map((String value) {
                      return DropdownMenuItem<String>(
                        value: value,
                        child: Text(value),
                      );
                    }).toList(),
                    onChanged: (String? newValue) {
                      setState(() {
                        _selectedCompany = newValue;
                      });
                    },
                  ),
                ],
              ),

              Visibility(
                visible: _selectedType != 'รับฝากสินค้า',
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start, // Adjust alignment as needed
                  children: [
                    const Text('เลือกหน่วยงานที่เกี่ยวข้อง'),
                    const SizedBox(height: 10), // Adjust height as needed
                    DropdownButton<String>(
                      value: _selectedDepartment,
                      items: _departmentOptions.map((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                      onChanged: (String? newValue) {
                        setState(() {
                          _selectedDepartment = newValue;
                        });
                      },
                    ),
                    const SizedBox(
                        height: 20), // Add spacing between elements if needed
                    const Text('ชื่อผู้ติดต่อ'),
                    const SizedBox(height: 10), // Adjust height as needed
                    TextField(
                      controller: WI_ContactNameController,
                      decoration: InputDecoration(
                        hintText: 'Enter Contact Name',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Colors.grey),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(
                height: 50,
              ),
              ElevatedButton(
                onPressed: () {
                  registerUser();
                },
                style: ButtonStyle(
                  backgroundColor: MaterialStateProperty.all<Color>(
                      Colors.greenAccent.shade700),
                  foregroundColor:
                      MaterialStateProperty.all<Color>(Colors.white),
                ),
                child: const Text(
                  'Next',
                  style: TextStyle(
                    fontSize: 20,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Function to get description based on item value
String getDescription(String value) {
  switch (value) {
    case 'รับฝากสินค้า':
      return 'Deposit';
    case 'ผู้มาติดต่อ':
      return 'Visitor';
    case 'ซัพพลายเออร์':
      return 'Supplier';
    case 'ขอดูสินค้า':
      return 'Product_Review';
    default:
      return '';
  }
}

  void registerUser() async {

//Uri.parse('http://192.168.21.36:7000/wayinout/RegisterWayIn');
//https://web.mrgshrimp.com/webapi4/wayinout/RegisterWayIn

    var url = Uri.parse('http://192.168.21.36:7000/wayinout/RegisterWayIn');
    var response = await http.post(
      url,
      body: {
        'WI_VisitType':
            _selectedType ?? 'Visitor', // Provide an empty string if null
        'WI_CardID':
            citizenIDController.text ?? '-', // Provide an empty string if null
        'WI_FullName':
            fullNameController.text ?? '-', // Provide an empty string if null
        'WI_Address': '-', // Provide an empty string if null
        'WI_LicensePlate':
            plateController.text ?? '-', // Provide an empty string if null
        'WI_LicenseProvince': plateprovinceController.text ??
            '-', // Provide an empty string if null
        'WI_VehicleType':
            _selectedCarType ?? 'รถยนต์', // Provide an empty string if null
        'WI_Follower': VisitorFollowController.text ??
            '-', // Provide an empty string if null
        'WI_Remarks':
            WI_RemarksController.text ?? '-', // Provide an empty string if null
        'WI_FromCompany':
            _selectedCompany ?? '-', // Provide an empty string if null
        'WI_ContactName': WI_ContactNameController.text ??
            '-', // Provide an empty string if null
        'QDevice': QDeviceController.text ?? '-',
         'IC_ID': '5',
         'ID_ID': _selectedDepartment ?? '7'
      },
    );

    dynamic jsonResponse = jsonDecode(response.body);

    if (jsonResponse != 0) {
      Navigator.push(
        context,
        MaterialPageRoute(
            builder: (context) => PrintSunnyApp(
                  QR_Code: jsonResponse.toString(),
                )),
      );
    } else {
      _dialogAlertFillData(context);
    }
  }

  Future<void> fetchDepartmentDropdownOptions() async {
    try {
      /* final departmentResponse = await http.post(
          Uri.parse('https://web.mrgshrimp.com/webapi4/master/Get_department')); */

      final departmentResponse = await http.post(
          Uri.parse('http://192.168.21.36:7000/master/Get_department')); 

      if (departmentResponse.statusCode == 200) {
        final List<dynamic> departments =
            json.decode(departmentResponse.body).cast<dynamic>();

        List<String> departmentOptions = departments.map<String>((department) {
          return department['ID_LocalName'].toString();
        }).toList();

        setState(() {
          _departmentOptions = departmentOptions;
          _selectedDepartment =
              _departmentOptions.isNotEmpty ? _departmentOptions[0] : '';
        });
      }
    } catch (e) {
      print('Error fetching dropdown options: $e');
    }
  }

  Future<void> fetchCompanyDropdownOptions() async {
    try {
/*       final InternalcompanyResponse = await http.post(Uri.parse(
          'https://web.mrgshrimp.com/webapi4/master/Get_IntenalCompony')); */

          final InternalcompanyResponse = await http.post(Uri.parse(
          'http://192.168.21.36:7000/master/Get_IntenalCompony'));

      if (InternalcompanyResponse.statusCode == 200) {
        final List<dynamic> company =
            json.decode(InternalcompanyResponse.body).cast<dynamic>();

        print(_companyOptions);

        List<String> companyOptions = company.map<String>((company) {
          return company['IC_LocalName'].toString();
        }).toList();

        setState(() {
          _companyOptions = companyOptions;
          _selectedCompany =
              _companyOptions.isNotEmpty ? _companyOptions[0] : '';
        });
      }
    } catch (e) {
      print('Error fetching dropdown options: $e');
    }
  }

  Future<void> takePhotoAndSend() async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
          source: ImageSource.camera, maxHeight: 480, maxWidth: 640);

      if (pickedFile != null) {
        File file = File(pickedFile.path);

        var url =
            Uri.parse('https://api.iapp.co.th/thai-national-id-card/v3/front');

        Map<String, String> headers = {
          'apikey': 'jOyVtNUAUuRot3jH1t54NP378aRueFOF',
        };

        var request = http.MultipartRequest('POST', url);
        request.headers.addAll(headers);

        request.files
            .add(await http.MultipartFile.fromPath('file', pickedFile.path));
        request.fields['options'] = 'fast,grey_check,id_check,spell_check';
        //request.fields['fields'] = 'id_number';

        var response = await request.send();

        String responseBody = await response.stream.bytesToString();
        Map<String, dynamic> responseData = jsonDecode(responseBody);

        citizenIDController.text = response.statusCode.toString();

        if (response.statusCode == 200) {
          print('Photo sent successfully');

          citizenIDController.text = '';
          fullNameController.text = '';
          //addressController.text = '';

          citizenIDController.text = responseData['id_number'];
          fullNameController.text = responseData['th_name'];
          //addressController.text = responseData['address'];
        } else {
          print('Failed to send photo');
          citizenIDController.text = '';
          fullNameController.text = '';
          //addressController.text = '';
        }
      } else {
        print('No file attached');

        citizenIDController.text = '';
        fullNameController.text = '';
      }
    } catch (e) {
      print('Error: $e');
      citizenIDController.text = '';
      fullNameController.text = '';

      _dialogAlertFileNotrespon(context);
    }
  }

  Future<void> takePhotoDriverlicenseAndSend() async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
          source: ImageSource.camera, maxHeight: 480, maxWidth: 640);

      if (pickedFile != null) {
        File file = File(pickedFile.path);

        var url =
            Uri.parse('https://api.iapp.co.th/thai-driver-license-ocr');

        Map<String, String> headers = {
          'apikey': 'jOyVtNUAUuRot3jH1t54NP378aRueFOF',
        };

        var request = http.MultipartRequest('POST', url);
        request.headers.addAll(headers);

        request.files
            .add(await http.MultipartFile.fromPath('file', pickedFile.path));

        var response = await request.send();

        String responseBody = await response.stream.bytesToString();
        Map<String, dynamic> responseData = jsonDecode(responseBody);

        citizenIDController.text = response.statusCode.toString();

         if (response.statusCode == 200) {
          print('Photo sent successfully');

          citizenIDController.text = '';
          fullNameController.text = '';

          citizenIDController.text = responseData['id_no'];
          fullNameController.text = responseData['th_name'];

        } else {

          print('Failed to send photo');
          citizenIDController.text = '';
          fullNameController.text = '';

        }  


      } else {
         print('No file attached');

        citizenIDController.text = '';
        fullNameController.text = ''; 
      }
    } catch (e) {
      print('Error: $e');
      citizenIDController.text = '';
      fullNameController.text = '';

      _dialogAlertFileNotrespon(context);
    }
  }

  Future<void> takePhotoLicensePlateAndSend() async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
          source: ImageSource.camera, maxHeight: 480, maxWidth: 640);

      if (pickedFile != null) {
        File file = File(pickedFile.path);

        // Continue with your existing code to send the compressed image to the API
        // Example API endpoint where you want to send the file
        var url =
            Uri.parse('https://api.iapp.co.th/license-plate-recognition/file');

        // Create headers with API key
        Map<String, String> headers = {
          'apikey':
              'jOyVtNUAUuRot3jH1t54NP378aRueFOF', // Replace 'YOUR_API_KEY' with your actual API key
        };

        // Create request body
        var request = http.MultipartRequest('POST', url);
        request.headers.addAll(headers);

        // Add image file
        request.files
            .add(await http.MultipartFile.fromPath('file', pickedFile.path));
        //request.fields['options'] = 'fast,grey_check,id_check,spell_check';

        // Send the request
        var response = await request.send();

        String responseBody = await response.stream.bytesToString();
        Map<String, dynamic> responseData = jsonDecode(responseBody);

        if (response.statusCode == 200) {
          String province = responseData['province'];
          String cityName = province
              .replaceAll('(', '')
              .replaceAll(')', '')
              .split(' ')
              .last
              .trim();

          print('Photo sent successfully');

          plateController.text = '';
          plateprovinceController.text = '';

          plateController.text = responseData['lp_number'];
          plateprovinceController.text = cityName;
        } else {
          print('Failed to send photo');

          plateController.text = '';
          plateprovinceController.text = '';
        }
      } else {
        // Handle case when no file is attached
        print('No file attached');
        plateController.text = '';
        plateprovinceController.text = '';
      }
    } catch (e) {
      print('Error: $e');
      plateController.text = '';
      plateprovinceController.text = '';

      _dialogAlertFileNotrespon(context);
    } finally {
      // Navigator.pop(context); // Close the dialog in all scenarios
    }
  }

  Future<void> _dialogAlertFillData(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('แจ้งเตือน'),
          content: const Text(
            'กรุณากรอกข้อมูลให้ครบถ้วน\n',
          ),
          actions: <Widget>[
            TextButton(
              style: TextButton.styleFrom(
                textStyle: Theme.of(context).textTheme.labelLarge,
              ),
              child: const Text('OK'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }

  Future<void> _dialogAlertFileNotrespon(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('แจ้งเตือน'),
          content: const Text(
            'พบปัญหารูปถ่าย กรุณาลองสแกนอีกครั้ง\n',
          ),
          actions: <Widget>[
            TextButton(
              style: TextButton.styleFrom(
                textStyle: Theme.of(context).textTheme.labelLarge,
              ),
              child: const Text('OK'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }

  
}
