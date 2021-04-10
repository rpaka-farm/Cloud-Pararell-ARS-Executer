import '../App.scss';
import React, {useEffect, useState, useCallback} from 'react';
import AWS from 'aws-sdk';
import {MDCDialog} from '@material/dialog';
import {MDCTextField} from '@material/textfield';
import {MDCSnackbar} from '@material/snackbar';
import Dropzone from 'react-dropzone';
import MDSpinner from "react-md-spinner";
import {FacadeClient} from '../lib/apiClient';
import {FileStatus, FileStatusLabel, FileActionButton, TaskStatus, TaskStatusLabel, TaskActionButton} from '../lib/statusDefinition';
import {updateLocalItemStatus, getSpecificUuidItem, waitFotStatusChanged} from '../lib/util';

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
  const [snackBar, setSnackBar] = useState(undefined);

  const showSnackBar = useCallback(function(labelText) {
    if (snackBar) {
      snackBar.labelText = labelText;
      snackBar.open();
    }
  }, [snackBar]);

  const updateSrcFiles = useCallback(async function() {
    const res = await listSrcFiles();
    if (res.success) {
      setSrcfiles(
        res.files.map((item) => {
          return {
            label: item.Key,
            status: FileStatus.READY
          }
        })
      );
    } else {
      setSrcfiles([]);
      showSnackBar("ファイル一覧の取得に失敗しました");
    }
  }, [setSrcfiles, showSnackBar]);

  const updateTask = useCallback(async function() {
    const ctasks = await listTasks();
    if (ctasks.success) {
      setTasks(
        ctasks.items.map((task) => {
          return {
            uuid: task.id,
            srcFile: task.srcFile ?? 'ファイル名無し',
            status: task.status
          }
        })
      );
    } else {
      setTasks([]);
      showSnackBar("タスク一覧の取得に失敗しました");
    }
  }, [setTasks, showSnackBar]);

  const addUploadingSrcFile = async function(file) {
    const fileName = file.name;
    const currentSrcFiles = [...srcfiles];
    currentSrcFiles.push({
      label: fileName,
      status: FileStatus.UPLOADING
    });
    setSrcfiles(currentSrcFiles);

    const uploadRes = await uploadToCloud(file);
    if (!uploadRes.success) {
      showSnackBar(uploadRes.reason);
    }
    updateSrcFiles();
  }

  const addRegisteringTask = async function(fileName) {
    const currentTasks = [...tasks];
    currentTasks.push({
      uuid: '生成中',
      srcFile: fileName,
      status: TaskStatus.REGISTERING
    });
    setTasks(currentTasks);
    const facadeRes = await FacadeClient.registerTask(fileName);
    if (!facadeRes.success) {
      showSnackBar(facadeRes.reason);
    }
    updateTask();
  }

  const addMetaExtractingTask = async function(task) {
    updateLocalItemStatus(tasks, setTasks, task.uuid, TaskStatus.META_EXTRACTING);
    const facadeRes = await FacadeClient.metaDataExtract(task);
    console.log(facadeRes);
    if (facadeRes.success) {
      showSnackBar("メタ情報の抽出を実行中です。この操作には時間がかかります。");
      waitFotStatusChanged(listTasks, task.uuid, TaskStatus.READY_FOR_EXECUTE, updateTask);
    } else {
      showSnackBar(facadeRes.reason);
      updateTask();
    }
  }

  const openRunTaskDialog = function (uuid) {
    if (dialogtfs.length === 6) {
      dialogtfs[5].value = uuid;
    }
    dialog.open();
  };

  // eslint-disable-next-line
  const addEsecuteTask = async function (option) {
    let tasks = await listTasks();
    tasks.items = tasks.items.map((task) => {task.uuid = task.id; return task;});
    updateLocalItemStatus(tasks.items, setTasks, option.uuid, TaskStatus.EXECUTING);
    const facadeRes = await FacadeClient.execute(option);
    if (facadeRes.success) {
      showSnackBar("解析を実行中です。この操作には時間がかかります。");
      waitFotStatusChanged(listTasks, option.uuid, TaskStatus.DONE_CONCAT, updateTask)
    } else {
      showSnackBar(facadeRes.reason);
      updateTask();
    }
  };

  const dlResFile = async function(t_task) {
    updateLocalItemStatus(tasks, setTasks, t_task.uuid, TaskStatus.DL_RESULT);
    showSnackBar("ダウンロードURLを取得中です。しばらくお待ちください。");
    const c_t_task = await getSpecificUuidItem(listTasks, t_task.uuid);
    if (c_t_task && c_t_task.resFile) {
      window.open(`https://stars-res.s3.amazonaws.com/${c_t_task.resFile}`);
    } else {
      showSnackBar('結果ファイルの情報の取得に失敗しました。');
    }
    updateTask();
  }

  // window.onload = () => {
  //   let bs = [];
  //   document.querySelectorAll('.mdc-button').forEach((elem) => {bs.push(new MDCRipple(elem));});
  //   new MDCTopAppBar(document.querySelector('.mdc-top-app-bar'));
  //   const list = new MDCList(document.querySelector('.mdc-list'));
  //   list.wrapFocus = true;
  // };

  useEffect(() => {
    const run = async () => {
      const snackbar_i = new MDCSnackbar(document.querySelector('.mdc-snackbar'));
      setSnackBar(snackbar_i);
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      updateSrcFiles();
      await updateTask();
      let ts = [];
      document.querySelectorAll('.mdc-text-field').forEach((elem) => {ts.push(new MDCTextField(elem));});
      setdialogtfs(ts);
      const dialog_i = new MDCDialog(document.querySelector('.mdc-dialog'));
      setdialog(dialog_i);
    };
    if (snackBar) {
      run();
    }
  }, [snackBar, updateSrcFiles, updateTask]);

  useEffect(() => {
    if (dialog) {
      dialog.listen('MDCDialog:closed', (ev) => {
        if (ev.detail.action === "accept") {
          const option = {};
          dialogtfs.forEach((t,i) => {
            const what = [
              'window_size', 'overlap',
              'min_port', 'max_port',
              'parallel_num', 'uuid'
            ];
            option[what[i]] = (i !== 5) ? Number(t.value) : t.value;
          });
          addEsecuteTask(option);
        }
      });
    }
  }, [dialog, addEsecuteTask, dialogtfs]);

  return (
    <main className="mdc-top-app-bar--fixed-adjust">
      <div style={{padding: 10}}>
        <h1>ファイル一覧</h1>

        <Dropzone onDrop={acceptedFiles => addUploadingSrcFile(acceptedFiles[0])}>
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
                          5: () => {},
                          6: () => {},
                          7: () => {dlResFile(task)}, //結果DL
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
                <span className="mdc-floating-label" id="starsconf::parallel_num">並列数</span>
                <input className="mdc-text-field__input" type="number" />
                <span className="mdc-line-ripple"></span>
              </label>
              <div className="mdc-text-field-helper-line">
                <div className="mdc-text-field-helper-text" aria-hidden="true">STARSを並列解析するコンテナの数です</div>
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

      <div className="mdc-snackbar">
        <div className="mdc-snackbar__surface" role="status" aria-relevant="additions">
          <div className="mdc-snackbar__label" aria-atomic="false">
            バナーメッセージ
          </div>
          <div className="mdc-snackbar__actions" aria-atomic="true">
            <button type="button" className="mdc-button mdc-snackbar__action">
              <div className="mdc-button__ripple"></div>
              <span className="mdc-button__label">OK</span>
            </button>
          </div>
        </div>
      </div>

    </main>
  );
}

