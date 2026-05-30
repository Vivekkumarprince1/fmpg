/**
 * Simple flash middleware to replace connect-flash
 * Since connect-flash uses deprecated util.isArray
 */
module.exports = function flash() {
  return function(req, res, next) {
    if (req.flash) return next();

    req.flash = function(type, msg) {
      if (this.session === undefined) throw new Error('req.flash() requires sessions');

      var msgs = this.session.flash = this.session.flash || {};

      if (type && msg) {
        if (Array.isArray(msg)) {
          msg.forEach(function(val) {
            (msgs[type] = msgs[type] || []).push(val);
          });
          return msgs[type].length;
        }
        return (msgs[type] = msgs[type] || []).push(msg);
      } else if (type) {
        var arr = msgs[type];
        delete msgs[type];
        return arr || [];
      } else {
        this.session.flash = {};
        return msgs;
      }
    };

    next();
  };
};