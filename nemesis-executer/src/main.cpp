#include <filesystem>
#include <aws/core/Aws.h>
#include <aws/core/utils/Outcome.h>
#include <aws/s3/S3Client.h>
#include <aws/s3/model/GetObjectRequest.h>
#include <aws/s3/model/PutObjectRequest.h>
#include <aws/dynamodb/DynamoDBClient.h>
#include <aws/dynamodb/model/AttributeDefinition.h>
#include <aws/dynamodb/model/GetItemRequest.h>
#include <aws/dynamodb/model/UpdateItemRequest.h>
#include <aws/dynamodb/model/UpdateItemResult.h>
#include <nlohmann/json.hpp>
#include "httplib.h"
#include "GL900CSVAdapter.hpp"
#include "ARS.hpp"
#include "STARS.hpp"

using json = nlohmann::json;
namespace fs = std::filesystem;

int status;
Aws::SDKOptions aws_options;
bool downloadSrcFile(std::string src_file_name);
bool uploadResultFile(std::string res_file_name);

void sig_handler(int signo)
{
  if (signo == SIGUSR1)
  {
    printf("received SIGUSR1\n");
  }
  else if (signo == SIGKILL)
  {
    printf("received SIGKILL\n");
  }
  else if (signo == SIGSTOP)
  {
    printf("received SIGSTOP\n");
  }
  else if (signo == SIGTERM)
  {
    printf("received SIGTERM\n");
  }
  Aws::ShutdownAPI(aws_options);
  exit(0);
}

