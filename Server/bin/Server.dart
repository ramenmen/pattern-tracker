// ignore_for_file: omit_local_variable_types

import 'dart:io';
import 'dart:convert';
import 'dart:math';
import 'package:mongo_dart/mongo_dart.dart';
import 'package:crypto/crypto.dart';
import 'package:collection/collection.dart';
import 'package:csv/csv.dart';

late final DbCollection users;
late final DbCollection userSessions;
late final DbCollection patterns;

void main() async {
  // Connect to our Mongo database
  Db db = Db(
      'mongodb://chuyue:chuyue123@ac-cntswxq-shard-00-00.hzmt7cs.mongodb.net:27017,ac-cntswxq-shard-00-01.hzmt7cs.mongodb.net:27017,ac-cntswxq-shard-00-02.hzmt7cs.mongodb.net:27017/?ssl=true&replicaSet=atlas-7jtlrp-shard-0&authSource=admin&retryWrites=true&w=majority'); //'mongodb+srv://chuyue:chuyue123@cluster0.hzmt7cs.mongodb.net/test');
  await db.open();
  users = db.collection('users');
  userSessions = db.collection('userSessions');
  patterns = db.collection('patterns');
  print('Connected to database!');

  // Create our server connection
  final port = int.parse(Platform.environment['PORT'] ?? '8080');
  var server = await HttpServer.bind(InternetAddress.anyIPv4, port);

  server.listen((HttpRequest request) async {
    var response = request.response;

    response.headers
        .add('Access-Control-Allow-Origin', 'https://ramenmen.github.io');
    response.headers
        .add('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE');
    response.headers.add('Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept');
    response.headers.add('Access-Control-Allow-Credentials', 'true');

    try {
      switch (request.method) {
        case 'POST':
          await _handlePost(request);
          break;
        case 'GET':
          await _handleGet(request);
          break;
        case 'DELETE':
          await _handleDelete(request);
          break;
        default:
          _sendNotFound(request);
          break;
      }
    } catch (e) {
      var msg = e.toString();
      if (e.runtimeType == ArgumentError) {
        msg = (e as ArgumentError).message;
      }
      response.write(json.encode({'error': msg}));
      await request.response.close();
    }
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
      var myUser = await users.findOne(where.eq('username', username));
      if (myUser != null) {
        throw ArgumentError('User already exists');
      }
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
      response.write(json.encode({'success': true}));
      await request.response.close();
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
        response.write(json.encode({'success': true}));
        await request.response.close();
      } else {
        throw ArgumentError('Wrong user or password');
      }
    }
  } else if (path == '/pattern-list') {
    var isLoggedIn = await _isLoggedIn(request);
    if (!isLoggedIn) {
      response.write(json.encode({'redirect': 'login.html'}));
      await request.response.close();
      return;
    }

    var username = await _getUserName(request);
    var id = request.uri.queryParameters['id'];
    var content = await utf8.decoder.bind(request).join();
    var document = json.decode(content);
    var itemToUpdate;
    if (id != null &&
        (itemToUpdate = await patterns
                .findOne(where.eq('_id', ObjectId.fromHexString(id)))) !=
            null) {
      var updateObject = {};
      if (document['name'] != null) {
        updateObject['name'] = document['name'];
      }
      if (document['currentRow'] != null) {
        updateObject['currentRow'] = document['currentRow'];
        updateObject['finished'] = document['rows'].length > 0 &&
            document['rows'].length < document['currentRow'];
      }
      if (document['rows'] != null) {
        updateObject['rows'] = document['rows'];
      }
      await patterns.updateOne(itemToUpdate, {r'$set': updateObject});
      var updatedItem =
          await patterns.findOne(where.eq('_id', ObjectId.fromHexString(id)));
      response.write(json.encode(updatedItem));
    } else {
      document['owner'] = username;
      document['finished'] = false;
      document['currentRow'] = 1;
      document['rows'] = [];
      var result = await patterns.insertOne(document);
      response.write(json.encode(result.document));
    }
    await response.close();
  } else if (path == '/upload-file') {
    var isLoggedIn = await _isLoggedIn(request);
    if (!isLoggedIn) {
      response.write(json.encode({'redirect': 'login.html'}));
      await request.response.close();
      return;
    }

    var username = await _getUserName(request);

    Map<String, dynamic> document = {};
    document['owner'] = username;
    document['finished'] = false;
    document['currentRow'] = 1;
    document['rows'] = [];
    document['name'] = request.uri.queryParameters['name'];

    var content = utf8.decoder.bind(request);
    var myList = await CsvToListConverter().bind(content).toList();
    for (int i = 0; i < myList.length; i++) {
      var row = myList[i];
      var newRow = {};
      newRow['desc'] = row[0];
      newRow['stCount'] = row[1];
      document['rows'].add(newRow);
    }

    var result = await patterns.insertOne(document);
    if (result.document != null) {
      var idObject = result.document!['_id'];
      var id = (idObject! as ObjectId).id.hexString;
      response.write(json.encode({'redirect': 'pattern.html?id=$id'}));
    }
    await response.close();
    return;
  }
}

