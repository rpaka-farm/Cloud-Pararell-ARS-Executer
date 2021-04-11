const AWS = require('aws-sdk');
const uuid = require('uuid');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

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
      var status = await takeContainerStatus();
      if (!status.allIdle) {
        return makeResponse({
          success: false,
          reason: "他のタスクを実行中です。"
        });
      }

      // メタデータの抽出を依頼
      const containers = await findContainerDomain();
      if (containers.count != 1) {
        await changeContainerNums(1);
        return makeResponse({
          success: false,
          reason: "コンテナの数を調整中です。しばらく待ってから再度お試し下さい。"
        });
      } else {
        //タスクの状態を更新
        await ddb.update({
          TableName: 'nemesis-task',
          Key: {
            id: uid
          },
          UpdateExpression: 'set #a = :av',
          ExpressionAttributeNames: {'#a' : 'status'},
          ExpressionAttributeValues: {
            ':av' : 2
          }
        }).promise();

        const ddbres = await ddb.get({
          TableName : 'nemesis-task',
          Key: {
            id: uid
          }
        }).promise();

        const host = containers.infos[0].host;
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
      const parallel_num = body.parallel_num;

      // 状況を確認
      const status = await takeContainerStatus();
      if (!status.allIdle) {
        return makeResponse({
          success: false,
          reason: "他のタスクを実行中です。"
        });
      }

      // 解析を依頼
      const containers = await findContainerDomain();
      if (containers.count != parallel_num) {
        await changeContainerNums(parallel_num);
        return makeResponse({
          success: false,
          reasonCode: "CHANGE_CONTAINER_NUMS",
          reason: "コンテナの数を調整中です。しばらく待ってから再度お試し下さい。"
        });
      }

      //タスクの状態を更新
      await ddb.update({
        TableName: 'nemesis-task',
        Key: {
          id: uid
        },
        UpdateExpression: 'set #a = :av',
        ExpressionAttributeNames: {'#a' : 'status'},
        ExpressionAttributeValues: {
          ':av' : 4
        }
      }).promise();
      await ddb.update({
        TableName: 'nemesis-task',
        Key: {
          id: uid
        },
        UpdateExpression: 'remove #a',
        ExpressionAttributeNames: {'#a' : 'resfiles'},
      }).promise();

      const ddbres = await ddb.get({
        TableName : 'nemesis-task',
        Key: {
          id: uid
        }
      }).promise();
      const metaData = JSON.parse(ddbres.Item.meta);

      // 各コンテナの担当範囲を決定
      const window_num = ((metaData.sampleNum - window_size) / (window_size - overlap)) + 1;
      const window_nums = [];
      const window_unit_num = Math.floor(window_num / parallel_num);
      let start = 1;
      let finish = window_unit_num;
      for (let i = 0; i < parallel_num; i++) {
        window_nums.push({
          "start_window_num": start,
          "finish_window_num": (i != parallel_num - 1) ? finish : -1
        });
        start += window_unit_num;
        finish += window_unit_num;
      }

      for (let i = 0; i < parallel_num; i++) {
        const host = containers.infos[i].host;
        const option = {
          "srcfile": ddbres.Item.srcFile,
          "uuid": uid,
          "window_size": window_size,
          "overlap": overlap,
          "min_port": min_port,
          "max_port": max_port,
          "start_window_num": window_nums[i].start_window_num,
          "finish_window_num": window_nums[i].finish_window_num,
          "parallel": parallel_num != 1
        };
        axios.post(`http://${host}/exec`, option);
      }

      return makeResponse({
        success: true
      });
    } else if (path == '/finish' && httpMethod == 'POST') {
      const uid = body.uuid;
      const parallel = body.parallel;
      const status = await takeContainerStatus();
      if (parallel) {
        if (status.allIdle) {
          //タスクの状態を更新
          await ddb.update({
            TableName: 'nemesis-task',
            Key: {
              id: uid
            },
            UpdateExpression: 'set #a = :av',
            ExpressionAttributeNames: {'#a' : 'status'},
            ExpressionAttributeValues: {
              ':av' : 6
            }
          }).promise();
          const ddbres = await ddb.get({
            TableName : 'nemesis-task',
            Key: {
              id: uid
            }
          }).promise();
          const containers = await findContainerDomain();
          const host = containers.infos[0].host;
          const option = {
            "resfiles": ddbres.Item.resfiles,
            "uuid": uid
          };
          axios.post(`http://${host}/concat`, option);
        }
      } else {
        //タスクの状態を更新
        await ddb.update({
          TableName: 'nemesis-task',
          Key: {
            id: uid
          },
          UpdateExpression: 'set #a = :av',
          ExpressionAttributeNames: {'#a' : 'status'},
          ExpressionAttributeValues: {
            ':av' : 7
          }
        }).promise();
        await changeContainerNums(0);
      }
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
    const host = ecs.infos[i].host;
    try {
      const res = await axios.get(`http://${host}/status`);
      status[host] = res.data.status;
      if (res.data.status !== 0) {
        status.allIdle = false;
      }
    } catch (e) {
      status[host] = 9;
    }
  }
  return status;
}

// 解析用コンテナ（ECS Task）のVPS内プライベートドメインを見つける・個数を確認する
async function findContainerDomain() {
  if (process.env.ENV == 'dev') {
    let count = 0;
    const infos = process.env.LOCAL_EXECUTER_HOSTS.split(',').map((host) => {
      count++;
      return {
        host: host,
        status: 'RUNNING'
      };
    });
    return {count, infos}
  }

  const ecs = new AWS.ECS({region: 'us-east-1'});
  let count = 0;
  const infos = [];

  var params = {
    cluster: "Nemesis", 
  };
  const taskList = await ecs.listTasks(params).promise();
  if (taskList.taskArns && taskList.taskArns.length > 0) {
    const re = new RegExp("(Nemesis/)(.+)$");

    const taskUuids = taskList.taskArns.map((task) => {
      const reres = re.exec(task);
      if (reres.length == 3) {
        return reres[2];
      } else {
        return null;
      }
    });

    var params = {
      cluster: "Nemesis",
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
  if (process.env.ENV == 'dev') {
    return true;
  }
  const ecs = new AWS.ECS({region: 'us-east-1'});
  var params = {
    desiredCount: containerNum,
    cluster: "Nemesis",
    service: "Nemesis-Executer"
  };
  await ecs.updateService(params).promise();
  return true;
}


exports.handler = main;