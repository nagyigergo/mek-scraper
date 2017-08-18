const request= require('request');
const htmlparser = require("cheerio");
const iconv  = require('iconv-lite');
const charsetParser = require('charset-parser');
const cheerio = require('cheerio');
const express = require('express');
const compression = require('compression');
const redis = require("redis");
const app = express();
const port = 3984;

var client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

app.use(compression({
  filter: function () { return true; }
}));

app.use(express.static('public',{
  maxage: '1y'
}));

app.use(function (req, res, next) {
  res.setHeader('Cache-Control', 'public, max-age=31557600');
  res.setHeader('Content-Type','text/html');
  next();
});

app.set('etag', 'weak');

app.get('/book/', (req, res) => {
  console.log(req.query);
  console.log(req.params);

  if (req.query.url) {
    let param = req.query.url.replace(/^http:\/\/mek\.oszk\.hu\//,"");

    client.get(param, function(err, reply) {
      if (!reply){
        console.log('scraping mek');
        request('http://mek.oszk.hu/' + param, {encoding: 'binary'}, function (error, response, binary) {
          if (!error && response.statusCode == 200) {

            res.setHeader('Last-Modified', (new Date()).toUTCString());
            if (response.headers['last-modified']) res.setHeader('Last-Modified', response.headers['last-modified']);
            if (req.get('If-Modified-Since')==response.headers['last-modified']) res.status(304);

            var charset = charsetParser(response.headers['content-type'], binary, 'iso-8859-2');
            var html = iconv.decode(binary, charset);
            const $ = cheerio.load(html,{ decodeEntities: false });
            $('img').map(function( index,value ) {
              $( this ).attr("src",function(index,currentvalue){
                console.log('http://mek.oszk.hu/' + param + currentvalue);
                return 'http://mek.oszk.hu/' + param + currentvalue;
              });
            });
            client.set(param, JSON.stringify({lastModified:response.headers['last-modified'],data:$('body').html()}));

            answerBook(res,$('body').html());


          }
          else {
            console.log("Error "+response.statusCode);
          }
        });
      } else {
        console.log('Redis reply found');

        var redisData = JSON.parse(reply);

        if (redisData.lastModified) {
          if (req.get('If-Modified-Since')==redisData.lastModified) res.status(304);
          res.setHeader('Last-Modified', redisData.lastModified);
        }

        if (redisData.data) answerBook(res,redisData.data);
      }

    });


  } else {
    res.send('Not found');
  }

})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
});

function answerBook(res,body){
  res.write(`
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="style.css">
  </head>`);
  res.write(body);
  res.write('</html>');
  res.end();
}
