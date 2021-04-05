#include <cstdio>
#include <filesystem>

#ifndef NKH_H
#define NKF_H

void deleteNl2(std::string &targetStr);
int execCmd(std::string cmd, std::string &result);
std::string guessFileEncode(std::string fileName);
int encodeFileToUtf8(std::string fileName);

#endif