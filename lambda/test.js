const {handler} = require('./index');
handler({
  path: '/regtask',
  httpMethod: 'POST',
  body: {
    srcfile: 'unko'
  }
},{});