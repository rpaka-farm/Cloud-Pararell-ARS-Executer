#include <vector>
#include <filesystem>

#ifndef U_SIGNAL_DATA_CSV_ADAPTER_H
#define U_SIGNAL_DATA_CSV_ADAPTER_H

namespace fs = std::filesystem;

class USignalDataCSVAdapter
{
private:
  fs::path csvFilePath;

public:
  USignalDataCSVAdapter(fs::path csvFilePath);
  std::vector<float> extractData(int t_col);
};

#endif