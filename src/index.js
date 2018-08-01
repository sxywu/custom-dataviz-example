import * as d3 from "d3";
import _ from "lodash";
import inflation from "us-inflation";

// load movies data
let movies = require("./movies.json");

// filter movies with box office
movies = _
  .chain(movies)
  .map(d => {
    const year = +d.Year;
    const date = new Date(d.Released);
    const boxOffice = parseInt(d.BoxOffice.replace(/[\$\,]/g, ""));
    return {
      title: d.Title,
      date,
      boxOffice: boxOffice && inflation({ year, amount: boxOffice }),
      genre: d.Genre.split(", ")[0],
      year
    };
  })
  .filter(d => d.boxOffice)
  .value();
console.log(movies);

// process
const width = 1200;
const height = 700;
const svg = d3
  .select("#app")
  .append("svg")
  .attr("width", width)
  .attr("height", height);
