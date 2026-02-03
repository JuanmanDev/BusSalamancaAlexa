import main, { dataStructured, getCurrentDateTime, getStopInfo } from './fetch.js';

// console.log(await getStopInfo(199));
//console.log(getCurrentDateTime());

// start timer
const start = Date.now();

console.log(await dataStructured());
console.log(`Duration: ${Date.now() - start}ms`);