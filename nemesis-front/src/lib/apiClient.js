import axios from 'axios';

const FACADE_HOST = 'http://localhost:3031';
const facade = axios.create({
  baseURL: FACADE_HOST
});
const FacadeClient = {
  registerTask: (fileName) => {
    return facade.post('/regtask', {
      srcfile: fileName
    });
  },
  metaDataExtract: (task) => {
    return facade.post('/runmetaext', task);
  },
  execute: (option) => {
    return facade.post('/runtask', option);
  },
  listAllTask: () => {
    return facade.get('/tasklist');
  }
}

export {FacadeClient};