async function uploadToCloud(file) {
  var bucketName = "stars-src";
  var bucketRegion = "us-east-1";
  var IdentityPoolId = "us-east-1:e303e91d-b49d-4fbb-99b0-7b37453e0516";

  AWS.config.update({
    region: bucketRegion,
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IdentityPoolId
    })
  });

  if (!file) {
    return {
      success: false,
      reason: "ファイルを選んでください"
    };
  }
  var fileName = file.name;

  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: bucketName,
      Key: fileName,
      Body: file
    }
  });

  try {
    await upload.promise();
    return {
      success: true
    };
  } catch (e) {
    return {
      success: false,
      reason: `S3へのアップロードに失敗しました。`
    };
  }
}

async function listSrcFiles() {
  var bucketName = "stars-src";
  var bucketRegion = "us-east-1";
  var IdentityPoolId = "us-east-1:e303e91d-b49d-4fbb-99b0-7b37453e0516";

  try {
    const c = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IdentityPoolId
    });

    AWS.config.update({
      region: bucketRegion,
      credentials: c
    });
  
    var s3 = new AWS.S3({
      apiVersion: "2006-03-01",
      params: { Bucket: bucketName }
    });
  
    const res = await s3.listObjects({ Delimiter: "/" }).promise();
    return {
      success: true,
      files: res.Contents
    };
  } catch (e) {
    return {
      success: false
    }
  }
}

function listTasks() {
  return FacadeClient.listAllTask();
}

export default MainPage;