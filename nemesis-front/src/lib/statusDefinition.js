const FileStatus = {
  UPLOADING: 0,
  READY: 1,
  INIT: 99
};

const FileStatusLabel = {
  0: 'アップロード中',
  1: 'タスク登録可能',
  99: '---'
}

const FileActionButton = {
  0: {
    wait: true,
    label: 'お待ちください'
  },
  1: {
    wait: false,
    label: 'タスク登録'
  },
  99: {
    wait: true,
    label: 'お待ちください'
  }
}

const TaskStatus = {
  REGISTERING: 0,
  READY_FOR_META_EXTRACT: 1,
  META_EXTRACTING: 2,
  READY_FOR_EXECUTE: 3,
  EXECUTING: 4,
  DONE_EXECUTE: 5,
  INIT: 99
};

const TaskStatusLabel = {
  0: '登録中...',
  1: 'メタ情報抽出待機中',
  2: 'メタ情報抽出中',
  3: '解析待機中',
  4: '解析中',
  5: '解析完了',
  99: '---'
}

const TaskActionButton = {
  0: {
    wait: true,
    label: 'お待ちください'
  },
  1: {
    wait: false,
    label: 'メタ情報抽出開始'
  },
  2: {
    wait: true,
    label: 'お待ちください'
  },
  3: {
    wait: false,
    label: '解析開始'
  },
  4: {
    wait: true,
    label: 'お待ちください'
  },
  5: {
    wait: false,
    label: '解析結果DL'
  },
  99: {
    wait: true,
    label: 'お待ちください'
  }
}

export {FileStatus, FileStatusLabel, FileActionButton, TaskStatus, TaskStatusLabel, TaskActionButton}