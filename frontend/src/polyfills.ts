import { Buffer } from 'buffer';
import process from 'process';
import EventEmitter from 'events';

window.global = window;
window.process = process;
window.Buffer = Buffer;
// @ts-ignore
window.EventEmitter = EventEmitter;