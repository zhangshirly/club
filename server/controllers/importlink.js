var request = require('request');
var html2markdown = require('html2markdown');

exports.getPageInfo = function (req, res, next) {
  var url = req.query.link;
  var parserUrl =  'https://readability.com/api/content/v1/parser';

    request({
        url : parserUrl+'?url='+url+'&token=f1aa7f8c46e7255170fb00ff90248fbcdc8f9c77'
    }, function(err , result , body){
    if(err){
      console.log('readability request error', err);
    }
    else{
      if(result.statusCode == 200){
        var title = JSON.parse(result.body).title;
        var content = html2markdown(JSON.parse(result.body).content);
        short_url = JSON.parse(result.body).short_url;
    
        res.writeHead(200, {"content-type":'application/json'});
        res.end(JSON.stringify({'title':title, 'content':content}));
      }
      else{
        console.log(result.statusCode);
      }
    }
    });
}






