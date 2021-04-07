#include <filesystem>
#include <future>
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
#include <cpprest/http_client.h>
#include <cpprest/filestream.h>
#include <cpprest/uri.h>
#include <cpprest/http_listener.h>
#include <cpprest/asyncrt_utils.h>
#include <nlohmann/json.hpp>
#include "GL900CSVAdapter.hpp"
#include "USignalDataCSVAdapter.hpp"
#include "USTARSSpectrumCSVAdapter.hpp"
#include "ARS.hpp"
#include "STARS.hpp"
#include "StatusDefinition.hpp"

using namespace web;
using namespace http;
using namespace utility;
using namespace http::experimental::listener;
namespace fs = std::filesystem;

int status;
Aws::SDKOptions aws_options;
void extractMetaData(nlohmann::json req_json);
void executeAnalysis(nlohmann::json req_json);
void sig_handler(int signo);
void set_sig_handlers();
void updateTaskDb(std::string uuid, Aws::String update_expression, Aws::Map<Aws::String, Aws::String> expressionAttributeNames, Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> expressionAttributeValues);
bool downloadSrcFile(std::string src_file_name);
bool uploadResultFile(std::string res_file_name);

class CommandHandler
{
public:
  CommandHandler() {}
  CommandHandler(utility::string_t url);
  pplx::task<void> open()
  {
    return m_listener.open();
  }
  pplx::task<void> close()
  {
    return m_listener.close();
  }

private:
  void handle_get_or_post(http_request message);
  http_listener m_listener;
};

CommandHandler::CommandHandler(utility::string_t url) : m_listener(url)
{
  m_listener.support(methods::GET, std::bind(&CommandHandler::handle_get_or_post, this, std::placeholders::_1));
  m_listener.support(methods::POST, std::bind(&CommandHandler::handle_get_or_post, this, std::placeholders::_1));
}

void CommandHandler::handle_get_or_post(http_request message)
{
  ucout << "Method: " << message.method() << std::endl;
  ucout << "URI: " << http::uri::decode(message.relative_uri().path()) << std::endl;
  ucout << "Query: " << http::uri::decode(message.relative_uri().query()) << std::endl;
  auto method = message.method();
  auto uri = http::uri::decode(message.relative_uri().path());
  auto req_json_task = message.extract_json();
  auto req_json = req_json_task.get();
  nlohmann::json rescontent;
  nlohmann::json reqcontent;

  if (method == "POST" && req_json.is_null())
  {
    rescontent["success"] = false;
    message.reply(status_codes::OK, rescontent.dump(), "application/json");
    return;
  }
  else
  {
    reqcontent = nlohmann::json::parse(req_json.to_string());
  }

  if (method == "GET" && uri == "/hi")
  {
    rescontent["success"] = true;
    message.reply(status_codes::OK, rescontent.dump(), "application/json");
  }
  if (method == "GET" && uri == "/status")
  {
    rescontent["success"] = true;
    rescontent["status"] = status;
    message.reply(status_codes::OK, rescontent.dump(), "application/json");
  }
  if (method == "POST" && uri == "/extmeta")
  {
    status = 1;
    rescontent["success"] = true;
    message.reply(status_codes::OK, rescontent.dump(), "application/json");
    extractMetaData(reqcontent);
    status = 0;
  }
  if (method == "POST" && uri == "/exec")
  {
    status = 2;
    rescontent["success"] = true;
    message.reply(status_codes::OK, rescontent.dump(), "application/json");
    executeAnalysis(reqcontent);
    status = 0;
  }
};

