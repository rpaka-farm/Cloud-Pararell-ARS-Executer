#include <vector>

#ifndef ARSC
#define ARSC

struct ars_config
{
  int start_port;
  int finish_port;
};

class ARS
{
private:
  ars_config config;

public:
  ARS(ars_config config);
  std::vector<float> exec(std::vector<float> data);
};

#endif