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
  .filter(d => d.boxOffice && d.year > 2007)
  .value();
const meanBox = d3.mean(movies, d => d.boxOffice);
const genres = _
  .chain(movies)
  .countBy("genre")
  .toPairs()
  .sortBy(d => -d[1])
  .map(0)
  .take(3)
  .value();

// subtract median box from each movie
// and also filter movies by top genres
movies = _
  .chain(movies)
  .filter(d => _.includes(genres, d.genre))
  .map(d => Object.assign(d, { boxDiff: d.boxOffice - meanBox }))
  .sortBy(d => -Math.abs(d.boxDiff))
  .value();

// draw
const width = 1200;
const height = 300;
const margin = { top: 20, right: 20, bottom: 20, left: 20 };
const svg = d3
  .select("#app")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// scales
const [xMin, xMax] = d3.extent(movies, d => d.date);
const xScale = d3
  .scaleTime()
  .domain([d3.timeMonth.offset(xMin, -2), d3.timeMonth.offset(xMax, 2)])
  .range([margin.left, width - margin.right]);
const yExtent = d3.extent(movies, d => d.boxDiff);
const yScale = d3
  .scaleLinear()
  .domain(yExtent)
  .range([height - margin.bottom, margin.top]);
const colorScale = d3
  .scaleOrdinal()
  .domain(genres)
  // green, blue, pink
  .range(["#53cf8d", "#51aae8", "#e683b4"]);
// area generater
const areaGen = d3
  .area()
  .x(d => xScale(d.date))
  .y1(d => yScale(d.val))
  .y0(yScale(0))
  .curve(d3.curveCatmullRom);

// draw paths
const paths = svg
  .append("g")
  .classed("curves", true)
  .selectAll("path")
  .data(movies)
  .enter()
  .append("path")
  .attr("d", d =>
    areaGen([
      { date: d3.timeMonth.offset(d.date, -2), val: 0 },
      { date: d.date, val: d.boxDiff },
      { date: d3.timeMonth.offset(d.date, 2), val: 0 }
    ])
  )
  .attr("fill", d => colorScale(d.genre))
  .attr("stroke", "#fff");

// draw axis
const xAxis = d3.axisBottom().scale(xScale);
svg
  .append("g")
  .classed("x-axis", true)
  .attr("transform", `translate(0, ${yScale(0)})`)
  .call(xAxis);
