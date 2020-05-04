const qif2json = require('./qif2json/index');
const fs = require('fs');

// const reader = fs.createReadStream(`./qif2json/test/files/utf8.qif`);
//
// // qif2json.parseFile('./qif2json/test/files/utf8.qif', function(err, qifData){
// qif2json.parseStream(reader, function (err, qifData) {

// Or to read in a file directly
qif2json.parseFile('./x.qif', function(err, qifData){
// qif2json.parseFile('./qif2json/test/files/accounts.qif', function(err, qifData){
    if(err) {
        console.log(err);
    } else {
        process.stdout.write(JSON.stringify(qifData));
    }
});
