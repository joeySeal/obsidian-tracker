import * as d3 from "d3";
import { DataSets, DataPoint, RenderInfo } from "./data";

function getTickInterval(dataSets: DataSets) {
    let tickInterval;
    let days = dataSets.getDates().length;

    if (days <= 15) {
        // number of ticks: 0-15
        tickInterval = d3.timeDay;
    } else if (days <= 4 * 15) {
        // number of ticks: 4-15
        tickInterval = d3.timeDay.every(4);
    } else if (days <= 7 * 15) {
        // number of ticks: 8-15
        tickInterval = d3.timeWeek;
    } else if (days <= 15 * 30) {
        // number of ticks: 4-15
        tickInterval = d3.timeMonth;
    } else if (days <= 15 * 60) {
        // number of ticks: 8-15
        tickInterval = d3.timeMonth.every(2);
    } else {
        tickInterval = d3.timeYear;
    }

    return tickInterval;
}

function getTickFormat(dataSets: DataSets) {
    let tickFormat;
    let days = dataSets.getDates().length;

    if (days <= 15) {
        // number of ticks: 0-15
        tickFormat = d3.timeFormat("%y-%m-%d");
    } else if (days <= 4 * 15) {
        // number of ticks: 4-15
        tickFormat = d3.timeFormat("%y-%m-%d");
    } else if (days <= 7 * 15) {
        // number of ticks: 8-15
        tickFormat = d3.timeFormat("%y-%m-%d");
    } else if (days <= 15 * 30) {
        // number of ticks: 4-15
        tickFormat = d3.timeFormat("%y %b");
    } else if (days <= 15 * 60) {
        // number of ticks: 8-15
        tickFormat = d3.timeFormat("%y %b");
    } else {
        tickFormat = d3.timeFormat("%Y");
    }

    return tickFormat;
}

export function render(canvas: HTMLElement, renderInfo: RenderInfo) {
    // console.log(renderInfo.dataSets);

    // Data preprocessing
    if (renderInfo.penalty !== null) {
        for (let dataSet of renderInfo.dataSets) {
            dataSet.setPenalty(renderInfo.penalty);
        }
    }
    if (renderInfo.accum) {
        for (let dataSet of renderInfo.dataSets) {
            dataSet.accumulateValues();
        }
    }

    if (renderInfo.output === "") {
        if (renderInfo.summary !== null) {
            return renderSummary(canvas, renderInfo);
        }
        // Default
        return renderLine(canvas, renderInfo);
    } else if (renderInfo.output === "line") {
        return renderLine(canvas, renderInfo);
    } else if (renderInfo.output === "summary") {
        return renderSummary(canvas, renderInfo);
    }

    return "Unknown output type";
}

