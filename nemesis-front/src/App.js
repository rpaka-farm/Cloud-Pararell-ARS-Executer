import './App.scss';
import React, {useEffect, useState} from 'react';
import AWS from 'aws-sdk';
import {MDCRipple} from '@material/ripple';
import {MDCTopAppBar} from '@material/top-app-bar';
import {MDCList} from "@material/list";
import {MDCDialog} from '@material/dialog';
import {MDCTextField} from '@material/textfield';
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

  const [dialog, setdialog] = useState(undefined);
  const [dialogtfs, setdialogtfs] = useState([]);

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
    const ctasks = await listTasks();
    setTasks(
      ctasks.map((task) => {
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
      if (res.data.success) {
        metaExtractWaitLoop(task);
      } else {
        updateTask();
      }
    });
  }

  let metaExtractWaitLoop = async function(t_task) {
    let tasks = await listTasks();
    tasks = tasks.map((task) => {
      return {
        uuid: task.id,
        srcFile: task.srcFile ?? 'ファイル名無し',
        status: task.status
      }
    });
    const c_t_task = (tasks.filter((task) => task.uuid === t_task.uuid))[0];
    if (c_t_task) {
      if (c_t_task.status !== 3) {
        window.setTimeout(() => metaExtractWaitLoop(t_task), 5000);
      } else {
        await updateTask();
      }
    }
  }

  const openRunTaskDialog = function (uuid) {
    if (dialogtfs.length == 5) {
      dialogtfs[4].value = uuid;
    }
    dialog.open();
  };

  const addEsecuteTask = async function (option) {
    let currentTasks = await listTasks();
    currentTasks = currentTasks.map((task_i) => {
      if (task_i.uuid === option.uuid) {
        task_i.status = 4;
      }
      return task_i;
    });
    setTasks(currentTasks);
    facade.post('/runtask', option).then((res) => {
      if (res.data.success) {
        executeWaitLoop(option);
      } else {
        updateTask();
      }
    });
  };

  let executeWaitLoop = async function(option) {
    let tasks = await listTasks();
    tasks = tasks.map((task) => {
      return {
        uuid: task.id,
        status: task.status
      }
    });
    const c_t_task = (tasks.filter((task) => task.uuid === option.uuid))[0];
    if (c_t_task) {
      if (c_t_task.status !== 5) {
        window.setTimeout(() => executeWaitLoop(option), 10000);
      } else {
        await updateTask();
      }
    }
  }

  const dlResFile = async function(t_task) {
    let tasks = await listTasks();
    tasks = tasks.map((task) => {
      return {
        uuid: task.id,
        resFile: task.resFile
      }
    });
    const c_t_task = (tasks.filter((task) => task.uuid === t_task.uuid))[0];
    if (c_t_task && c_t_task.resFile) {
      window.open(`https://stars-res.s3.amazonaws.com/${c_t_task.resFile}`);
    }
  }

  window.onload = () => {
    let bs = [];
    document.querySelectorAll('.mdc-button').forEach((elem) => {bs.push(new MDCRipple(elem));});
    new MDCTopAppBar(document.querySelector('.mdc-top-app-bar'));
    const list = new MDCList(document.querySelector('.mdc-list'));
    list.wrapFocus = true;
  };

  useEffect(async () => {
    updateSrcFiles();
    await updateTask();
    let ts = [];
    document.querySelectorAll('.mdc-text-field').forEach((elem) => {ts.push(new MDCTextField(elem));});
    setdialogtfs(ts);
    const dialog_i = new MDCDialog(document.querySelector('.mdc-dialog'));
    setdialog(dialog_i);
  }, []);

  useEffect(() => {
    if (dialog) {
      dialog.listen('MDCDialog:closed', (ev) => {
        if (ev.detail.action === "accept") {
          const option = {};
          dialogtfs.forEach((t,i) => {
            const what = [
              'window_size', 'overlap',
              'min_port', 'max_port',
              'uuid'
            ];
            option[what[i]] = (i != 4) ? Number(t.value) : t.value;
          });
          addEsecuteTask(option);
        }
      });
    }
  }, [dialog, dialogtfs]);

  return (
    <div style={{display: 'flex', flexDirection: 'row', minHeight: '100vh'}}>
      <button onClick={() => {metaExtractWaitLoop({uuid: '24cf3184-9ff4-41e5-af6a-abc7a111868e'})}}>A</button>
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
                            3: () => {openRunTaskDialog(task.uuid);}, //解析
                            4: () => {},
                            5: () => {dlResFile(task)}, //結果DL
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

          <div className="mdc-dialog">
            <div className="mdc-dialog__container">
              <div className="mdc-dialog__surface"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="my-dialog-title"
                aria-describedby="my-dialog-content">
                <h2 className="mdc-dialog__title" id="my-dialog-title">STARS解析設定</h2>
                <div className="mdc-dialog__content" id="my-dialog-content">
                  <label className="mdc-text-field mdc-text-field--filled">
                    <span className="mdc-text-field__ripple"></span>
                    <span className="mdc-floating-label" id="starsconf::window_size">ウィンドウサイズ</span>
                    <input className="mdc-text-field__input" type="number" />
                    <span className="mdc-line-ripple"></span>
                  </label>
                  <div className="mdc-text-field-helper-line">
                    <div className="mdc-text-field-helper-text" aria-hidden="true">ARSを一回実行するのに使うサンプル数です</div>
                  </div>

                  <label className="mdc-text-field mdc-text-field--filled">
                    <span className="mdc-text-field__ripple"></span>
                    <span className="mdc-floating-label" id="starsconf::overlap">オーバーラップ</span>
                    <input className="mdc-text-field__input" type="number" />
                    <span className="mdc-line-ripple"></span>
                  </label>
                  <div className="mdc-text-field-helper-line">
                    <div className="mdc-text-field-helper-text" aria-hidden="true">ウィンドウをどれだけ重ねて移動させるかのサンプル数です</div>
                  </div>

                  <label className="mdc-text-field mdc-text-field--filled">
                    <span className="mdc-text-field__ripple"></span>
                    <span className="mdc-floating-label" id="starsconf::min_port">ARS最小ポート</span>
                    <input className="mdc-text-field__input" type="number" />
                    <span className="mdc-line-ripple"></span>
                  </label>
                  <div className="mdc-text-field-helper-line">
                    <div className="mdc-text-field-helper-text" aria-hidden="true">ARSを適用する最小の周期のサンプル数です</div>
                  </div>

                  <label className="mdc-text-field mdc-text-field--filled">
                    <span className="mdc-text-field__ripple"></span>
                    <span className="mdc-floating-label" id="starsconf::max_port">ARS最大ポート</span>
                    <input className="mdc-text-field__input" type="number" />
                    <span className="mdc-line-ripple"></span>
                  </label>
                  <div className="mdc-text-field-helper-line">
                    <div className="mdc-text-field-helper-text" aria-hidden="true">ARSを適用する最大の周期のサンプル数です</div>
                  </div>

                  <label className="mdc-text-field mdc-text-field--filled">
                    <span className="mdc-text-field__ripple"></span>
                    <span className="mdc-floating-label" id="starsconf::uuid">UUID</span>
                    <input className="mdc-text-field__input" disabled={true} />
                    <span className="mdc-line-ripple"></span>
                  </label>
                </div>
                <div className="mdc-dialog__actions">
                  <button type="button" className="mdc-button mdc-dialog__button" data-mdc-dialog-action="close">
                    <div className="mdc-button__ripple"></div>
                    <span className="mdc-button__label">キャンセル</span>
                  </button>
                  <button type="button" className="mdc-button mdc-dialog__button" data-mdc-dialog-action="accept">
                    <div className="mdc-button__ripple"></div>
                    <span className="mdc-button__label">実行</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="mdc-dialog__scrim"></div>
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
