// base58 encoding
var codeStr = '123456789abcdefghijklmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
var base = codeStr.length;

function encodeID(num){
  var result = '';
  while (num) {
    var remainder = num % base;
    num = Math.floor(num / base);
    result = codeStr[remainder].toString() + result;
  }
  return result;
}

module.exports.encodeID = encodeID;