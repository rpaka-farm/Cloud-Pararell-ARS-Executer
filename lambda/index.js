const AWS = require('aws-sdk');
const uuid = require('uuid');
const axios = require('axios');

/*
{ name: 'privateDnsName', value: 'ip-10-0-0-91.ec2.internal' }
{ name: 'privateDnsName', value: 'ip-10-0-1-121.ec2.internal' }
*/

async function main(event, context) {
  const {path, httpMethod, body} = event;

  if (path == '/runmetaext' && httpMethod == 'POST') {
    const s3 = new AWS.S3({region: 'us-east-1'});
    const {srcfile} = body;

    //解析可能な状態かを確認
    var status = await takeContainerStatus();
    if (!status.allIdle) {
      return makeResponse({
        success: false,
        reason: "解析中です"
      });
    }

    //解析対象データの存在を確認
    try {
      var params = {
        Bucket: "stars-src",
        Key: srcfile
      };
      const s3testRes = await s3.getObject(params).promise();
      console.log(s3testRes);
    } catch (e) {
      return makeResponse({
        success: false,
        reason: "解析対象ファイルが見つかりませんでした"
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
      // 抽出指示
    }

    return makeResponse({
      success: true,
    });
  } else if (path == '/runtask' && httpMethod == 'POST') {
    const s3 = new AWS.S3({region: 'us-east-1'});

    // 状況を確認
    const status = await takeContainerStatus();
    if (!status.allIdle) {
      return makeResponse({
        success: false,
        reason: "解析中です"
      });
    }

    // 解析対象データの存在を確認

    // コンテナ数の一致を確認
    if (false) {
      // 必要であればコンテナ数の増減を指示して一旦返す
    } 

    // 解析を実行
  }
  return makeResponse({
    success: true
  });
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
  const ddb = new AWS.DynamoDB({region: 'us-east-1'});
  var params = {
    TableName: "stars-containers"
   };
  const ddbRes = await ddb.scan(params).promise();
  const status = {};
  status.count = ddbRes.Count ?? 0;
  const allIdle = true;
  if (Array.isArray(ddbRes.Items)) {
    status.containers = {};
    ddbRes.Items.forEach((item) => {
      if (item.hostname) {
        status.containers[item.hostname] = item.status;
        if (item.status != 'idle') {
          allIdle = false;
        }
      }
    });
    status.allIdle = allIdle;
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
        host: task.attachments[0].details[3].value ?? null,
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