int main()
{
  if (signal(SIGUSR1, sig_handler) == SIG_ERR)
  {
    printf("can't catch SIGUSR1\n");
  }
  if (signal(SIGTERM, sig_handler) == SIG_ERR)
  {
    printf("can't catch SIGUSR1\n");
  }
  if (signal(SIGKILL, sig_handler) == SIG_ERR)
  {
    printf("can't catch SIGKILL\n");
  }
  if (signal(SIGSTOP, sig_handler) == SIG_ERR)
  {
    printf("can't catch SIGSTOP\n");
  }

  Aws::InitAPI(aws_options);

  httplib::Server svr;
  status = 0;

  svr.Get("/hi", [](const httplib::Request &, httplib::Response &res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_content("Hello World!", "text/plain");
  });

  svr.Get("/status", [](const httplib::Request &, httplib::Response &res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    char str_buf[10];
    std::sprintf(str_buf, "%d", status);
    // res.set_content("Hello World! status", "text/plain");
    res.set_content(str_buf, "text/plain");
  });

  svr.Post("/extmeta", [&](const httplib::Request &req, httplib::Response &res, const httplib::ContentReader &content_reader) {
    json rescontent;

    if (req.is_multipart_form_data())
    {
      rescontent["success"] = false;
      res.set_content(rescontent.dump(), "application/json");
    }
    else
    {
      rescontent["success"] = true;
      res.set_content(rescontent.dump(), "application/json");

      status = 1;
      std::string body;
      content_reader([&](const char *data, size_t data_length) {
        body.append(data, data_length);
        return true;
      });
      json request_data = json::parse(body);
      std::string uuid = request_data["uuid"];
      std::string srcfile = request_data["srcfile"];

      json meta;

      std::cout << "Start DL..." << std::endl;
      if (downloadSrcFile(srcfile))
      {
        GL900CSVAdapter ad = GL900CSVAdapter(srcfile);
        metadata md = ad.extractMetaData();
        meta["measureInterval"] = std::to_string(md.measureInterval.count());
        auto ts = std::chrono::system_clock::to_time_t(md.start);
        meta["start"] = std::ctime(&ts);
        auto tf = std::chrono::system_clock::to_time_t(md.finish);
        meta["finish"] = std::ctime(&tf);

        // DDBに書き込む
        Aws::Client::ClientConfiguration clientConfig;
        Aws::DynamoDB::DynamoDBClient dynamoClient(clientConfig);
        Aws::DynamoDB::Model::UpdateItemRequest request;
        const Aws::String tableName = "nemesis-task";
        request.SetTableName(tableName);
        Aws::DynamoDB::Model::AttributeValue attribValue;
        const Aws::String keyValue(uuid);
        attribValue.SetS(keyValue);
        request.AddKey("id", attribValue);

        // Construct the SET update expression argument
        Aws::String update_expression("SET #a = :valueA, #b = :valueB");
        request.SetUpdateExpression(update_expression);

        Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
        expressionAttributeNames["#a"] = "meta";
        expressionAttributeNames["#b"] = "status";
        request.SetExpressionAttributeNames(expressionAttributeNames);

        // Construct attribute value argument
        Aws::DynamoDB::Model::AttributeValue attributeUpdatedValue;
        const Aws::String metas(meta.dump());
        attributeUpdatedValue.SetS(metas);
        Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueB;
        attributeUpdatedValueB.SetN(3);
        Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> expressionAttributeValues;
        expressionAttributeValues[":valueA"] = attributeUpdatedValue;
        expressionAttributeValues[":valueB"] = attributeUpdatedValueB;
        request.SetExpressionAttributeValues(expressionAttributeValues);

        // Update the item
        const Aws::DynamoDB::Model::UpdateItemOutcome &result = dynamoClient.UpdateItem(request);
        if (!result.IsSuccess())
        {
          std::cout << result.GetError().GetMessage() << std::endl;
        }
        std::cout << "Item was updated" << std::endl;

        // ファイル削除
        fs::remove(srcfile);
      }
      status = 0;
    }
  });

  svr.Post("/exec", [&](const httplib::Request &req, httplib::Response &res, const httplib::ContentReader &content_reader) {
    json rescontent;

    if (req.is_multipart_form_data())
    {
      rescontent["success"] = false;
      res.set_content(rescontent.dump(), "application/json");
    }
    else
    {
      status = 2;
      std::string body;
      content_reader([&](const char *data, size_t data_length) {
        body.append(data, data_length);
        return true;
      });
      json request_data = json::parse(body);
      std::string srcfile = request_data["srcfile"];

      json rescontent;
      std::cout << "Start DL..." << std::endl;
      if (downloadSrcFile(srcfile))
      {
        GL900CSVAdapter ad = GL900CSVAdapter(srcfile);
        ad.outputToUnifiedFormatFile(srcfile + "_U.csv");
        std::string osrcfile = srcfile;
        srcfile = srcfile + "_U.csv";

        // int start_point = request_data["start_point"];
        // int finish_point = request_data["finish_point"];
        int window_size = request_data["window_size"];
        int overlap = request_data["overlap"];
        int min_port = request_data["min_port"];
        int max_port = request_data["max_port"];
        std::string uuid = request_data["uuid"];

        stars_config saconf = {window_size, overlap};
        ars_config aconf = {min_port, max_port};
        STARS sa = STARS(aconf, saconf);

        std::ifstream ifs = std::ifstream();
        std::ofstream ofs = std::ofstream();

        std::string resfile = srcfile + "_RES.csv";
        ifs.open(fs::path(srcfile));
        ofs.open(fs::path(resfile));

        std::vector<float> data;
        for (std::string str_buf; getline(ifs, str_buf);)
        {
          int col = 1;
          std::istringstream row(str_buf);
          for (std::string col_str_buf; getline(row, col_str_buf, ',');)
          {
            if (col++ == 4)
            {
              data.push_back(std::stof(col_str_buf));
            }
          }
        }

        std::vector<std::vector<float>> res = sa.exec(data);

        int pos = 1;
        for (auto ars_spcetl_set : res)
        {
          pos += saconf.window_size - saconf.overlap;
          ofs << pos << std::endl;
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

        ifs.close();
        ofs.close();

        uploadResultFile(resfile);

        //=============================================
        // DDBに書き込む
        Aws::Client::ClientConfiguration clientConfig;
        Aws::DynamoDB::DynamoDBClient dynamoClient(clientConfig);
        Aws::DynamoDB::Model::UpdateItemRequest request;
        const Aws::String tableName = "nemesis-task";
        request.SetTableName(tableName);
        Aws::DynamoDB::Model::AttributeValue attribValue;
        const Aws::String keyValue(uuid);
        attribValue.SetS(keyValue);
        request.AddKey("id", attribValue);

        // Construct the SET update expression argument
        Aws::String update_expression("SET #a = :valueA, #b = :valueB");
        request.SetUpdateExpression(update_expression);

        Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
        expressionAttributeNames["#a"] = "resFile";
        expressionAttributeNames["#b"] = "status";
        request.SetExpressionAttributeNames(expressionAttributeNames);

        // Construct attribute value argument
        Aws::DynamoDB::Model::AttributeValue attributeUpdatedValue;
        attributeUpdatedValue.SetS(Aws::String(resfile));
        Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueB;
        attributeUpdatedValueB.SetN(5);
        Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> expressionAttributeValues;
        expressionAttributeValues[":valueA"] = attributeUpdatedValue;
        expressionAttributeValues[":valueB"] = attributeUpdatedValueB;
        request.SetExpressionAttributeValues(expressionAttributeValues);

        // Update the item
        const Aws::DynamoDB::Model::UpdateItemOutcome &result = dynamoClient.UpdateItem(request);
        if (!result.IsSuccess())
        {
          std::cout << result.GetError().GetMessage() << std::endl;
        }
        std::cout << "Item was updated" << std::endl;

        // ファイル削除
        fs::remove(srcfile);
        fs::remove(osrcfile);
        fs::remove(resfile);

        //=============================================

        rescontent["success"] = true;
      }
      else
      {
        rescontent["success"] = false;
      }

      status = 0;
      res.set_content(rescontent.dump(), "application/json");
    }
  });

  svr.listen("0.0.0.0", 8080);
}

bool downloadSrcFile(std::string src_file_name)
{
  std::ofstream ofs = std::ofstream();
  ofs.open(fs::path(src_file_name));

  Aws::Client::ClientConfiguration config;
  const Aws::String bucket_name = "stars-src";
  const Aws::String object_name(src_file_name);
  const Aws::String region = "us-east-1";
  config.region = region;
  Aws::S3::S3Client s3_client(config);
  Aws::S3::Model::GetObjectRequest object_request;
  object_request.SetBucket(bucket_name);
  object_request.SetKey(object_name);
  Aws::S3::Model::GetObjectOutcome get_object_outcome = s3_client.GetObject(object_request);

  if (get_object_outcome.IsSuccess())
  {
    auto &retrived_file = get_object_outcome.GetResultWithOwnership().GetBody();
    std::string str_buf;
    while (getline(retrived_file, str_buf))
    {
      ofs << str_buf << std::endl;
    };
    return true;
  }
  else
  {
    auto err = get_object_outcome.GetError();
    std::cout << "Error: GetObject: " << err.GetExceptionName() << ": " << err.GetMessage() << std::endl;
    return false;
  }

  ofs.close();
}

bool uploadResultFile(std::string res_file_name)
{
  const Aws::String bucket_name = "stars-res";
  const Aws::String object_name(res_file_name);
  const Aws::String region = "us-east-1";
  struct stat buffer;
  if (stat(object_name.c_str(), &buffer) == -1)
  {
    std::cout << "Error: File Not Found." << std::endl;
    return false;
  }
  Aws::Client::ClientConfiguration config;
  config.region = region;
  Aws::S3::S3Client s3_client(config);
  Aws::S3::Model::PutObjectRequest request;
  request.SetBucket(bucket_name);
  request.SetKey(object_name);
  std::shared_ptr<Aws::IOStream> input_data = Aws::MakeShared<Aws::FStream>("TestTag", object_name.c_str(), std::ios_base::in | std::ios_base::binary);
  request.SetBody(input_data);
  Aws::S3::Model::PutObjectOutcome outcome = s3_client.PutObject(request);
  if (outcome.IsSuccess())
  {
    return true;
  }
  else
  {
    std::cout << "Error: PutObject: " << outcome.GetError().GetMessage() << std::endl;

    return false;
  }
}