_handleDelete(HttpRequest request) async {
  var path = request.uri.path;
  var response = request.response;

  if (path == '/pattern-list') {
    var isLoggedIn = await _isLoggedIn(request);
    if (!isLoggedIn) {
      response.write(json.encode({'redirect': 'login.html'}));
      await response.close();
      return;
    }

    var id = request.uri.queryParameters['id'];
    if (id != null) {
      var itemToDelete =
          await patterns.findOne(where.eq('_id', ObjectId.fromHexString(id)));
      if (itemToDelete != null) {
        var result = await patterns.deleteOne(itemToDelete);
        response.write(json.encode({'success': result.isSuccess}));
      } else {
        response.write(json.encode({'success': false}));
      }
    } else {
      response.write(json.encode({'success': false}));
    }
    await response.close();
  }
}

String _basePath = 'C:/Users/Chuyue/Documents/webbed-sites/my-web-app';

var requiresLogin = [
  '/home',
  '/pattern.html',
  '/pattern-list.html',
  '/pattern-list',
  '/pattern'
];
var noLogin = ['/login.html', '/register.html'];

_handleGet(HttpRequest request) async {
  var path = request.uri.path;
  path = path == '/' ? '/home' : path;
  var response = request.response;
  //basic checks
  var isLoggedIn = await _isLoggedIn(request);
  var username = await _getUserName(request);
  if (isLoggedIn && (noLogin.contains(path))) {
    response.write(json.encode({'redirect': 'index.html'}));
    await response.close();
    return;
  }
  if (!isLoggedIn && (requiresLogin.contains(path))) {
    response.write(json.encode({'redirect': 'login.html'}));
    await response.close();
    return;
  }

  //logout
  if (path == '/logout') {
    if (isLoggedIn) {
      await _logOut(request);
    }
    response.write(json.encode({'redirect': 'login.html'}));
    await response.close();
    return;
  } else if (path == '/home') {
    response.write(json.encode({'redirect': 'patterns-list.html'}));
    await response.close();
    return;
  }

  //serving pattern realness
  if (path == '/pattern-list') {
    var patternsList = await patterns
        .modernFind(selector: where.eq('owner', username), projection: {
      'name': 1,
      'finished': 1,
    }).toList();
    var patternsJson = json.encode(patternsList);
    request.response.write(patternsJson);
    await request.response.close();
    return;
  } else if (path == '/pattern') {
    var id = request.uri.queryParameters['id'];
    if (id == null) {
      response.write(json.encode({'redirect': 'patterns-list.html'}));
      await response.close();
      return;
    }
    var pattern =
        await patterns.findOne(where.eq('_id', ObjectId.fromHexString(id)));
    var patternJson = json.encode(pattern);
    request.response.write(patternJson);
    await request.response.close();
    return;
  }

  //serving an actual file
  File file = File(_basePath + path);
  var found = await file.exists();
  if (found) {
    //get content type
    var parts = path.split('.');
    var contentType;
    switch (parts[parts.length - 1]) {
      case 'html':
        contentType = ContentType.html;
        break;
      case 'css':
        contentType = ContentType('text', 'css');
        break;
      case 'js':
        contentType = ContentType('text', 'javascript');
        break;
    }
    request.response.headers.contentType = contentType;
    await file.openRead().pipe(request.response);
    await request.response.close();
  } else {
    _sendNotFound(request);
  }
}

_isLoggedIn(HttpRequest request) async {
  var userTokenCookie =
      request.cookies.firstWhereOrNull((c) => c.name == 'userToken');
  if (userTokenCookie == null) {
    return false;
  }
  try {
    var decodedUserToken =
        json.decode(utf8.decode(base64.decode(userTokenCookie.value)));
    var count = await userSessions.count(where
        .eq('sessionToken', decodedUserToken['sessionToken'])
        .eq('username', decodedUserToken['username']));
    //if the cookie exists but not corresponding to a session just delete
    if (count == 0) {
      request.response.headers.set('Set-Cookie', 'userToken=;Max-Age=0');
    }
    return count > 0;
  } catch (e) {
    return false;
  }
}

_getUserName(HttpRequest request) async {
  var userTokenCookie =
      request.cookies.firstWhereOrNull((c) => c.name == 'userToken');
  if (userTokenCookie == null) {
    return null;
  }
  try {
    var decodedUserToken =
        json.decode(utf8.decode(base64.decode(userTokenCookie.value)));
    var count = await userSessions.count(where
        .eq('sessionToken', decodedUserToken['sessionToken'])
        .eq('username', decodedUserToken['username']));
    if (count >= 0) {
      return decodedUserToken['username'];
    }
  } catch (e) {
    return null;
  }
}

_logOut(HttpRequest request) async {
  var userTokenCookie =
      request.cookies.firstWhereOrNull((c) => c.name == 'userToken');
  if (userTokenCookie != null) {
    var decodedUserToken =
        json.decode(utf8.decode(base64.decode(userTokenCookie.value)));
    await userSessions.remove(where
        .eq('sessionToken', decodedUserToken['sessionToken'])
        .eq('username', decodedUserToken['username']));

    request.response.headers.set('Set-Cookie', 'userToken=;Max-Age=0');
  }
}

_sendNotFound(HttpRequest request) async {
  request.response.statusCode = HttpStatus.notFound;
  request.response.write(json.encode({'redirect': 'not-found.html'}));
  await request.response.close();
}
