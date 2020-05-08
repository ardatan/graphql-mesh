
var https = require('https');

var options = {
  'method': 'POST',
  'hostname': 'services.odata.org',
  'path': '/TripPinRESTierService/(S(ywuqmcg4nghokmc0ayqbdo1b))/$batch',
  'headers': {
    'Content-Type': 'multipart/mixed;boundary=batch_823813b2-c9ac-406d-8b12-b75794eb9ed0'
  },
};

var req = https.request(options, function (res) {
  var chunks = [];

  res.on("data", function (chunk) {
    chunks.push(chunk);
  });

  res.on("end", function (chunk) {
    var body = Buffer.concat(chunks);
    console.log(body.toString());
  });

  res.on("error", function (error) {
    console.error(error);
  });
});

var postData =  `
--batch_823813b2-c9ac-406d-8b12-b75794eb9ed0
Content-Type: application/http
Content-Transfer-Encoding:binary

GET https://services.odata.org/TripPinRESTierService/People HTTP/1.1
accept: application/json;odata.metadata=minimal

--batch_823813b2-c9ac-406d-8b12-b75794eb9ed0
Content-Type: application/http
Content-Transfer-Encoding:binary

GET https://services.odata.org/TripPinRESTierService/Me HTTP/1.1
accept: application/json;odata.metadata=minimal

--batch_823813b2-c9ac-406d-8b12-b75794eb9ed0--
`;

req.write(postData);

req.end();