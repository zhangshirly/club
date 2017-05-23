var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport('SMTP',{
    host: 'smtp.qq.com',
    port: 465,
    secureConnection: true,
    auth: {
        user: 'system@imweb.io',
        pass: '123asdfasdf'
    }
});
var mailOptions = {
    from: 'system@imweb.io', // sender address
    to: 'webryan@foxmail.com', // list of receivers
    subject: 'Hello imweb.io 2', // Subject line
    text: 'Hello world ✔', // plaintext body
    html: '<b>Hello world, from system@imweb.io ✔</b>' // html body
};

transporter.sendMail(mailOptions, function(error, info){
    if(error){
        console.log(error);
    }else{
        console.log('Message sent: ' + info.response);
    }
});
