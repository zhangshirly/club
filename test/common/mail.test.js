var mail = require('../../common/mail');

describe('test/common/mail.test.js', function () {
  describe('sendActiveMail', function () {
    it('should ok', function () {
      mail.sendActiveMail('webryan@foxmail.com', 'token', 'henryguo');
    });
  });

  describe('sendResetPassMail', function () {
    it('should ok', function () {
      mail.sendResetPassMail('webryan@foxmail.com', 'token', 'henryguo');
    });
  });

});
