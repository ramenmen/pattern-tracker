import 'dart:io';
import 'dart:convert';
import 'dart:math';
import 'package:mongo_dart/mongo_dart.dart';
import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as path;
import 'package:collection/collection.dart';

late DbCollection users;
late DbCollection userSessions;

void main() async {
  // Connect to our Mongo database
  Db db = Db('mongodb://localhost:27017/test');
  await db.open();
  users = db.collection('users');
  userSessions = db.collection('userSessions');
  print('Connected to database!');

  // Create our server connection
  const port = 8089;
  var server = await HttpServer.bind('localhost', port);

  server.listen((HttpRequest request) async {
    var response = request.response;
    response.headers
      ..add('Access-Control-Allow-Origin', 'http://localhost:8000')
      ..add('Access-Control-Allow-Headers', '*')
      ..add('Access-Control-Allow-Credentials', 'true')
      ..add('Access-Control-Expose-Headers', '*')
      ..add('Access-Control-Allow-Methods', 'POST,GET,DELETE,PUT,OPTIONS');

    try {
      switch (request.method) {
        case 'POST':
          await _handlePost(request);
          break;
        case 'GET':
          await _handleGet(request);
          break;
        default:
          response
            ..statusCode = HttpStatus.notFound
            ..write('Not Found :()');
          break;
      }
    } catch (e) {
      response
        ..statusCode = HttpStatus.unauthorized
        ..write((e as ArgumentError).message);
    }

    // After all is done, just end the response
    await response.close();
  });
}

_handlePost(HttpRequest request) async {
  // Create a hash from the given password
  String hashPassword(String password, String salt) {
    var codec = Utf8Codec();
    var key = codec.encode(password);
    var saltBytes = codec.encode(salt);
    var hmacSha256 = Hmac(sha256, key);
    var digest = hmacSha256.convert(saltBytes);
    return digest.toString();
  }

  var path = request.uri.path;
  var response = request.response;
  if (path == '/register' || path == '/login') {
    //redirect if logged in?
    var isLoggedIn = await _isLoggedIn(request);
    if (isLoggedIn) {}

    // Retrieve registration details from payload
    var content = await utf8.decoder.bind(request).join();
    var params = Uri.splitQueryString(content);

    var username = params['username'];
    var password = params['password'];

    if (username == null ||
        username.trim() == '' ||
        password == null ||
        password.trim() == '') {
      throw ArgumentError('Username or password blank');
    }

    print(params);

    if (path == '/register') {
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
    } else if (path == '/login') {
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
      } else {
        throw ArgumentError('Wrong user or password');
      }
    }
  }
}

_handleGet(HttpRequest request) async {}

_isLoggedIn(HttpRequest request) async {
  var userTokenCookie =
      request.cookies.firstWhereOrNull((c) => c.name == 'userToken');
  if (userTokenCookie == null) {
    return false;
  } else {
    var decodedUserToken =
        json.decode(utf8.decode(base64.decode(userTokenCookie.value)));
    var count = await userSessions.count(where
        .eq('sessionToken', decodedUserToken['sessionToken'])
        .eq('username', decodedUserToken['username']));

    return count > 0;
  }
}