function renderLine(canvas: HTMLElement, renderInfo: RenderInfo) {
    // console.log("renderLine");
    // console.log(renderInfo);

    // Draw line chart
    let margin = { top: 10, right: 70, bottom: 70, left: 70 };
    let width = 500 - margin.left - margin.right;
    let height = 400 - margin.top - margin.bottom;
    let tooltipSize = { width: 90, height: 45 };

    if (renderInfo.line.title) {
        margin.top += 20;
    }

    let svg = d3
        .select(canvas)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    let graphArea = svg
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add graph title
    if (renderInfo.line.title) {
        graphArea
            .append("text")
            .text(renderInfo.line.title)
            .attr(
                "transform",
                "translate(" + width / 2 + "," + margin.top / 4 + ")"
            )
            .attr("class", "tracker-title");
    }

    // Add X axis
    let xDomain = d3.extent(renderInfo.dataSets.getDates());
    let xScale = d3.scaleTime().domain(xDomain).range([0, width]);

    let tickInterval = getTickInterval(renderInfo.dataSets);
    let tickFormat = getTickFormat(renderInfo.dataSets);

    let xAxisGen = d3
        .axisBottom(xScale)
        .ticks(tickInterval)
        .tickFormat(tickFormat);
    let xAxis = graphArea
        .append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxisGen)
        .attr("class", "tracker-axis");
    if (renderInfo.line.axisColor) {
        xAxis.style("stroke", renderInfo.line.axisColor);
    }

    let xAxisTickLabels = xAxis
        .selectAll("text")
        .attr("x", -9)
        .attr("y", 0)
        .attr("transform", "rotate(-65)")
        .style("text-anchor", "end")
        .attr("class", "tracker-tick-label");
    if (renderInfo.line.labelColor) {
        xAxisTickLabels.style("fill", renderInfo.line.labelColor);
    }

    let xAxisLabel = xAxis
        .append("text")
        .text(renderInfo.line.xAxisLabel)
        .attr(
            "transform",
            "translate(" + width / 2 + " ," + margin.bottom + ")"
        )
        .attr("class", "tracker-axis-label");
    if (renderInfo.line.labelColor) {
        xAxisLabel.style("fill", renderInfo.line.labelColor);
    }

    let dataSet = renderInfo.dataSets.getDataSetById(0); // For now, allow only one line
    if (dataSet === null) return;
    // console.log(dataSet);

    // Add Y axis
    let yMin = renderInfo.line.yMin;
    let yMinAssigned = false;
    if (typeof yMin !== "number") {
        yMin = d3.min(dataSet.getValues());
    } else {
        yMinAssigned = true;
    }
    let yMax = renderInfo.line.yMax;
    let yMaxAssigned = false;
    if (typeof yMax !== "number") {
        yMax = d3.max(dataSet.getValues());
    } else {
        yMaxAssigned = true;
    }
    if (yMax < yMin) {
        let yTmp = yMin;
        yMin = yMax;
        yMax = yTmp;
        let yTmpAssigned = yMinAssigned;
        yMinAssigned = yMaxAssigned;
        yMaxAssigned = yTmpAssigned;
    }
    let yExtent = yMax - yMin;

    let yScale = d3.scaleLinear();
    let yLower, yUpper;
    if (yMin >= 0 && renderInfo.accum && !yMinAssigned) {
        yLower = 0;
        if (yMaxAssigned) {
            yUpper = yMax;
        } else {
            yUpper = yMax * 1.2;
        }
    } else {
        if (yMinAssigned) {
            yLower = yMin;
        } else {
            yLower = yMin - yExtent * 0.2;
        }
        if (yMaxAssigned) {
            yUpper = yMax;
        } else {
            yUpper = yMax + yExtent * 0.2;
        }
    }
    yScale.domain([yLower, yUpper]).range([height, 0]);

    let yAxisLocation = renderInfo.line.yAxisLocation;
    let yAxisGen;
    if (yAxisLocation === "left") {
        yAxisGen = d3.axisLeft(yScale);
    } else {
        yAxisGen = d3.axisRight(yScale);
    }
    let yAxis = graphArea
        .append("g")
        .call(yAxisGen)
        .attr("class", "tracker-axis");
    if (yAxisLocation == "right") {
        yAxis.attr("transform", "translate(" + width + " ,0)");
    }
    if (renderInfo.line.axisColor) {
        yAxis.style("stroke", renderInfo.line.axisColor);
    }

    let yAxisTickLabels = yAxis
        .selectAll("text")
        .attr("class", "tracker-tick-label");
    if (renderInfo.line.labelColor) {
        yAxisTickLabels.style("fill", renderInfo.line.labelColor);
    }

    let yAxisLabelText = renderInfo.line.yAxisLabel;
    if (renderInfo.line.yAxisUnit) {
        yAxisLabelText += " (" + renderInfo.line.yAxisUnit + ")";
    }
    let yAxisLabel = yAxis
        .append("text")
        .text(yAxisLabelText)
        .attr("transform", "rotate(-90)")
        .attr("x", 0 - height / 2)
        .attr("class", "tracker-axis-label");
    if (yAxisLocation === "left") {
        yAxisLabel.attr("y", 0 - margin.left / 2);
    } else {
        yAxisLabel.attr("y", 0 + margin.right / 1.5);
    }
    if (renderInfo.line.labelColor) {
        yAxisLabel.style("fill", renderInfo.line.labelColor);
    }

    let dataArea = graphArea.append("g");

    // Add line
    if (renderInfo.line.showLine) {
        let lineGen = d3
            .line<DataPoint>()
            .defined(function (p) {
                return p.value !== null;
            })
            .x(function (p) {
                return xScale(p.date);
            })
            .y(function (p) {
                return yScale(p.value);
            });

        let line = dataArea
            .append("path")
            .attr("class", "tracker-line")
            .style("stroke-width", renderInfo.line.lineWidth);

        if (renderInfo.line.fillGap) {
            line.datum(dataSet).attr("d", lineGen as any);
        } else {
            line.datum(dataSet).attr("d", lineGen as any);
        }

        if (renderInfo.line.lineColor) {
            line.style("stroke", renderInfo.line.lineColor);
        }
    }

    // Add dots
    if (renderInfo.line.showPoint) {
        let dots = dataArea
            .selectAll("dot")
            .data(
                Array.from(dataSet).filter(function (p) {
                    p.value !== null;
                })
            )
            .enter()
            .append("circle")
            .attr("r", renderInfo.line.pointSize)
            .attr("cx", function (p) {
                return xScale(p.date);
            })
            .attr("cy", function (p) {
                return yScale(p.value);
            })
            .attr("date", function (p) {
                return d3.timeFormat("%y-%m-%d")(p.date as any);
            })
            .attr("value", function (p) {
                if (p.value !== null) {
                    if (Number.isInteger(p.value)) {
                        return p.value.toFixed(0);
                    }
                    return p.value.toFixed(2);
                }
            })
            .attr("class", "tracker-dot");
        if (renderInfo.line.pointColor) {
            dots.style("fill", renderInfo.line.pointColor);

            if (
                renderInfo.line.pointBorderColor &&
                renderInfo.line.pointBorderWidth > 0.0
            ) {
                dots.style("stroke", renderInfo.line.pointBorderColor);
                dots.style("stroke-width", renderInfo.line.pointBorderWidth);
            }
        }

        if (renderInfo.line.allowInspectData) {
            let tooltip = svg.append("g").style("opacity", 0);
            let tooltipBg = tooltip
                .append("rect")
                .attr("width", tooltipSize.width)
                .attr("height", tooltipSize.height)
                .attr("class", "tracker-tooltip");
            let tooltipLabel = tooltip
                .append("text")
                .attr("width", tooltipSize.width)
                .attr("height", tooltipSize.height)
                .attr("class", "tracker-tooltip-label");
            let tooltipLabelDate = tooltipLabel
                .append("tspan")
                .attr("x", 4)
                .attr("y", (tooltipSize.height / 5) * 2);
            let tooltipLabelValue = tooltipLabel
                .append("tspan")
                .attr("x", 4)
                .attr("y", (tooltipSize.height / 5) * 4);

            dots.on("mouseenter", function (event) {
                tooltipLabelDate.text("date:" + d3.select(this).attr("date"));
                tooltipLabelValue.text(
                    "value:" + d3.select(this).attr("value")
                );

                const [x, y] = d3.pointer(event);
                if (x < width / 2) {
                    tooltip.attr(
                        "transform",
                        "translate(" +
                            (x + tooltipSize.width * 1.3) +
                            "," +
                            (y - tooltipSize.height * 1.0) +
                            ")"
                    );
                } else {
                    tooltip.attr(
                        "transform",
                        "translate(" +
                            (x - tooltipSize.width * 0.0) +
                            "," +
                            (y - tooltipSize.height * 1.0) +
                            ")"
                    );
                }

                tooltip.transition().duration(200).style("opacity", 1);
            }).on("mouseleave", function () {
                tooltip.transition().duration(500).style("opacity", 0);
            });
        }
    }
}

