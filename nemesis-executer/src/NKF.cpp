#include <cstdio>
#include <filesystem>
#include "NKF.hpp"

namespace fs = std::filesystem;

void deleteNl2(std::string &targetStr)
{
  const char CR = '\r';
  const char LF = '\n';
  std::string destStr;
  for (const auto c : targetStr)
  {
    if (c != CR && c != LF)
    {
      destStr += c;
    }
  }
  targetStr = std::move(destStr);
}

int execCmd(std::string cmd, std::string &result)
{
  FILE *fp = popen(cmd.c_str(), "r");
  char buf[1024];
  result = std::string("");
  if (fp == NULL)
  {
    return -1;
  }
  while (fgets(buf, sizeof(buf), fp) != NULL)
  {
    result = result + std::string(buf);
  }
  deleteNl2(result);
  int exit = pclose(fp);
  return WEXITSTATUS(exit);
}

std::string guessFileEncode(std::string fileName)
{
  std::string encode = "";
  int exitCode = execCmd("nkf --guess " + fileName, encode);
  if (exitCode == 0)
  {
    return encode;
  }
  else
  {
    return "Unknown";
  }
}

int encodeFileToUtf8(std::string fileName)
{
  if (guessFileEncode(fileName) == "UTF-8 (CRLF)")
  {
    return 0;
  }
  std::string sout = "";
  std::string tmpFileName = fileName + "_8.csv";
  int exitCode = execCmd("nkf -w -c " + fileName + " > " + tmpFileName, sout);
  if (exitCode == 0)
  {
    std::error_code ec;
    fs::rename(fs::path(tmpFileName), fs::path(fileName), ec);
    if (ec.value() == 0)
    {
      return 0;
    }
    else
    {
      return -1;
    }
    return 0;
  }
  return -1;
}