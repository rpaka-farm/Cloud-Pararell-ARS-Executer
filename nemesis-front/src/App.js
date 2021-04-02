import './App.scss';
import React, {useEffect, useState} from 'react';
import AWS from 'aws-sdk';
import {MDCRipple} from '@material/ripple';
import {MDCTopAppBar} from '@material/top-app-bar';
import {MDCList} from "@material/list";
// import {MDCDrawer} from "@material/drawer";
import Dropzone from 'react-dropzone';
import MDSpinner from "react-md-spinner";
import axios from 'axios';

const FACADE_HOST = 'http://localhost:3031';
const facade = axios.create({
  baseURL: FACADE_HOST
});

function App() {
  const [srcfiles, setSrcfiles] = useState([{
    label: '取得中です...',
    status: 99
  }]);

  const [tasks, setTasks] = useState([{
    uuid: '---',
    srcFile: '取得中です...',
    status: 99
  }]);

  const updateSrcFiles = async function() {
    const items = await listSrcFiles();
    setSrcfiles(
      items.map((item) => {
        return {
          label: item.Key,
          status: 1
        }
      })
    );
  }

  const updateTask = async function() {
    const tasks = await listTasks();
    setTasks(
      tasks.map((task) => {
        return {
          uuid: task.id,
          srcFile: task.srcFile ?? 'ファイル名無し',
          status: task.status
        }
      })
    );
  }

  const addUploadingSrcFile = function(fileName) {
    const currentSrcFiles = [...srcfiles];
    currentSrcFiles.push({
      label: fileName,
      status: 0
    });
    console.log(currentSrcFiles);
    setSrcfiles(currentSrcFiles);
  }

  const addRegisteringTask = function(fileName) {
    const currentTasks = [...tasks];
    currentTasks.push({
      uuid: '生成中',
      srcFile: fileName,
      status: 0
    });
    setTasks(currentTasks);
    facade.post('/regtask', {
      srcfile: fileName
    }).then((res) => {
      console.log(res.data);
      updateTask();
    });
  }

  const addMetaExtractingTask = function(task) {
    let currentTasks = [...tasks];
    currentTasks = currentTasks.map((task_i) => {
      if (task_i.uuid === task.uuid) {
        task_i.status = 2;
      }
      return task_i;
    });
    setTasks(currentTasks);
    facade.post('/runmetaext', task).then((res) => {
      console.log(res.data);
      updateTask();
    });
  }

  window.onload = () => {
    console.log('Hello.');
    new MDCRipple(document.querySelector('.mdc-button'));
    new MDCTopAppBar(document.querySelector('.mdc-top-app-bar'));
    const list = new MDCList(document.querySelector('.mdc-list'));
    list.wrapFocus = true;
    // MDCDrawer.attachTo(document.querySelector('.mdc-drawer'));
  };

  useEffect(async () => {
    updateSrcFiles();
    updateTask();
    const res = await axios.get(`http://localhost:8080/status`);
    console.log(res.data);
  }, []);

  return (
    <div style={{display: 'flex', flexDirection: 'row', minHeight: '100vh'}}>
      <div>
        <aside className="mdc-drawer">
          <div className="mdc-drawer__header">
            <h3 className="mdc-drawer__title">Nemesis</h3>
            <h6 className="mdc-drawer__subtitle">ベータ版</h6>
          </div>
          <div className="mdc-drawer__content">
            <nav className="mdc-list">
              <a className="mdc-list-item mdc-list-item--activated" href="/" aria-current="page">
                <span className="mdc-list-item__ripple"></span>
                <i className="material-icons mdc-list-item__graphic" aria-hidden="true">inbox</i>
                <span className="mdc-list-item__text">Inbox</span>
              </a>
              <a className="mdc-list-item" href="/">
                <span className="mdc-list-item__ripple"></span>
                <i className="material-icons mdc-list-item__graphic" aria-hidden="true">send</i>
                <span className="mdc-list-item__text">Outgoing</span>
              </a>
              <a className="mdc-list-item" href="/">
                <span className="mdc-list-item__ripple"></span>
                <i className="material-icons mdc-list-item__graphic" aria-hidden="true">drafts</i>
                <span className="mdc-list-item__text">Drafts</span>
              </a>
            </nav>
          </div>
        </aside>
      </div>
      <div style={{flexGrow: 1}}>
        <header className="mdc-top-app-bar">
          <div className="mdc-top-app-bar__row">
            <section className="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">
              {/* <button className="material-icons mdc-top-app-bar__navigation-icon mdc-icon-button" aria-label="Open navigation menu">menu</button> */}
              <span className="mdc-top-app-bar__title">解析一覧</span>
            </section>
            <section className="mdc-top-app-bar__section mdc-top-app-bar__section--align-end" role="toolbar">
              {/* <button className="material-icons mdc-top-app-bar__action-item mdc-icon-button" aria-label="Favorite">favorite</button>
              <button className="material-icons mdc-top-app-bar__action-item mdc-icon-button" aria-label="Search">search</button>
              <button className="material-icons mdc-top-app-bar__action-item mdc-icon-button" aria-label="Options">more_vert</button> */}
            </section>
          </div>
        </header>
        <main className="mdc-top-app-bar--fixed-adjust">
          <div style={{padding: 10}}>
            <h1>ファイル一覧</h1>

            <Dropzone onDrop={acceptedFiles => uploadToCloud(acceptedFiles, () => {addUploadingSrcFile(acceptedFiles[0].name)}, () => {updateSrcFiles();})}>
              {({getRootProps, getInputProps}) => (
                <section>
                  <div {...getRootProps()}>
                    <input {...getInputProps()} />
                    <p style={{
                      backgroundColor: '#eeeeee',
                      paddingTop: 30,
                      paddingBottom: 30,
                      paddingRight: 10,
                      paddingLeft: 10,
                      border: '3px dotted #555555'
                    }}>追加するにはファイルをここにドラッグアンドドロップしてください。</p>
                  </div>
                </section>
              )}
            </Dropzone>

            <div>
              {
                srcfiles.map((srcfile, idx) => {
                  return <div key={idx} style={{display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%'}}>
                    <div style={{flexGrow: 1}}>{srcfile.label}</div>
                    {
                      srcfile.status === 0 || srcfile.status === 99 ? 
                        <div style={{marginRight: 10}}><MDSpinner /></div> : <></>
                    }
                    <div style={{marginRight: 10}}>
                      {
                        {
                          0: 'アップロード中',
                          1: 'タスク登録可能',
                          99: '---'
                        }[srcfile.status]
                      }
                    </div>
                    <div>
                      <div className="mdc-touch-target-wrapper">
                        <button className="mdc-button mdc-button--touch mdc-button--raised" onClick={
                          () => {
                            addRegisteringTask(srcfile.label);
                          }
                        } disabled={
                          {
                            0: true,
                            1: false,
                            99: true
                          }[srcfile.status]
                        }>
                          <span className="mdc-button__ripple"></span>
                          <span className="mdc-button__label"><b>
                          {
                            {
                              0: 'お待ちください',
                              1: 'タスク登録',
                              99: 'お待ちください'
                            }[srcfile.status]
                          }
                          </b></span>
                          <span className="mdc-button__touch"></span>
                        </button>
                      </div>
                    </div>
                  </div>
                })
              }
            </div>

            <h1>タスク一覧</h1>
            <div>
              {
                tasks.map((task, idx) => {
                  return <div key={idx} style={{display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%'}}>
                    <div style={{flexGrow: 1}}>
                      {task.srcFile}（UUID:{task.uuid}）
                    </div>
                    {
                      task.status === 0 || task.status === 2 || task.status === 4 || task.status === 99 ? 
                        <div style={{marginRight: 10}}><MDSpinner /></div> : <></>
                    }
                    <div style={{marginRight: 10}}>
                      {
                        {
                          0: '登録中...',
                          1: 'メタ情報抽出待機中',
                          2: 'メタ情報抽出中',
                          3: '解析待機中',
                          4: '解析中',
                          5: '解析完了',
                          99: '---'
                        }[task.status]
                      }
                    </div>
                    <div>
                      <div className="mdc-touch-target-wrapper">
                        <button disabled={
                          {
                            0: true,
                            1: false,
                            2: true,
                            3: false,
                            4: true,
                            5: false,
                            99: true,
                          }[task.status]
                        } className="mdc-button mdc-button--touch mdc-button--raised" onClick={
                          {
                            0: () => {},
                            1: () => {addMetaExtractingTask(task);}, //メタ情報抽出
                            2: () => {},
                            3: () => {},
                            4: () => {},
                            5: () => {},
                            99: () => {},
                          }[task.status]
                        }>
                          <span className="mdc-button__ripple"></span>
                          <span className="mdc-button__label"><b>
                          {
                            {
                              0: 'お待ちください',
                              1: 'メタ情報抽出開始',
                              2: 'お待ちください',
                              3: '解析開始',
                              4: 'お待ちください',
                              5: '解析結果DL',
                              99: 'お待ちください'
                            }[task.status]
                          }
                          </b></span>
                          <span className="mdc-button__touch"></span>
                        </button>
                      </div>
                    </div>
                  </div>
                })
              }
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function uploadToCloud(files, startCb = () => {}, finishCb = () => {}) {
  var bucketName = "stars-src";
  var bucketRegion = "us-east-1";
  var IdentityPoolId = "us-east-1:e303e91d-b49d-4fbb-99b0-7b37453e0516";

  AWS.config.update({
    region: bucketRegion,
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IdentityPoolId
    })
  });

  var s3 = new AWS.S3({
    apiVersion: "2006-03-01",
    params: { Bucket: bucketName }
  });

  if (!files.length) {
    return alert("Please choose a file to upload first.");
  }
  var file = files[0];
  var fileName = file.name;

  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: bucketName,
      Key: fileName,
      Body: file
    }
  });

  startCb();
  upload.promise().then(
    function(data) {
      finishCb();
    },
    function(err) {
      return alert("There was an error uploading your photo: ", err.message);
    }
  );
}

async function listSrcFiles() {
  var bucketName = "stars-src";
  var bucketRegion = "us-east-1";
  var IdentityPoolId = "us-east-1:e303e91d-b49d-4fbb-99b0-7b37453e0516";

  AWS.config.update({
    region: bucketRegion,
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IdentityPoolId
    })
  });

  var s3 = new AWS.S3({
    apiVersion: "2006-03-01",
    params: { Bucket: bucketName }
  });

  const res = await s3.listObjects({ Delimiter: "/" }).promise();
  return res.Contents;
}

async function listTasks() {
  const facadeRes = await facade.get('/tasklist');
  if (facadeRes.data) {
    if (facadeRes.data.success ?? false) {
      return facadeRes.data.items ?? [];
    } else {
      return [];
    }
  }
}

async function execMetaExtract() {
  
}

export default App;