function checkSummaryTemplateValid(summaryTemplate: string): boolean {
    return true;
}

let fnSet = {
    "{{min}}": function (renderInfo: RenderInfo) {
        let dataSet = renderInfo.dataSets.getDataSetById(0);
        return d3.min(dataSet.getValues());
    },
    "{{max}}": function (renderInfo: RenderInfo) {
        let dataSet = renderInfo.dataSets.getDataSetById(0);
        return d3.max(dataSet.getValues());
    },
    "{{sum}}": function (renderInfo: RenderInfo) {
        let dataSet = renderInfo.dataSets.getDataSetById(0);
        return d3.sum(dataSet.getValues());
    },
    "{{count}}": function (renderInfo: RenderInfo) {
        let dataSet = renderInfo.dataSets.getDataSetById(0);
        return dataSet.getLengthNotNull();
    },
    "{{days}}": function (renderInfo: RenderInfo) {
        let dataSet = renderInfo.dataSets.getDataSetById(0);
        let result = dataSet.getLength();
        return result;
    },
    "{{maxStreak}}": function (renderInfo: RenderInfo) {
        let streak = 0;
        let maxStreak = 0;
        let dataSet = renderInfo.dataSets.getDataSetById(0);
        for (let dataPoint of dataSet) {
            if (dataPoint.value !== null) {
                streak++;
            } else {
                streak = 0;
            }
            if (streak > maxStreak) {
                maxStreak = streak;
            }
        }
        return maxStreak;
    },
    "{{maxBreak}}": function (renderInfo: RenderInfo) {
        let streak = 0;
        let maxBreak = 0;
        let dataSet = renderInfo.dataSets.getDataSetById(0);

        for (let dataPoint of dataSet) {
            if (dataPoint.value === null) {
                streak++;
            } else {
                streak = 0;
            }
            if (streak > maxBreak) {
                maxBreak = streak;
            }
        }
        return maxBreak;
    },
    "{{average}}": function (renderInfo: RenderInfo) {
        let dataSet = renderInfo.dataSets.getDataSetById(0);
        let countNotNull = dataSet.getLengthNotNull();
        if (countNotNull > 0) {
            let sum = d3.sum(dataSet.getValues());
            return sum / countNotNull;
        }
        return null;
    },
    "{{median}}": function (renderInfo: RenderInfo) {
        let dataSet = renderInfo.dataSets.getDataSetById(0);
        return d3.median(dataSet.getValues());
    },
    "{{variance}}": function (renderInfo: RenderInfo) {
        let dataSet = renderInfo.dataSets.getDataSetById(0);
        return d3.variance(dataSet.getValues());
    },
};

