import * as d3 from "d3";
import _ from "lodash";
import inflation from "us-inflation";
import textures from "textures";
import { legendColor } from "d3-svg-legend";
import { annotation, annotationLabel } from "d3-svg-annotation";

const startYear = 2008;
const numYears = 10;
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
  // pink, green, purple
  .range(["#e683b4", "#53c3ac", "#8475e8"]);
// area generater
const areaGen = d3
  .area()
  .x(d => xScale(d.date))
  .y1(d => yScale(d.val))
  .y0(yScale(0))
  .curve(d3.curveCatmullRom);

/*******************************************
 * Set up defs for drop-shadow and mask
 *******************************************/
const defs = svg.append("defs");
// dropshadow, got quite a bit of help from:
// https://github.com/nbremer/babyspikelivecoding/blob/master/js/filter.js
const drop = defs.append("filter").attr("id", "shadow");
// add color matrix to soften the opacity
drop
  .append("feColorMatrix")
  .attr("type", "matrix")
  .attr(
    "values",
    `
    0 0 0 0 0
    0 0 0 0 0
    0 0 0 0 0
    0 0 0 0.3 0
    `
  );
// add a blur to the color matrix
drop
  .append("feGaussianBlur")
  .attr("stdDeviation", 3)
  .attr("result", "coloredBlur");
// now merge the colored blur with the source graphic
const feMerge = drop.append("feMerge");
feMerge.append("feMergeNode").attr("in", "coloredBlur");
feMerge.append("feMergeNode").attr("in", "SourceGraphic");

/*******************************************
 * Draw hover boxes
 *******************************************/
const hover = d3
  .select("#app")
  .append("div")
  .style("position", "absolute")
  .style("background", "#fff")
  .style("padding", 5)
  .style("max-width", "200px")
  .style("border", "1px solid #000");

/*******************************************
 * Draw movie curves
 *******************************************/
const paths = svg
  .append("g")
  .classed("curves", true)
  .selectAll("path")
  .data(movies)
  .enter()
  .append("path")
  .style("fill", d => colorScale(d.genre))
  .style("filter", "url(#shadow)");
// for animating the curves up/down from mean
paths
  .attr("d", d =>
    areaGen([
      { date: d3.timeMonth.offset(d.date, -2), val: 0 },
      { date: d.date, val: 0 },
      { date: d3.timeMonth.offset(d.date, 2), val: 0 }
    ])
  )
  .transition(t)
  .attr("d", d =>
    areaGen([
      { date: d3.timeMonth.offset(d.date, -2), val: 0 },
      { date: d.date, val: d.boxDiff },
      { date: d3.timeMonth.offset(d.date, 2), val: 0 }
    ])
  );
// hover
paths.on("mouseover", d => {
  const [x, y] = d3.mouse(svg.node());
  hover.style("top", `${y}px`).style("left", `${x}px`).html(`
        <strong>${d.title}</strong><br />
        Box office: ${d3.format("$,.0f")(d.boxOffice)}
      `);
});

/*******************************************
 * Draw axes
 *******************************************/
const xAxis = d3
  .axisBottom()
  .tickSizeOuter(0)
  .scale(xScale);
svg
  .append("g")
  .classed("x-axis", true)
  .attr("transform", `translate(0, ${yScale(0)})`)
  .call(xAxis);

const yAxis = d3
  .axisLeft()
  .tickFormat(
    d => (d % 100000000 === 0 ? `$${parseInt((d + meanBox) / 1000000)}M` : "")
  )
  .scale(yScale);
const yAxisG = svg
  .append("g")
  .classed("y-axis", true)
  .attr("transform", `translate(${margin.left}, 0)`)
  .call(yAxis);
yAxisG.select(".domain").remove();

/*******************************************
 * Calculate holidays and draw textures
 *******************************************/
const holidayData = _
  .chain(numYears)
  .times(i => {
    return [
      {
        type: "summer",
        dates: [
          new Date(`6/1/${startYear + i}`),
          new Date(`8/30/${startYear + i}`)
        ]
      },
      {
        type: "winter",
        dates: [
          new Date(`11/1/${startYear + i}`),
          new Date(`12/31/${startYear + i}`)
        ]
      }
    ];
  })
  .flatten()
  .value();
// and draw them as textures
const summer = textures
  .lines()
  .lighter()
  .size(8)
  .stroke("#eb6a5b");
const winter = textures
  .lines()
  .lighter()
  .size(8)
  .stroke("#51aae8");
svg.call(summer);
svg.call(winter);
const holidays = svg.insert("g", ".curves");
holidays
  .selectAll(".summer")
  .data(holidayData)
  .enter()
  .append("rect")
  .attr("x", d => xScale(d.dates[0]))
  .attr("y", margin.top)
  .attr("width", d => xScale(d.dates[1]) - xScale(d.dates[0]))
  .attr("height", height - margin.top - margin.bottom)
  .attr("fill", d => (d.type === "summer" ? summer.url() : winter.url()));

/*******************************************
 * Draw legends
 *******************************************/
const legend = legendColor().scale(colorScale);
// const legendG = svg
//   .append("g")
//   .classed("legend", true)
//   .attr("transform", `translate(${width - margin.right}, ${margin.top})`)
//   .call(legend);
// legendG
//   .selectAll("text")
//   .attr("font-size", 12)
//   .attr("font-family", "Helvetica")
//   .attr("fill", "#000");

/*******************************************
 * Draw annotations
 *******************************************/
const annotationsData = _
  .chain(movies)
  .filter(d => d.boxDiff > 150000000 || d.boxDiff < -150000000)
  .map(d => {
    return {
      note: { title: d.title, align: "middle", orientation: "leftRight" },
      x: xScale(d.date),
      y: yScale(d.boxDiff),
      dx: 20,
      dy: 0
    };
  })
  .value();
const makeAnnotations = annotation()
  .type(annotationLabel)
  .textWrap(300)
  .annotations(annotationsData);
// now create the group to attach it to
const annotationG = svg
  .append("g")
  .classed("annotations", true)
  .call(makeAnnotations);
annotationG
  .selectAll("text")
  .attr("font-size", 12)
  .attr("font-family", "Helvetica")
  .attr("fill", "#000");
annotationG
  .selectAll(".annotation-note-bg")
  .attr("fill", "#fff")
  .attr("fill-opacity", 0.5)
  .attr("height", 14);

// for animating annotations up with the curves
annotationG
  .selectAll(".annotation")
  .attr("opacity", 0)
  .attr("transform", d => `translate(${d.x}, ${yScale(0)})`)
  .transition(t)
  .attr("opacity", 1)
  .attr("transform", d => `translate(${d.x}, ${d.y})`);
