#include <vector>
#include <filesystem>
#include "STARS.hpp"

#ifndef USTARSSpectrumCSVAdapter_H
#define USTARSSpectrumCSVAdapter_H

namespace fs = std::filesystem;

class USTARSSpectrumCSVAdapter
{
private:
  fs::path outCsvFilePath;

public:
  USTARSSpectrumCSVAdapter();
  std::string outputSTARSSpectrum(std::vector<std::vector<float>>, fs::path outCsvFilePath, stars_config starsc, bool distribute = false);
  void integrateSTARSSpectrumCSVs(std::vector<fs::path>, fs::path outCsvFilePath);
};

#endif