function renderSummary(canvas: HTMLElement, renderInfo: RenderInfo) {
    // console.log("renderSummary");
    // console.log(renderInfo);

    // Notice renderInfo.text may be null
    if (renderInfo.summary === null) {
        return "Key 'summary' not foundin YAML";
    }

    let outputSummary = "";
    if (checkSummaryTemplateValid(renderInfo.summary.template)) {
        outputSummary = renderInfo.summary.template;
    } else {
        return "Invalid summary template";
    }

    // Loop over fnSet
    Object.entries(fnSet).forEach(([strRegex, fn]) => {
        let regex = new RegExp(strRegex, "gm");
        if (regex.test(outputSummary)) {
            // console.log("Found " + strRegex + " in text template")
            let result = fn(renderInfo);
            // console.log(result);
            if (typeof result !== "undefined" && result !== null) {
                if (Number.isInteger(result)) {
                    result = result.toFixed(0);
                } else {
                    result = result.toFixed(2);
                }
                outputSummary = outputSummary.replace(regex, result);
            } else {
                outputSummary = outputSummary.replace(regex, "{{NA}}");
            }
        }
    });

    if (outputSummary !== "") {
        let textBlock = d3.select(canvas).append("div");
        if (outputSummary.includes("\n")) {
            let outputLines = outputSummary.split("\n");
            for (let outputLine of outputLines) {
                textBlock.append("div").text(outputLine);
            }
        } else {
            textBlock.text(outputSummary);
        }

        if (renderInfo.summary.style !== "") {
            textBlock.attr("style", renderInfo.summary.style);
        }
    }
}

export function renderErrorMessage(canvas: HTMLElement, errorMessage: string) {
    let svg = d3
        .select(canvas)
        .append("div")
        .text(errorMessage)
        .style("background-color", "white")
        .style("margin-bottom", "20px")
        .style("padding", "10px")
        .style("color", "red");
}