import axios from 'axios';

// const FACADE_HOST = 'http://localhost:3031';
const FACADE_HOST = 'https://api.nemesis.rpaka.dev';

async function extract(fn) {
  try {
    const res = await fn();
    if (res.data) {
      return res.data;
    } else {
      return {
        success: false,
        reason: "ネットワークエラー"
      }
    }
  } catch (e) {
    return {
      success: false,
      reason: "ネットワークエラー"
    }
  }
}

const facade = axios.create({
  baseURL: FACADE_HOST
});
const FacadeClient = {
  registerTask: (fileName) => {
    return extract(() => facade.post('/regtask', {
      srcfile: fileName
    }));
  },
  metaDataExtract: (task) => {
    return extract(() => facade.post('/runmetaext', task));
  },
  execute: (option) => {
    return extract(() => facade.post('/runtask', option));
  },
  listAllTask: () => {
    return extract(() => facade.get('/tasklist'));
  }
}

export {FacadeClient};