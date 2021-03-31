import './App.scss';
import {MDCRipple} from '@material/ripple';

function App() {
  window.onload = () => {
    console.log('Hello.');
    new MDCRipple(document.querySelector('.mdc-button'));
  };
  return (
    <div className="mdc-touch-target-wrapper">
      <button className="mdc-button mdc-button--touch">
        <span className="mdc-button__ripple"></span>
        <span className="mdc-button__label">My Accessible Button</span>
        <span className="mdc-button__touch"></span>
      </button>
    </div>
  );
}

export default App;
