import * as d3 from "d3";
import _ from "lodash";

// load movies data
let movies = require("./movies.json");

// filter the years that have box office
movies = _
  .chain(movies)
  .map(d => {
    const date = new Date(d.Released);
    const boxOffice = parseInt(d.BoxOffice.replace(/[\$\,]/g, ""));
    return { title: d.Title, date, boxOffice, genres: d.Genre, year: +d.Year };
  })
  .filter(d => d.boxOffice)
  .groupBy(d => d.year)
  .filter(movies => movies.length >= 8)
  .map(movies =>
    _
      .chain(movies)
      .sortBy(d => -d.boxOffice)
      .take(8)
      .value()
  )
  .flatten()
  .value();
console.log(JSON.stringify(movies));
/* 1. use d3.stack to generate layout positions
d3.stack expects the data to be in the following format:
var data = [
  {month: new Date(2015, 0, 1), apples: 3840, bananas: 1920, cherries: 960, dates: 400},
  {month: new Date(2015, 1, 1), apples: 1600, bananas: 1440, cherries: 960, dates: 400},
  {month: new Date(2015, 2, 1), apples:  640, bananas:  960, cherries: 640, dates: 400},
  {month: new Date(2015, 3, 1), apples:  320, bananas:  480, cherries: 640, dates: 400}
];
so get the data into this format, where it's aggregated by dates and each top genre
*/

// process
const width = 1200;
const height = 700;
const svg = d3
  .select("#app")
  .append("svg")
  .attr("width", width)
  .attr("height", height);
