import '../App.scss';
import React, {useEffect, useState} from 'react';
import AWS from 'aws-sdk';
import {MDCDialog} from '@material/dialog';
import {MDCTextField} from '@material/textfield';
import Dropzone from 'react-dropzone';
import MDSpinner from "react-md-spinner";
import {FacadeClient} from '../lib/apiClient';
import {FileStatus, FileStatusLabel, FileActionButton, TaskStatus, TaskStatusLabel, TaskActionButton} from '../lib/statusDefinition'

function MainPage() {
  const [srcfiles, setSrcfiles] = useState([{
    label: '取得中です...',
    status: FileStatus.INIT
  }]);

  const [tasks, setTasks] = useState([{
    uuid: '---',
    srcFile: '取得中です...',
    status: TaskStatus.INIT
  }]);

  const [dialog, setdialog] = useState(undefined);
  const [dialogtfs, setdialogtfs] = useState([]);

  const updateSrcFiles = async function() {
    const items = await listSrcFiles();
    setSrcfiles(
      items.map((item) => {
        return {
          label: item.Key,
          status: FileStatus.READY
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
      status: FileStatus.UPLOADING
    });
    setSrcfiles(currentSrcFiles);
  }

  const addRegisteringTask = function(fileName) {
    const currentTasks = [...tasks];
    currentTasks.push({
      uuid: '生成中',
      srcFile: fileName,
      status: TaskStatus.REGISTERING
    });
    setTasks(currentTasks);
    FacadeClient.registerTask(fileName).then(() => {
      updateTask();
    });
  }

  const addMetaExtractingTask = function(task) {
    let currentTasks = [...tasks];
    currentTasks = currentTasks.map((task_i) => {
      if (task_i.uuid === task.uuid) {
        task_i.status = TaskStatus.META_EXTRACTING;
      }
      return task_i;
    });
    setTasks(currentTasks);
    FacadeClient.metaDataExtract(task).then((res) => {
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
      if (c_t_task.status !== TaskStatus.READY_FOR_EXECUTE) {
        window.setTimeout(() => metaExtractWaitLoop(t_task), 5000);
      } else {
        await updateTask();
      }
    }
  }

  const openRunTaskDialog = function (uuid) {
    if (dialogtfs.length === 5) {
      dialogtfs[4].value = uuid;
    }
    dialog.open();
  };

  // eslint-disable-next-line
  const addEsecuteTask = async function (option) {
    let currentTasks = await listTasks();
    currentTasks = currentTasks.map((task_i) => {
      if (task_i.uuid === option.uuid) {
        task_i.status = TaskStatus.EXECUTING;
      }
      return task_i;
    });
    setTasks(currentTasks);
    FacadeClient.execute(option).then((res) => {
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
      if (c_t_task.status !== TaskStatus.DONE_EXECUTE) {
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

  // window.onload = () => {
  //   let bs = [];
  //   document.querySelectorAll('.mdc-button').forEach((elem) => {bs.push(new MDCRipple(elem));});
  //   new MDCTopAppBar(document.querySelector('.mdc-top-app-bar'));
  //   const list = new MDCList(document.querySelector('.mdc-list'));
  //   list.wrapFocus = true;
  // };

  useEffect(() => {
    const fn = async () => {
      updateSrcFiles();
      await updateTask();
      let ts = [];
      document.querySelectorAll('.mdc-text-field').forEach((elem) => {ts.push(new MDCTextField(elem));});
      setdialogtfs(ts);
      const dialog_i = new MDCDialog(document.querySelector('.mdc-dialog'));
      setdialog(dialog_i);
    };
    fn();
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
            option[what[i]] = (i !== 4) ? Number(t.value) : t.value;
          });
          addEsecuteTask(option);
        }
      });
    }
  }, [dialog, dialogtfs, addEsecuteTask]);

  return (
    <main className="mdc-top-app-bar--fixed-adjust">
      <div style={{padding: 10}}>
        <h1>ファイル一覧</h1>

        <Dropzone onDrop={acceptedFiles => uploadToCloud(acceptedFiles, () => {addUploadingSrcFile(acceptedFiles[0].name)}, () => {updateSrcFiles();})}>
          {({getRootProps, getInputProps}) => (
            <section>
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <p className="dand">追加するにはファイルをここにドラッグアンドドロップしてください。</p>
              </div>
            </section>
          )}
        </Dropzone>

        <div>
          {
            srcfiles.map((srcfile, idx) => {
              return <div key={idx} style={{display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%'}}>
                <div style={{flexGrow: 1}}>{srcfile.label}</div>
                  {(FileActionButton[srcfile.status]).wait ?? false ? <div style={{marginRight: 10}}><MDSpinner /></div> : <></>}
                <div style={{marginRight: 10}}>
                  {FileStatusLabel[srcfile.status]}
                </div>
                <div>
                  <div className="mdc-touch-target-wrapper">
                    <button className="mdc-button mdc-button--touch mdc-button--raised" onClick={
                      () => {
                        addRegisteringTask(srcfile.label);
                      }
                    } disabled={
                      (FileActionButton[srcfile.status]).wait ?? false
                    }>
                      <span className="mdc-button__ripple"></span>
                      <span className="mdc-button__label"><b>
                      {
                        (FileActionButton[srcfile.status]).label ?? '不明な状態'
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
                {(TaskActionButton[task.status]).wait ?? false ? <div style={{marginRight: 10}}><MDSpinner /></div> : <></>}
                <div style={{marginRight: 10}}>
                  {TaskStatusLabel[task.status]}
                </div>
                <div>
                  <div className="mdc-touch-target-wrapper">
                    <button
                      disabled={(TaskActionButton[task.status]).wait ?? false}
                      className="mdc-button mdc-button--touch mdc-button--raised"
                      onClick={
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
                      <span className="mdc-button__label">
                        <b>
                        {(TaskActionButton[task.status]).label ?? '不明な状態'}
                        </b>
                      </span>
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
  const facadeRes = await FacadeClient.listAllTask();
  if (facadeRes.data) {
    if (facadeRes.data.success ?? false) {
      return facadeRes.data.items ?? [];
    } else {
      return [];
    }
  }
}

export default MainPage;