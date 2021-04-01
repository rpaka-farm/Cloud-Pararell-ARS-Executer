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

const FACADE_HOST = 'localhost:3031';

function App() {
  const facade = axios.create({
    baseURL: FACADE_HOST
  });

  const [srcfiles, setSrcfiles] = useState([{
    label: 'DUMMY',
    status: 0
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
    facade.post('/')
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
                      srcfile.status === 0 ? 
                        <div style={{marginRight: 10}}><MDSpinner /></div> : <></>
                    }
                    <div style={{marginRight: 10}}>
                      {
                        srcfile.status === 0 ? 
                          "アップロード中" : "タスク登録可能"
                      }
                    </div>
                    <div>
                      <div className="mdc-touch-target-wrapper">
                        <button className="mdc-button mdc-button--touch mdc-button--raised">
                          <span className="mdc-button__ripple"></span>
                          <span className="mdc-button__label"><b>タスク登録</b></span>
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

async function execMetaExtract() {
  
}

export default App;
