import React, { Component } from 'react';
import { Base64 } from 'js-base64';
import DropZone from 'react-dropzone';
import './App.css';


const defaultFn = (x, y, w, h, c, o) => o+x+y+c;
// const defaultFn = (x, y, w, h, c, o) => { 
//   // const r = x * y * c;
//   // return o - ((c) % o);
//   return o + (c % 100);
//   // return o - (c * (y/x) % 155);
//   return (o - (c * (y*x) % 65));
// }

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      counter: 0,
      cImage: null,
      input: 'o+x+y+c',
      error: null,
      fn: defaultFn,
    };

    // bind functions
    this.evalFn = this.evalFn.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.onLoad = this.onLoad.bind(this);
    this.updateUrl = this.updateUrl.bind(this);
    this.updateCanvas = this.updateCanvas.bind(this);
  }

  componentDidUpdate(prevProps, { input : prevInput, cImage: prevImage, url: prevUrl }) {
    const { input, cImage, url } = this.state;
    if (prevInput !== input) {
      this.evalFn();
    }
    if (url !== prevUrl) {
      this.updateCanvas();
    }
    if (url !== prevUrl || input !== prevInput) {
      this.updateUrl();
    }
  }

  onInputChange(event) {
    const input = event.target.value;
    this.setState({ input });
  }

  evalFn() {
    const input = this.state.input.trim();
    if (!input) {
      this.setState({ fn: null, error: null });
      return;
    }

    try {
      const fn = eval(`(x, y, w, h, c, o) => ${input}`);
      this.setState({ fn, error: null });
    } catch(error) {
      this.setState({ fn: null, error: error.message });
      console.log(error);
    }
  }

  onFrame() {
    const { fn, counter, cImage, error } = this.state;
    const canvas = this.canvas;

    const updateFrame = () => {
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let x, y, p, color, r, g, b, a, cc,
          image = imageData.data;

      for (x = 0; x < w; x += 1) {
        for (y = 0; y < h; y += 1) {
          p = (x + y * w) * 4;
          cc = cImage[p + 0] + (cImage[p + 1] << 8) + (cImage[p + 2] << 16);

          color = fn(x, y, w, h, counter, cc);
          r = color & 0x000000ff;
          g = (color & 0x0000ff00) >> 8;
          b = (color & 0x00ff0000) >> 16;
          a = 0xff;
          image[p + 0] = r;
          image[p + 1] = g;
          image[p + 2] = b;
          image[p + 3] = a;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    };

    const state = { frameError: null, counter: counter +1 };
    if (canvas && cImage && fn && !error) {
      try {
        updateFrame();
        state.frameError = null;
      } catch(fError) {
        state.frameError = fError.message;
        console.log(fError);
      }
    }
    this.setState(state);
    requestAnimationFrame(this.onFrame.bind(this));
  }

  componentDidMount() {
    this.onFrame();
    window.addEventListener("hashchange", () => this.onLocationChange(), true);
    this.onLocationChange();
  }

  updateCanvas() {
    const url = this.state.url;
    const canvas = this.canvas;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    const img = new Image();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    img.onload = () => {
      const ratio = img.width / img.height;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(img, 0, 0, canvasWidth, canvasWidth / ratio);
      const cImage = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      this.setState({ cImage });
    };
    img.src = url;
  }

  onLocationChange() {
    try {
      const { input, url } = JSON.parse(Base64.decode(location.hash.slice(1)));
      this.setState({ input, url, counter: 0 });
    } catch (e) {
      console.log(e);
    }
  }
  updateUrl() {
    const { url, input } = this.state;
    const hash = Base64.encode(JSON.stringify({ url, input }));
    history.pushState({}, '', `#${hash}`);
  }
  onLoad(url) {
    this.setState({ url });
  }
  onDrop(files) {
    const file = files[0];
    const reader  = new FileReader();
    reader.addEventListener('load', () => this.onLoad(reader.result), false);
    reader.readAsDataURL(file);
  }

  render() {
    const error = this.state.error || this.state.frameError;
    return (
      <div className="App">
        <div className="App-header">
          <input onChange={this.onInputChange} ref={node => { this.input = node; }} type="text" value={this.state.input} />
          <p>x: pixel x, y: pixel y, w: canvas width, h: canvas height, o: original color, c: cycle count. Result of formula = BBGGRR for that pixel</p>
          {error &&<p className="error">Error: {error}</p>}
        </div>
        <div className="App-main">
          <DropZone
              className="drop"
              activeClassName="active"
              disablePreview multiple={false}
              accept="image/*"
              onDrop={files => this.onDrop(files)}>
            <canvas ref={node => { this.canvas = node; }} />
          </DropZone>
        </div>
      </div>
    );
  }
}

export default App;
