import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'dart:async';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:gallery_saver/gallery_saver.dart';
import 'dart:developer' as developer;

Future<XFile?> capturePhoto(BuildContext context, CameraController cameraController, bool confirmSave) async {
  if (cameraController == null || !cameraController.value.isInitialized) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Error'),
          content: Text('Camera is not initialized.'),
          actions: <Widget>[
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: Text('OK'),
            ),
          ],
        );
      },
    );
    return null;
  }
  
  if (cameraController.value.isTakingPicture) {
    // A capture is already pending, do nothing.
    return null;
  }

  try {
    await cameraController.setFlashMode(FlashMode.off);
    XFile file = await cameraController.takePicture();
    if (confirmSave) {
      final String directory = (await getApplicationDocumentsDirectory()).path;
      final String filePath = '$directory/${DateTime.now()}.jpg';
      await File(file.path).copy(filePath);
      await GallerySaver.saveImage(filePath, albumName: 'SmartSecuerity2');
    }
    return file;
  } catch (e) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Error'),
          content: Text('Failed to capture photo: $e'),
          actions: <Widget>[
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: Text('OK'),
            ),
          ],
        );
      },
    );
    return null;
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final cameras = await availableCameras();
  final firstCamera = cameras.first;
  runApp(MyApp(camera: firstCamera));
}

class MyApp extends StatelessWidget {
  final CameraDescription camera;

  const MyApp({Key? key, required this.camera}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: Text('Camera'),
        ),
        body: CameraScreen(camera: camera),
      ),
    );
  }
}

class CameraScreen extends StatefulWidget {
  final CameraDescription camera;

  const CameraScreen({Key? key, required this.camera}) : super(key: key);

  @override
  _CameraScreenState createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  late CameraController _controller;
  bool confirmSave = false;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    _controller = CameraController(widget.camera, ResolutionPreset.medium);
    await _controller.initialize();
    if (!mounted) {
      return;
    }
    setState(() {});
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

Future<void> _capturePhoto() async {
  final xFile = await capturePhoto(context, _controller, confirmSave);
}


@override
Widget build(BuildContext context) {
  if (!_controller.value.isInitialized) {
    return Container();
  }
  return Container(
    width: 800, // Set the desired width for the Cityzen card
    height: 485, // Set the desired height for the Cityzen card
    child: Card(
      elevation: 4.0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8.0),
        side: BorderSide(color: Colors.black, width: 2.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Expanded(
            child: CameraPreview(_controller),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                IconButton(
                  icon: Icon(Icons.camera),
                  onPressed: () {
                    setState(() {
                      confirmSave = true;
                    });
                    _capturePhoto();
                  },
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