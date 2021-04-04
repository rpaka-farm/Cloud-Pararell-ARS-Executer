import './App.scss';
import React, {useState} from 'react';
import {MDCTopAppBar} from '@material/top-app-bar';

//ページコンポーネント
import MainPage from './pages/MainPage';

function App() {
  const pages = {
    welcome: {
      name: 'ようこそ',
      component: <div>ようこそ</div>
    },
    main: {
      name: '解析',
      component: <MainPage />
    },
    about: {
      name: 'Nemesisについて',
      component: <div>Nemesisについて</div>
    }
  };

  const [page, setPage] = useState(pages['main']);

  window.onload = () => {
    new MDCTopAppBar(document.querySelector('.mdc-top-app-bar'));
  };

  return (
    <div style={{display: 'flex', flexDirection: 'row', minHeight: '100vh'}}>
      <div>
        <aside className="mdc-drawer">
          <div className="mdc-drawer__header">
            <h3 className="mdc-drawer__title">Nemesis</h3>
            <h6 className="mdc-drawer__subtitle">アルファ版</h6>
          </div>
          <div className="mdc-drawer__content">
            <nav className="mdc-list">
              {
                Object.keys(pages).map((key) => {
                  const page_i = pages[key];
                  return <span
                    className={page.name === page_i.name ? 'mdc-list-item mdc-list-item--activated' : 'mdc-list-item'}
                    onClick={() => setPage(pages[key])}
                    key={key}
                  >
                    <span className="mdc-list-item__ripple"></span>
                    <i className="material-icons mdc-list-item__graphic" aria-hidden="true">inbox</i>
                    <span className="mdc-list-item__text">{page_i.name}</span>
                  </span>
                })
              }
            </nav>
          </div>
        </aside>
      </div>
      <div style={{flexGrow: 1}}>
        <header className="mdc-top-app-bar">
          <div className="mdc-top-app-bar__row">
            <section className="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">
              {/* <button className="material-icons mdc-top-app-bar__navigation-icon mdc-icon-button" aria-label="Open navigation menu">menu</button> */}
              <span className="mdc-top-app-bar__title">{page.name}</span>
            </section>
            <section className="mdc-top-app-bar__section mdc-top-app-bar__section--align-end" role="toolbar">
              {/* <button className="material-icons mdc-top-app-bar__action-item mdc-icon-button" aria-label="Favorite">favorite</button>
              <button className="material-icons mdc-top-app-bar__action-item mdc-icon-button" aria-label="Search">search</button>
              <button className="material-icons mdc-top-app-bar__action-item mdc-icon-button" aria-label="Options">more_vert</button> */}
            </section>
          </div>
        </header>
        {page.component}
      </div>
    </div>
  );
}

export default App;