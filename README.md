<div align="center" style="vertical-align: center;">
  <img src="https://cdn.rpaka.dev/icon/nemesis.png" height="80px" />
  <h1>Cloud-Pararell-ARS-Executer</h1>
  <h1>クラウド動作並列ARS解析システム</h1>
  <img src="https://cdn.rpaka.dev/logo/cpp.png" height="80px" style="padding-right: 15px" />
  <img src="https://cdn.rpaka.dev/logo/nodejs.svg" height="80px" style="padding-right: 15px" />
  <img src="https://cdn.rpaka.dev/logo/js.png" height="80px" style="padding-right: 15px" />
  <img src="https://cdn.rpaka.dev/logo/react.svg" height="80px" />
  <br/>
  <img src="https://cdn.rpaka.dev/logo/docker.svg" height="80px" />
  <br/>
  <img src="https://cdn.rpaka.dev/logo/aws-apigateway.svg" height="80px" style="padding-right: 15px" />
  <img src="https://cdn.rpaka.dev/logo/aws-cf.svg" height="80px" style="padding-right: 15px" />
  <img src="https://cdn.rpaka.dev/logo/aws-lambda.svg" height="80px" style="padding-right: 15px" />
  <img src="https://cdn.rpaka.dev/logo/aws-ecs.svg" height="80px" style="padding-right: 15px" />
  <img src="https://cdn.rpaka.dev/logo/aws-ecr.svg" height="80px" style="padding-right: 15px" />
  <img src="https://cdn.rpaka.dev/logo/aws-ddb.svg" height="80px" style="padding-right: 15px" />
  <img src="https://cdn.rpaka.dev/logo/aws-s3.svg" height="80px" style="padding-right: 15px" />
</div><br />

![動作イメージ](https://cdn.rpaka.dev/useimage/nemesis/front.png)

## 概要
![簡易構成](https://cdn.rpaka.dev/useimage/nemesis/scheme.jpg)
**Nemesis**はAWS ECSのコンテナ上で動作する**並列解析システム**です。コンテナクラスタ上で解析を並列で実行し、長期にわたる実験データであっても解析結果を高速で得ることが可能です。このシステムはAWS上での動作を想定しており、AWS ECS, AWS S3, AWS Lambda, AWS DynamoDBを用いています。いずれもクラウド上で拡張可能な資源であり、システム全体を通して高トラフィックに耐えうる構成となっています。このリポジトリ内の各フォルダの内容は以下の通りです。

- nemesis-executor : ECSコンテナのソースファイルです。C++で記述されており、Dockerコンテナの構成ファイルを含みます。
- nemesis-facade : ECSコンテナを操作するAPI, その実体のLambda関数のソースファイルです。Javascript（Node.js）で記述されており、AWS SAM CLIによるローカル実行環境が構築されています。
- nemesis-front : ウェブブラウザ上で動作するNemesisのWebクライアントです。React.jsを用いて構築しています。S3に対する解析対象ファイルのアップロード、nemesis-facadeを用いた解析の実行や結果の確認、解析結果のファイルのダウンロードが行えます。

## 背景
研究室で使う独自の信号処理アルゴリズムを膨大な量の実験データに適用させるのにはとても長い時間がかかります。このアルゴリズムは実験データのうち部分毎に分解させて適用させることが可能なので、クラウド上で並列化して実行させることにより高速化できないかと考えました。

## 利用
本システムは研究室内での利用を想定しており一般の利用を想定していませんが、別のアルゴリズムで似たようなことを行うのに本システムの構成は参考になるかも知れません。

## 構成
![構成](https://cdn.rpaka.dev/arch/nemesis_2.jpg)

1. nemesis-executer（演算実行器）
2. nemesis-facade（クラスタ管理サーバ）
3. nemesis-front（ウェブクライアント）

<!-- ## 機能 -->

<!-- ## 動作環境 -->

<!-- ## 利用ライブラリ
- []() -->
