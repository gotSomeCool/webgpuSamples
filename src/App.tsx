import './App.css';

import React from 'react';

import { CANVAS_ID, HEIGHT, noop, WIDTH } from './constant';
import { init as cubeInit } from './pages/cube';
import { init as triangleInit } from './pages/triangle';
import { init as twoCubeInit } from './pages/twoCube';

enum ESample {
  NONE = -1,
  TRIANGLE,
  ROTATING_CUBE,
  TWO_CUBE
}

const List = {
  [ESample.NONE]: noop,
  [ESample.TRIANGLE]: triangleInit,
  [ESample.ROTATING_CUBE]: cubeInit,
  [ESample.TWO_CUBE]: twoCubeInit
}

interface IState {
  currSelected: ESample;
}

function getRenderFunc(frameFunc: Function) {
  const renderFunc = () => {
    frameFunc();
    requestAnimationFrame(renderFunc);
  }
  return renderFunc;
}

export default class App extends React.PureComponent<{}, IState> {
  
  constructor(props: never) {
    super(props);
    this.state = {
      currSelected: ESample.NONE
    };
  }

  private canvasRef = React.createRef<HTMLCanvasElement>();

  onTagClick = (tag: ESample) => () => {
    this.setState({
      currSelected: tag
    });
  }

  async componentDidUpdate() {
    const initFunc = List[this.state.currSelected];
    if (initFunc === noop) {
      return;
    }
    const frame = await initFunc(this.canvasRef);
    if (frame) {
      const render = getRenderFunc(frame);
      render();
    }
  }
  render() {
    return (
      <>
        <div style={{width: "100%", lineHeight: "32px"}}>
            <div className="Tag" onClick={this.onTagClick(ESample.TRIANGLE)}> TRIANGLE </div>
            <div className="Tag" onClick={this.onTagClick(ESample.ROTATING_CUBE)}> ROTATING CUBE </div>
            <div className="Tag" onClick={this.onTagClick(ESample.TWO_CUBE)}> TWO CUBE </div>
        </div>
        <canvas id={CANVAS_ID}  ref={this.canvasRef} height={HEIGHT} width={WIDTH} />
      </>
    );
  }
}
