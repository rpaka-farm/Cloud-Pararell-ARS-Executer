const AWS = require('aws-sdk');
const uuid = require('uuid');
const axios = require('axios');
const dotenv = require('dotenv');
const debug = require('debug')('debug-name');
dotenv.config();

const DEV_EXEC_HOST = "234ec2867024.ngrok.io";

/*
{ name: 'privateDnsName', value: 'ip-10-0-0-91.ec2.internal' }
{ name: 'privateDnsName', value: 'ip-10-0-1-121.ec2.internal' }
*/

async function main(event, context) {
  try {
    const ddb = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'});
    let {path, httpMethod, body} = event;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    if (path == '/tasklist' && httpMethod == 'GET') {
      const ddbres = await ddb.scan({
        TableName : 'nemesis-task'
      }).promise();
      return makeResponse({
        success: true,
        items: ddbres.Items
      });
    } else if (path == '/task' && httpMethod == 'POST') {
      const uid = body.uuid;
      const ddbres = await ddb.get({
        TableName : 'nemesis-task',
        Key: {
          id: uid
        }
      }).promise();
      return makeResponse({
        success: true,
        ...ddbres.Item
      });
    } else if (path == '/regtask' && httpMethod == 'POST') {
      const {srcfile} = body;
      console.log(srcfile);

      //解析対象データの存在を確認
      try {
        var params = {
          Bucket: "stars-src",
          Key: srcfile
        };
        var s3 = new AWS.S3({region: 'us-east-1'});
        const s3testRes = await s3.getObject(params).promise();
      } catch (e) {
        debug(e);
        return makeResponse({
          success: false,
          reason: "解析対象ファイルが見つかりませんでした"
        });
      }

      const uid = uuid.v4();
      await ddb.put({
        TableName : 'nemesis-task',
        Item: {
          id: uid,
          srcFile: srcfile,
          status: 1
        }
      }).promise();

      return makeResponse({
        success: true,
        uuid: uid
      });
    } else if (path == '/runmetaext' && httpMethod == 'POST') {
      const uid = body.uuid;

      //解析可能な状態かを確認
      console.log('AAc');
      var status = await takeContainerStatus();
      if (!status.allIdle) {
        return makeResponse({
          success: false,
          reason: "解析中です"
        });
      }

      // メタデータの抽出を依頼
      console.log('AAa');
      const containers = await findContainerDomain();
      if (containers.count != 1) {
        await changeContainerNums(1);
        return makeResponse({
          success: false,
          reasonCode: "CHANGE_CONTAINER_NUMS",
          reason: "コンテナの数を調整中です"
        });
      } else {
        console.log('AAb');
        const ddbres = await ddb.get({
          TableName : 'nemesis-task',
          Key: {
            id: uid
          }
        }).promise();

        console.log('AA');
        console.log(process.env.ENV);
        const host = process.env.ENV == 'dev' ? DEV_EXEC_HOST : containers.infos[0].host;
        axios.post(`http://${host}/extmeta`, {
          "srcfile": ddbres.Item.srcFile,
          "uuid": uid
        });
      }

      return makeResponse({
        success: true,
      });
    } else if (path == '/runtask' && httpMethod == 'POST') {
      const uid = body.uuid;
      const window_size = body.window_size;
      const overlap = body.overlap;
      const min_port = body.min_port;
      const max_port = body.max_port;

      // 状況を確認
      const status = await takeContainerStatus();
      if (!status.allIdle) {
        return makeResponse({
          success: false,
          reason: "解析中です"
        });
      }

      // メタデータの抽出を依頼
      const containers = await findContainerDomain();
      if (containers.count != 1) {
        await changeContainerNums(1);
        return makeResponse({
          success: false,
          reasonCode: "CHANGE_CONTAINER_NUMS",
          reason: "コンテナの数を調整中です"
        });
      } else {
        const ddbres = await ddb.get({
          TableName : 'nemesis-task',
          Key: {
            id: uid
          }
        }).promise();

        const host = process.env.ENV == 'dev' ? DEV_EXEC_HOST : containers.infos[0].host;
        axios.post(`http://${host}/exec`, {
          "srcfile": ddbres.Item.srcFile,
          "uuid": uid,
          "window_size": window_size,
          "overlap": overlap,
          "min_port": min_port,
          "max_port": max_port
        });

        return makeResponse({
          success: true
        });
      }
    } else if (path == '/finish' && httpMethod == 'GET') {
      await changeContainerNums(0);
      return makeResponse({
        success: true
      });
    }
    return makeResponse({
      success: true
    });
  } catch (e) {
    console.log(JSON.stringify(e));
    return makeResponse({
      success: false,
      reasonCode: "INTERNAL_ERROR",
      reason: "内部エラーです"
    });
  }
}

/*------.
| Utils |
`-------*/
// レスポンスを作成
function makeResponse(body, code = 200) {
  return {
    statusCode: code,
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  };
}

// 解析用コンテナ（ECS Task）の状況を確認
async function takeContainerStatus() {
  const ecs = await findContainerDomain();
  const status = {
    allIdle: true
  };
  for (let i = 0; i < ecs.infos.length; i++) {
    const host = process.env.ENV == 'dev' ? DEV_EXEC_HOST : ecs.infos[i].host;
    console.log(`http://${host}/status`);
    const res = await axios.get(`http://${host}/status`);
    console.log(res.data);
    status[host] = res.data;
    if (res.data !== 0) {
      status.allIdle = false;
    }
  }
  return status;
}

// 解析用コンテナ（ECS Task）のVPS内プライベートドメインを見つける・個数を確認する
async function findContainerDomain() {
  const ecs = new AWS.ECS({region: 'us-east-1'});
  let count = 0;
  const infos = [];

  var params = {
    cluster: "STARS-Cluster", 
  };
  const taskList = await ecs.listTasks(params).promise();
  const re = new RegExp("(STARS-Cluster/)(.+)$");
  const taskUuids = taskList.taskArns.map((task) => {
    const reres = re.exec(task);
    if (reres.length == 3) {
      return reres[2];
    } else {
      return null;
    }
  });

  if (taskUuids.length > 0) {
    var params = {
      cluster: "STARS-Cluster",
      tasks: taskUuids
    };
    const taskInfos = await ecs.describeTasks(params).promise();
    taskInfos.tasks.forEach((task) => {
      if (task.lastStatus == 'RUNNING') {
        count++;
      }
      infos.push({
        host: task.attachments[0].details[3].value,
        status: task.lastStatus
      });
    });
  }

  return {count, infos};
}

// 解析用コンテナの数を増減させる
async function changeContainerNums(containerNum) {
  const ecs = new AWS.ECS({region: 'us-east-1'});
  var params = {
    desiredCount: containerNum,
    cluster: "STARS-Cluster",
    service: "STARS-Container-service"
  };
  await ecs.updateService(params).promise();
  return true;
}


exports.handler = main;