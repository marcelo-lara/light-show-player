import WaveSurfer from './frontend/node_modules/wavesurfer.js/dist/wavesurfer.esm.js';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="w"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
const ws = WaveSurfer.create({ container: '#w' });
console.log(ws.getWrapper ? 'has getWrapper' : 'no getWrapper');
