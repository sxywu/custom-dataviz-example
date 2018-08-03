import * as d3 from "d3";
import _ from "lodash";
import inflation from "us-inflation";
import textures from "textures";
import { legendColor } from "d3-svg-legend";
import { annotation, annotationLabel } from "d3-svg-annotation";

const startYear = 2008;
const numYears = 10;
// colors (purple, green, pink)
const genreColors = ["#e683b4", "#53c3ac", "#8475e8"];
const holidayColors = {
  summer: "#eb6a5b",
  winter: "#51aae8"
};
// load movies data
let movies = require("./movies.json");

// set up SVG
const width = 1200;
const height = 300;
const margin = { top: 20, right: 20, bottom: 20, left: 40 };
const svg = d3
  .select("#app")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("overflow", "visible");

// set up animation transition
const t = d3.transition().duration(1500);
/*******************************************
 * Process movie data
 *******************************************/
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
  .filter(d => d.boxOffice && d.year >= startYear)
  .value();
