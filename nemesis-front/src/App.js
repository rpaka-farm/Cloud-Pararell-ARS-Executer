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

function App() {
  const [srcfiles, setSrcfiles] = useState([{
    label: 'DUMMY',
    status: 0
  }]);

  window.onload = () => {
    console.log('Hello.');
    new MDCRipple(document.querySelector('.mdc-button'));
    new MDCTopAppBar(document.querySelector('.mdc-top-app-bar'));
    const list = new MDCList(document.querySelector('.mdc-list'));
    list.wrapFocus = true;
    // MDCDrawer.attachTo(document.querySelector('.mdc-drawer'));
  };

  useEffect(async () => {
    const items = await listSrcFiles();
    setSrcfiles(
      items.map((item) => {
        return {
          label: item.Key,
          status: 0
        }
      })
    );
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
            <Dropzone onDrop={acceptedFiles => uploadToCloud(acceptedFiles)}>
              {({getRootProps, getInputProps}) => (
                <section>
                  <div {...getRootProps()}>
                    <input {...getInputProps()} />
                    <p>追加するにはファイルをここにドラッグアンドドロップしてください。</p>
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
                      srcfile.status === 1 ? 
                        <div style={{marginRight: 10}}><MDSpinner /></div> : <></>
                    }
                    <div style={{marginRight: 10}}>
                      {
                        srcfile.status === 0 ? 
                        "解析待機中" : "解析中"
                      }
                    </div>
                    <div>
                      <div className="mdc-touch-target-wrapper">
                        <button className="mdc-button mdc-button--touch mdc-button--raised">
                          <span className="mdc-button__ripple"></span>
                          <span className="mdc-button__label"><b>解析開始</b></span>
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

function uploadToCloud(files) {
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

  var promise = upload.promise();

  promise.then(
    function(data) {
      alert("Successfully uploaded photo.");
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