void extractMetaData(nlohmann::json request_data)
{
  std::string uuid = request_data["uuid"];
  std::string srcfile = request_data["srcfile"];

  try
  {
    nlohmann::json meta;
    std::cout << "Start DL..." << std::endl;
    if (!downloadSrcFile(srcfile))
    {
      fs::remove(srcfile);
      throw std::string("FAILED_DOWNLOAD_SRC_FILE");
    }

    GL900CSVAdapter ad = GL900CSVAdapter(srcfile);
    metadata md = ad.extractMetaData();
    auto ts = std::chrono::system_clock::to_time_t(md.start);
    auto tf = std::chrono::system_clock::to_time_t(md.finish);
    meta["measureInterval"] = std::to_string(md.measureInterval.count());
    meta["start"] = std::ctime(&ts);
    meta["finish"] = std::ctime(&tf);

    Aws::String update_expression("SET #a = :valueA, #b = :valueB, #c = :valueC");
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueA;
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueB;
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueC;
    Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> expressionAttributeValues;
    Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
    Aws::String metas(meta.dump());
    expressionAttributeNames["#a"] = "meta";
    expressionAttributeNames["#b"] = "status";
    expressionAttributeNames["#c"] = "ecode";
    attributeUpdatedValueA.SetS(metas);
    attributeUpdatedValueB.SetN((int)TaskStatus::READY_FOR_META_EXTRACT);
    attributeUpdatedValueC.SetNull(true);
    expressionAttributeValues[":valueA"] = attributeUpdatedValueA;
    expressionAttributeValues[":valueB"] = attributeUpdatedValueB;
    expressionAttributeValues[":valueC"] = attributeUpdatedValueC;
    updateTaskDb(uuid, update_expression, expressionAttributeNames, expressionAttributeValues);

    // ファイル削除
    fs::remove(srcfile);
  }
  catch (std::string e)
  {
    Aws::String update_expression("SET #a = :valueA, #b = :valueB");
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueA;
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueB;
    Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> expressionAttributeValues;
    Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
    Aws::String ecode(e);
    expressionAttributeNames["#a"] = "ecode";
    expressionAttributeNames["#b"] = "status";
    attributeUpdatedValueA.SetS(ecode);
    attributeUpdatedValueB.SetN((int)TaskStatus::READY_FOR_META_EXTRACT);
    expressionAttributeValues[":valueA"] = attributeUpdatedValueA;
    expressionAttributeValues[":valueB"] = attributeUpdatedValueB;
    updateTaskDb(uuid, update_expression, expressionAttributeNames, expressionAttributeValues);
  }
  catch (...)
  {
    Aws::String update_expression("SET #a = :valueA, #b = :valueB");
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueA;
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueB;
    Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> expressionAttributeValues;
    Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
    expressionAttributeNames["#a"] = "ecode";
    expressionAttributeNames["#b"] = "status";
    attributeUpdatedValueA.SetS("UNKOWN_ERROR");
    attributeUpdatedValueB.SetN((int)TaskStatus::READY_FOR_META_EXTRACT);
    expressionAttributeValues[":valueA"] = attributeUpdatedValueA;
    expressionAttributeValues[":valueB"] = attributeUpdatedValueB;
    updateTaskDb(uuid, update_expression, expressionAttributeNames, expressionAttributeValues);
  }
}

