#include <vector>
#include <iostream>
#include "ARS.hpp"
#include "STARS.hpp"

STARS::STARS(ars_config arsc, stars_config starsc)
{
  this->arsc = arsc;
  this->starsc = starsc;
}

std::vector<std::vector<float>> STARS::exec(std::vector<float> data)
{
  // int n_data = (int)data.size();

  std::vector<std::vector<float>> ars_spctls;
  ARS ars = ARS(this->arsc);
  int cur_pos;
  // int i = 0;
  for (cur_pos = 0; cur_pos < (int)data.size(); cur_pos += this->starsc.window_size - this->starsc.overlap)
  {
    std::vector<float> subdata(this->starsc.window_size);
    for (int j = cur_pos; j < cur_pos + this->starsc.window_size; j++)
    {
      subdata[j - cur_pos] = data[j];
    }
    ars_spctls.push_back(ars.exec(subdata));
  }

  return ars_spctls;
}