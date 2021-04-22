#include <fstream>
#include <iostream>
#include <algorithm>
#include "USTARSSpectrumCSVAdapter.hpp"
#include "../ARS/cpp/STARS.hpp"

std::string rawFileName(fs::path path)
{
  std::string fullname = path.filename();
  size_t lastindex = fullname.find_last_of(".");
  std::string rawname = fullname.substr(0, lastindex);
  return rawname;
}

int filePosNum(fs::path path)
{
  std::string rawname = rawFileName(path);
  size_t lastindex = rawname.find_last_of("-");
  std::string posstr = rawname.substr(lastindex + 1, rawname.size());
  int pos;
  try
  {
    pos = std::stoi(posstr);
  }
  catch (std::invalid_argument e)
  {
    throw std::string("INVALID_FILE_NAME");
  }
  return pos;
}

USTARSSpectrumCSVAdapter::USTARSSpectrumCSVAdapter()
{
}

std::string USTARSSpectrumCSVAdapter::outputSTARSSpectrum(std::vector<std::vector<float>> res, fs::path outCsvFilePath, stars_config starsc, bool distribute)
{
  if (distribute)
  {
    std::string rawname = rawFileName(outCsvFilePath);
    outCsvFilePath = outCsvFilePath.parent_path() / (rawname + "-" + std::to_string(starsc.start_window_num) + ".csv");
  }

  std::ofstream ofs(outCsvFilePath);
  int pos = (starsc.start_window_num - 1) * (starsc.window_size - starsc.overlap) + 1;
  for (auto ars_spcetl_set : res)
  {
    ofs << pos << ",";
    pos += starsc.window_size - starsc.overlap;
    for (int j = 0; j < (int)ars_spcetl_set.size(); j++)
    {
      ofs << ars_spcetl_set[j];
      if (j != (int)ars_spcetl_set.size() - 1)
      {
        ofs << ",";
      }
    }
    ofs << std::endl;
  }
  ofs.close();
  return outCsvFilePath.filename();
}

void USTARSSpectrumCSVAdapter::integrateSTARSSpectrumCSVs(std::vector<fs::path> srcCsvFilePaths, fs::path outCsvFilePath)
{
  std::ofstream ofs(outCsvFilePath);
  std::sort(srcCsvFilePaths.begin(), srcCsvFilePaths.end(), [](const fs::path &x, const fs::path &y) {
    return filePosNum(x) < filePosNum(y);
  });
  for (auto srcCsvFilePath : srcCsvFilePaths)
  {
    std::ifstream ifs(srcCsvFilePath);
    for (std::string str_buf; getline(ifs, str_buf);)
    {
      ofs << str_buf << std::endl;
    }
    ifs.close();
  }
  ofs.close();
}