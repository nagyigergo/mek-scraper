const request= require('request');
const htmlparser = require("cheerio");
const iconv  = require('iconv-lite');
const charsetParser = require('charset-parser');
const cheerio = require('cheerio');
const express = require('express');
const app = express();
const port = 3984;

app.use(express.static('public'));
app.get('/book/', (req, myresponse) => {
  console.log(req.query);
  console.log(req.params);
  if (req.query.url) {
    let param = req.query.url.replace(/^http:\/\/mek\.oszk\.hu\//,"");
    request('http://mek.oszk.hu/' + param, {encoding: 'binary'}, function (error, response, binary) {
      if (!error && response.statusCode == 200) {

        var charset = charsetParser(response.headers['content-type'], binary, 'iso-8859-2');
        var html = iconv.decode(binary, charset);
        const $ = cheerio.load(html,{ decodeEntities: false });

        myresponse.write(`
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="stylesheet" href="style.css">
        </head>`);
        myresponse.write($('body').html());
        myresponse.write('</html>');
        myresponse.end();
      }
      else {
        console.log("Error "+response.statusCode);
      }
    });
  }

})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
