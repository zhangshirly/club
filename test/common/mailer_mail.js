var mail = require('../../common/mail');

console.log(mail);
var res =  mail.sendActiveMail('webryan@foxmail.com', 'token', 'henryguo');
console.log(res);
