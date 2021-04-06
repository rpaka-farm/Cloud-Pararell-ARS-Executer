#include <fstream>
#include <sstream>
#include "USignalDataCSVAdapter.hpp"

USignalDataCSVAdapter::USignalDataCSVAdapter(fs::path csvFilePath)
{
  this->csvFilePath = csvFilePath;
}

std::vector<float> USignalDataCSVAdapter::extractData(int t_col)
{
  if (t_col < 1)
  {
    throw std::string("INVALID_COL");
  }
  std::ifstream ifs = std::ifstream();
  ifs.open(fs::path(this->csvFilePath));
  std::vector<float> data;
  for (std::string str_buf; getline(ifs, str_buf);)
  {
    int col = 1;
    std::stringstream row(str_buf);
    for (std::string col_str_buf; getline(row, col_str_buf, ',');)
    {
      if (col++ == t_col)
      {
        try
        {
          data.push_back(std::stof(col_str_buf));
        }
        catch (std::invalid_argument)
        {
          throw std::string("INVALID_DATA");
        }
      }
    }
  }
  ifs.close();
  return data;
}