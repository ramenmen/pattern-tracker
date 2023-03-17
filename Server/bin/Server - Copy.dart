import 'dart:io';
import 'dart:convert';
import 'dart:math';
import 'package:mongo_dart/mongo_dart.dart';
import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as path;

main() async {
  // Connect to our Mongo database
  Db db = Db('mongodb://localhost:27017/test');
  await db.open();
  DbCollection users = db.collection('users');
  DbCollection userSessions = db.collection('userSessions');
  print('Connected to database!');

  // Create our server connection
  const port = 8089;
  var server = await HttpServer.bind('localhost', port);

  server.listen((HttpRequest request) async {
    var path = request.uri.path;
    var response = request.response;

    response.headers
      ..add('Access-Control-Allow-Origin', 'http://localhost:8000')
      ..add('Access-Control-Allow-Headers', '*')
      ..add('Access-Control-Allow-Credentials', 'true')
      ..add('Access-Control-Expose-Headers', '*')
      ..add('Access-Control-Allow-Methods', 'POST,GET,DELETE,PUT,OPTIONS');

    // Create a hash from the given password
    String hashPassword(String password, String salt) {
      var codec = Utf8Codec();
      var key = codec.encode(password);
      var saltBytes = codec.encode(salt);
      var hmacSha256 = Hmac(sha256, key);
      var digest = hmacSha256.convert(saltBytes);
      return digest.toString();
    }

    if (request.method == 'POST' && (path == '/register' || path == '/login')) {
      // Retrieve registration details from payload
      var content = await utf8.decoder.bind(request).join();
      var params = Uri.splitQueryString(content);

      var username = params['username'];
      var password = params['password'];
      if (username != null &&
          username.trim() != '' &&
          password != null &&
          password.trim() != '') {
        print(params);

        // Generate a random 'salt'
        var rand = Random.secure();
        var saltBytes = List<int>.generate(32, (_) => rand.nextInt(256));
        var salt = base64.encode(saltBytes);

        // Hash the password combining the generated salt
        var hashedPassword = hashPassword(password, salt);
        // Store the username, salt and hashed password in the database
        await users.insertOne({
          'username': username,
          'hashedPasswd': hashedPassword,
          'salt': salt,
        });
        response.write('Created new user');
      } else {
        response.write('Username or password blank');
      }
    }

    if (request.method == 'POST' && path == '/login') {
      // Retrieve registration details from payload
      var content = await utf8.decoder.bind(request).join();
      var params = Uri.splitQueryString(content);

      var username = params['username'];
      var password = params['password'];
      if (username != null &&
          username.trim() != '' &&
          password != null &&
          password.trim() != '') {
        print(params);

        try {
          var myUser = await users.findOne(where.eq('username', username));
          if (myUser == null) {
            throw ArgumentError('Wrong user or password');
          }
          // Hash the password combining the generated salt
          var hashedPassword = hashPassword(password, myUser['salt']);
          if (hashedPassword == myUser['hashedPasswd']) {
            Map<String, dynamic> session = {
              'username': username,
              'sessionToken': Uuid().v4()
            };
            await userSessions.insertOne(session);

            response.cookies.add(Cookie(
                'userToken', base64.encode(utf8.encode(json.encode(session)))));
            //response.write({'Logged in user'});
            // await response
            //     .redirect(Uri.parse('http://localhost:8000/index.html'));
          } else {
            throw ArgumentError('Wrong user or password');
          }
        } catch (e) {
          response
            ..statusCode = HttpStatus.unauthorized
            ..write(e);
        }
      } else {
        response.write('Username or password blank');
      }
    }

    // if (request.method == 'GET') {
    //   _handleGet(request);
    // }

    // After all is done, just end the response
    await response.close();
  });
}

// String _basePath = 'C:/Users/Chuyue/Documents/webbed-sites/my-web-app';

// _handleGet(HttpRequest request) async {
//   // PENDING: Do more security checks here?
//   var stringPath = request.uri.path == '/' ? '/home.html' : request.uri.path;
//   var why = path.join(_basePath, stringPath);
//   File file = new File(_basePath + stringPath);
//   await file.exists().then((bool found) {
//     if (found) {
//       file.openRead().pipe(request.response).catchError((e) {
//         print(e);
//       });
//     } else {
//       // _sendNotFound(request.response);
//     }
//   });
// }
