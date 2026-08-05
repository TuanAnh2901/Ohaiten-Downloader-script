import fs from 'node:fs';
const c = fs.readFileSync('FB_websource/www.facebook.com/static.xx.fbcdn.net/rsrc.php/v4ipUn4/yz/l/vi_VN-j/UCIo_-zQ5Sp.js', 'utf8');
const i = c.indexOf('CometSaveCollectionAllItemsPaginationQuery.graphql');
console.log(c.slice(i, i + 4500));
