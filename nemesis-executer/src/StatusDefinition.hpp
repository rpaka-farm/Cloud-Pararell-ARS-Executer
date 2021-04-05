#ifndef STATUSDEF_H
#define STATUSDEF_H

enum FileStatus
{
  UPLOADING = 0,
  READY = 1,
  INIT = 99
};

enum TaskStatus
{
  REGISTERING = 0,
  READY_FOR_META_EXTRACT = 1,
  META_EXTRACTING = 2,
  READY_FOR_EXECUTE = 3,
  EXECUTING = 4,
  DONE_EXECUTE = 5,
  DL_RESULT = 6,
  INIT = 99
}

#endif