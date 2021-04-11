function AboutPage() {
  return (
    <main className="mdc-top-app-bar--fixed-adjust">
      <div style={{padding: 10}}>
        <h1>Nemesis alpha-v0.2.0</h1>
        <p><a href="https://github.com/ritsu2891/Nemesis">GitHubリポジトリ</a>　<a href="https://www.farpoint.jp">開発者ホームページ</a></p>
        <p>Copyright 2021 Ritsuki KOKUBO (dev.rpaka) All Rights Reserved.</p>
        <h1>使用ライブラリ</h1>
        <h2>Nemesis Executer</h2>
        <ul>
          <li><a href="https://github.com/microsoft/cpprestsdk">cpprestsdk</a> by microsoft</li>
          <li><a href="https://github.com/aws/aws-sdk-cpp">aws-sdk-cpp</a> by aws</li>
          <li><a href="https://github.com/nlohmann/json">json</a> by nlohmann</li>
        </ul>
        <h2>Nemesis Facade</h2>
        <ul>
          <li><a href="https://github.com/aws/aws-sdk-js">aws-sdk-js</a> by aws</li>
        </ul>
        <h2>Nemesis Front</h2>
        <ul>
          <li><a href="https://github.com/aws/aws-sdk-js">aws-sdk-js</a> by aws</li>
          <li><a href="https://github.com/axios/axios">axios</a> by axios</li>
          <li><a href="https://github.com/material-components/material-components-web">material-components-web</a> by material-components</li>
          <li><a href="https://github.com/facebook/react">react</a> by facebook</li>
          <li><a href="https://github.com/react-dropzone/react-dropzone">react-dropzone</a> by react-dropzone</li>
          <li><a href="https://github.com/wadackel/react-md-spinner">react-md-spinner</a> by wadackel</li>
        </ul>
      </div>
    </main>
  );
}

export default AboutPage;