void executeAnalysis(nlohmann::json request_data)
{
  std::string uuid = request_data["uuid"];
  std::string osrcfile = request_data["srcfile"];
  std::string srcfile = osrcfile + "_U.csv";
  std::string resfile = uuid + ".csv";
  int window_size = request_data["window_size"];
  int overlap = request_data["overlap"];
  int min_port = request_data["min_port"];
  int max_port = request_data["max_port"];
  int start_window_num = request_data["start_window_num"];
  int finish_window_num = request_data["finish_window_num"];
  bool parallel = request_data["parallel"];

  try
  {
    std::cout << "Start DL..." << std::endl;
    if (!downloadSrcFile(srcfile))
    {
      fs::remove(srcfile);
      throw std::string("FAILED_DOWNLOAD_SRC_FILE");
    }

    GL900CSVAdapter ad = GL900CSVAdapter(osrcfile);
    USignalDataCSVAdapter srcad = USignalDataCSVAdapter(srcfile);
    USTARSSpectrumCSVAdapter resad = USTARSSpectrumCSVAdapter();
    stars_config saconf = {window_size, overlap, start_window_num, finish_window_num};
    ars_config aconf = {min_port, max_port};
    STARS sa = STARS(aconf, saconf);

    ad.outputToUnifiedFormatFile(srcfile);
    auto data = srcad.extractData(4);
    auto stars_res = sa.exec(data);
    auto out_res_file = resad.outputSTARSSpectrum(stars_res, fs::path("./" + uuid + ".csv"), saconf, parallel);
    uploadResultFile(out_res_file);

    // ファイル削除
    fs::remove(osrcfile);
    fs::remove(srcfile);
    fs::remove(resfile);
  }
  catch (std::string e)
  {
    Aws::String update_expression("SET #a = :valueA, #b = :valueB");
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueA;
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueB;
    Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> expressionAttributeValues;
    Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
    Aws::String ecode(e);
    expressionAttributeNames["#a"] = "ecode";
    expressionAttributeNames["#b"] = "status";
    attributeUpdatedValueA.SetS(ecode);
    attributeUpdatedValueB.SetN((int)TaskStatus::READY_FOR_EXECUTE);
    expressionAttributeValues[":valueA"] = attributeUpdatedValueA;
    expressionAttributeValues[":valueB"] = attributeUpdatedValueB;
    updateTaskDb(uuid, update_expression, expressionAttributeNames, expressionAttributeValues);
  }
  catch (...)
  {
    Aws::String update_expression("SET #a = :valueA, #b = :valueB");
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueA;
    Aws::DynamoDB::Model::AttributeValue attributeUpdatedValueB;
    Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> expressionAttributeValues;
    Aws::Map<Aws::String, Aws::String> expressionAttributeNames;
    expressionAttributeNames["#a"] = "ecode";
    expressionAttributeNames["#b"] = "status";
    attributeUpdatedValueA.SetS("UNKOWN_ERROR");
    attributeUpdatedValueB.SetN((int)TaskStatus::READY_FOR_EXECUTE);
    expressionAttributeValues[":valueA"] = attributeUpdatedValueA;
    expressionAttributeValues[":valueB"] = attributeUpdatedValueB;
    updateTaskDb(uuid, update_expression, expressionAttributeNames, expressionAttributeValues);
  }
}

int main()
{
  try
  {
    Aws::InitAPI(aws_options);
    utility::string_t address = U("http://localhost:8080");
    uri_builder uri(address);
    auto addr = uri.to_uri().to_string();
    CommandHandler handler(addr);
    handler.open().wait();
    ucout << utility::string_t(U("Listening for requests at: ")) << addr << std::endl;
    ucout << U("Press ENTER key to quit...") << std::endl;
    std::string line;
    std::getline(std::cin, line);
    Aws::ShutdownAPI(aws_options);
    handler.close().wait();
  }
  catch (std::exception &ex)
  {
    ucout << U("Exception: ") << ex.what() << std::endl;
    ucout << U("Press ENTER key to quit...") << std::endl;
    std::string line;
    std::getline(std::cin, line);
  }
  return 0;
}

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

void set_sig_handlers()
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
}

void updateTaskDb(std::string uuid, Aws::String update_expression, Aws::Map<Aws::String, Aws::String> expressionAttributeNames, Aws::Map<Aws::String, Aws::DynamoDB::Model::AttributeValue> expressionAttributeValues)
{
  Aws::Client::ClientConfiguration clientConfig;
  Aws::DynamoDB::DynamoDBClient dynamoClient(clientConfig);
  Aws::DynamoDB::Model::UpdateItemRequest request;
  Aws::DynamoDB::Model::AttributeValue attribValue;
  const Aws::String tableName = "nemesis-task";
  const Aws::String keyValue(uuid);
  request.SetTableName(tableName);
  attribValue.SetS(keyValue);
  request.AddKey("id", attribValue);
  request.SetUpdateExpression(update_expression);
  request.SetExpressionAttributeNames(expressionAttributeNames);
  request.SetExpressionAttributeValues(expressionAttributeValues);
  const Aws::DynamoDB::Model::UpdateItemOutcome &result = dynamoClient.UpdateItem(request);
  if (!result.IsSuccess())
  {
    // throw std::string("FAILED_UPDATE_DDB");
    std::cout << result.GetError().GetMessage() << std::endl;
  }
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