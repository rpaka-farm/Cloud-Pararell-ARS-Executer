#include <vector>
#include <iostream>
#include "ARS.hpp"

ARS::ARS(ars_config config)
{
  this->config = config;
}

std::vector<float> ARS::exec(std::vector<float> data)
{
  std::vector<float> port_rpr_values(this->config.finish_port - this->config.start_port + 1);
  for (int port = this->config.start_port; port <= this->config.finish_port; port++)
  {
    std::vector<float> accum(port);
    for (int i = 0; i < (int)data.size(); i++)
    {
      int p = i % port;
      accum[p] = accum[p] + data[i];
    }
    for (int p = 0; p < port; p++)
    {
      accum[p] = std::abs(accum[p]);
    }
    port_rpr_values[port - this->config.start_port] = *std::max_element(accum.begin(), accum.end());
  }
  return port_rpr_values;
}