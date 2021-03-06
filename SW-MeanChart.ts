
interface IBoxWhiskerData {
    Label: string;
    Q1: number;
    Median: number;
    Q3: number;
    Minimum: number;
    Maximum: number;
    Mean: number;
    LowWhisker: number;
    HighWhisker: number;
    NumDataPoints: number;
    Points: number[];
    Outliers: number[];
    OutlierIndexes: number[];
    OutlierObjects?: any[];
}

interface IBoxWhiskerPlot {
    (): IBoxWhiskerPlot;
    width(): number;
    width(width: number): IBoxWhiskerPlot;
    height(): number;
    height(height: number): IBoxWhiskerPlot;
    duration(): number;
    duration(duration: number): IBoxWhiskerPlot;
    domain(): number[];
    domain(dom: number[]): IBoxWhiskerPlot;
    range(): number[];
    range(range: number[]): IBoxWhiskerPlot;
    showLabels(): boolean;
    showLabels(show: boolean): IBoxWhiskerPlot;
    showDataPoints(): boolean;
    showDataPoints(show: boolean): IBoxWhiskerPlot;
    tickFormat(): (any) => string;
    tickFormat(formatter: (value: any) => string): IBoxWhiskerPlot;
    whiskers(computeWhiskers: (data: IBoxWhiskerData, index: number) => number[]): IBoxWhiskerPlot;
}

declare module D3 {
    export interface Base {
        box: IBoxWhiskerPlot;
    }
}

// Inspired by http://informationandvisualization.de/blog/box-plot
d3.box = function () {
    var width = 1,
        height = 1,
        duration = 0,
        domain = null,
        range = null,
        value = Number,
        whiskers = boxWhiskers,
        quartiles = boxQuartiles,
        showLabels = true, // whether or not to show text labels
        showDataPoints = true, //whether or not to show data points
        numBars = 4,
        curBar = 1,
        tickFormat = "0";

    // For each small multiple¡¬
    function box(g) {
        g.each(function (data, i) {

            // each data entry is now a type with the following properties
            var d = data.Points;

            var g = d3.select(this),
                n = data.ComputeFromPoints ? data.Points.length : data.NumDataPoints,
                min = data.Minimum,
                max = data.Maximum;

            // Compute mean. Must return exactly 1 element.
            var meanData;
            var whiskerData, outlierData;
            var quartileData;

            if (data.ComputeFromPoints) {
                d = data.Points = data.Points.sort(d3.ascending);
                meanData = mean(d);
                quartileData = quartiles(d);
                data.Q1 = quartileData[0];
                data.Median = quartileData[1];
                data.Q3 = quartileData[2];
                data.LowWhisker = d3.quantile(data.Points, 0.05);
                data.HighWhisker = d3.quantile(data.Points, 0.95);
                data.Mean = meanData;

                // Compute whiskers. Must return exactly 2 elements, or null.
                var whiskerIndices = whiskers && whiskers.call(this, data, i);
                whiskerData = whiskerIndices && whiskerIndices.map(function (i) { return d[i]; });

                // Compute outliers. If no whiskers are specified, all data are "outliers".
                // We compute the outliers as indices, so that we can join across transitions!
                var outlierIndices = whiskerIndices
                    ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n))
                    : d3.range(n);
                outlierData = outlierIndices.map(function (i) { return d[i]; });
            }
            else {
                quartileData = [data.Q1, data.Median, data.Q3];
                whiskerData = [data.LowWhisker, data.HighWhisker];
                outlierData = data.Outliers;
                meanData = data.Mean;
            }

            // Compute the new x-scale.
            var x1 = d3.scale.linear()
                .domain(domain && domain.call(this, d, i) || [min, max])
                .range(range && range.call(this, d, i) || [height, 0]);

            // Note: the box, median, and box tick elements are fixed in number,
            // so we only have to handle enter and update. In contrast, the outliers
            // and other elements are variable, so we need to exit them! Variable
            // elements also fade in and out.

            // Update center line: the vertical line spanning the whiskers.
            var center = g.selectAll("line.center")
                .data(whiskerData ? [whiskerData] : []);

            //vertical line
            center.enter().insert("line", "rect")
                .attr("class", "center")
                .attr("x1", width / 2)
                .attr("x2", width / 2)
                .attr("y1", function (d) { return x1(d[0]); })
                .attr("y2", function (d) { return x1(d[1]); });

            center.exit().transition()
                .duration(duration)
                .style("opacity", 1e-6)
                .attr("y1", function (d) { return x1(d[0]); })
                .attr("y2", function (d) { return x1(d[1]); })
                .remove();

            // Update innerquartile box.
            var box = g.selectAll("rect.box")
                .data([quartileData]);

            box.enter().append("rect")
                .attr("class", "box")
                .attr("x", 0)
                .attr("width", width)
                .attr("y", function (d) { return x1(d[2]); })
                .attr("height", function (d) { return x1(d[0]) - x1(d[2]); });

            // Update median line.
            var medianLine = g.selectAll("line.median")
                .data([quartileData[1]]);

            medianLine.enter().append("line")
                .attr("class", "median")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", x1)
                .attr("y2", x1);

            // Update mean.
            var meanPoint = g.selectAll("circle")
                .data([meanData], Number);

            meanPoint.enter().insert("circle", "text")
                .attr("class", "mean")
                .attr("r", 4)
                .attr("cx", width * 3 / 4)
                .attr("cy", function (i) { return x1(meanData); })
                .text(format)

            meanPoint.exit().transition()
                .duration(duration)
                .attr("cy", function (i) { return x1(meanData); })
                .remove();

            // Update whiskers.
            var whisker = g.selectAll("line.whisker")
                .data(whiskerData || []);

            whisker.enter().insert("line", "circle, text")
                .attr("class", "whisker")
                .attr("x1", 0)
                .attr("x2", 0 + width)
                .attr("y1", x1)
                .attr("y2", x1);

            whisker.exit().transition()
                .duration(duration)
                .attr("y1", x1)
                .attr("y2", x1)
                .remove();

            // Update outliers.
            var outlier = g.selectAll("circle.outlier")
                .data(outlierData, Number);

            outlier.enter().insert("circle", "text")
                .attr("class", "outlier")
                .attr("r", 3)
                .attr("cx", width / 2)
                .attr("cy", function (i) { return x1(i); });

            outlier.exit().transition()
                .duration(duration)
                .attr("cy", function (i) { return x1(i); })
                .remove();

            if (showDataPoints == true) {
                var nonOutliers = d3.set(d);
                outlierData.forEach(function (i) { nonOutliers.remove(i); });
                var dataPlot = g.selectAll("circle.datapoint")
                    .data(nonOutliers.values(), Number);

                dataPlot.enter().insert("circle", "text")
                    .attr("class", "datapoint")
                    .attr("r", 3)
                    .attr("cx", width / 2)
                    .attr("cy", function (i) { return x1(i); });

                dataPlot.exit().transition()
                    .duration(duration)
                    .attr("cy", function (i) { return x1(i); })
                    .remove();
            }

            // Compute the tick format.
            var format = tickFormat;

            // Update box ticks.
            var boxTick = g.selectAll("text.box")
                .data(quartileData);
            if (showLabels == true) {
                boxTick.enter().append("text")
                    .attr("class", "box")
                    .attr("dy", ".3em")
                    .attr("dx", function (d, i) { return i & 1 ? 6 : -6 })
                    .attr("x", function (d, i) { return i & 1 ? +width : 0 })
                    .attr("y", x1)
                    .attr("text-anchor", function (d, i) { return i & 1 ? "start" : "end"; })
                    .text(format);
            }

            boxTick.transition()
                .duration(duration)
                .text(format)
                .attr("y", x1);

            // Update whisker ticks. These are handled separately from the box
            // ticks because they may or may not exist, and we want don't want
            // to join box ticks pre-transition with whisker ticks post-.
            var whiskerTick = g.selectAll("text.whisker")
                .data(whiskerData || []);


            if (showLabels == true) {
                whiskerTick.enter().append("text")
                    .attr("class", "whisker")
                    .attr("dy", ".3em")
                    .attr("dx", 6)
                    .attr("x", width)
                    .text(format)
                    .attr("y", x1)
                    .style("opacity", 1);
            }

            whiskerTick.exit().transition()
                .duration(duration)
                .attr("y", x1)

                .style("opacity", 1e-6)
                .remove();
        });
        d3.timer.flush();
    }

    box.width = function (x) {
        if (!arguments.length) return width;
        width = x;
        return box;
    };

    box.height = function (x) {
        if (!arguments.length) return height;
        height = x;
        return box;
    };

    box.tickFormat = function (x) {
        if (!arguments.length) return tickFormat;
        tickFormat = x;
        return box;
    };

    box.duration = function (x) {
        if (!arguments.length) return duration;
        duration = x;
        return box;
    };

    box.domain = function (x) {
        if (!arguments.length) return domain;
        domain = x == null ? x : d3.functor(x);
        return box;
    };

    box.range = function (x) {
        if (!arguments.length) return range;
        range = x == null ? x : d3.functor(x);
        return box;
    }

    box.value = function (x) {
        if (!arguments.length) return value;
        value = x;
        return box;
    };

    box.whiskers = function (x) {
        if (!arguments.length) return whiskers;
        whiskers = x;
        return box;
    };

    box.showLabels = function (x) {
        if (!arguments.length) return showLabels;
        showLabels = x;
        return box;
    };

    box.showDataPoints = function (x) {
        if (!arguments.length) return showDataPoints;
        showDataPoints = x;
        return box;
    };

    box.quartiles = function (x) {
        if (!arguments.length) return quartiles;
        quartiles = x;
        return box;
    };

    box.mean = function (x) {
        if (!arguments.length) return mean;
        mean = x;
        return box;
    };

    return box;
};

function mean(d) {
    return d3.mean(d);
}

function boxWhiskers(d) {
    return [0, d.length - 1];
}

function boxQuartiles(d) {
    return [
        d3.quantile(d, .25),
        d3.quantile(d, .5),
        d3.quantile(d, .75)
    ];
}


module powerbi.visuals {
    export interface IBoxWhiskerData {
        Label: string;
        Q1: number;
        Median: number;
        Q3: number;
        Minimum: number;
        Maximum: number;
        Mean: number;
        LowWhisker: number;
        HighWhisker: number;
        NumDataPoints: number;
        Points: number[];
        Outliers: number[];
        OutlierIndexes: number[];
        OutlierObjects?: any[];
    }

    export interface IBoxWhiskerPlot {
        (): IBoxWhiskerPlot;
        width(): number;
        width(width: number): IBoxWhiskerPlot;
        height(): number;
        height(height: number): IBoxWhiskerPlot;
        duration(): number;
        duration(duration: number): IBoxWhiskerPlot;
        domain(): number[];
        domain(dom: number[]): IBoxWhiskerPlot;
        range(): number[];
        range(range: number[]): IBoxWhiskerPlot;
        showLabels(): boolean;
        showLabels(show: boolean): IBoxWhiskerPlot;
        showDataPoints(): boolean;
        showDataPoints(show: boolean): IBoxWhiskerPlot;
        tickFormat(): (any) => string;
        tickFormat(formatter: (value: any) => string): IBoxWhiskerPlot;
        whiskers(computeWhiskers: (data: IBoxWhiskerData, index: number) => number[]): IBoxWhiskerPlot;
    }

    export interface IBoxWhiskerPlotData {
        Title: string;
        XAxisTitle: string;
        YAxisTitle: string;
        PlotData: IBoxWhiskerData[];
        Goal?: number;
    }

    export class BoxWhiskerPlotData implements IBoxWhiskerPlotData {
        constructor(public Title: string,
            public XAxisTitle: string,
            public YAxisTitle: string,
            public PlotData: IBoxWhiskerData[],
            public Goal?: number) {
        }
    }

    export class BoxWhiskerData implements IBoxWhiskerData {
        constructor(public Label: string,
            public Q1: number,
            public Median: number,
            public Q3: number,
            public Minimum: number,
            public Maximum: number,
            public Mean: number,
            public LowWhisker: number,
            public HighWhisker: number,
            public NumDataPoints: number,
            public Points: number[],
            public Outliers: number[],
            public OutlierIndexes: number[],
            public OutlierObjects?: any[]) {
        }
    }


    export class BoxWhisker implements IVisual {

        private root: D3.Selection;
        private dataView: DataView;
        private colors: IDataColorPalette;
        private hostService: IVisualHostServices;
        private currentTimeBucket: number;
        
        private static properties = {
            q1: { objectName: 'box', propertyName: 'q1' },
            q2: { objectName: 'box', propertyName: 'q2' },
            q3: { objectName: 'box', propertyName: 'q3' },
            q4: { objectName: 'box', propertyName: 'q4' },
            outlierFactor: { objectName: 'box', propertyName: 'outlierFactor' },
            yTitle: { objectName: 'box', propertyName: 'yTitle' },
            timeBucket: { objectName: "series", propertyName: "timebucket" }
        };

        public getTimeBucket(dataView: DataView): number {
            return DataViewObjects.getValue(this.dataView.metadata.objects, BoxWhisker.properties.timeBucket, 60);
        }

        private getQ1(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.q1, 0.05);
        }
        private getQ2(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.q2, 0.25);
        }
        private getQ3(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.q3, 0.75);
        }
        private getQ4(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.q4, 0.95);
        }
        private getOutlierFactor(dataView: DataView): number {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.outlierFactor, 0);
        }
        private getYTitle(dataView: DataView): string {
            return dataView.metadata && DataViewObjects.getValue(dataView.metadata.objects, BoxWhisker.properties.yTitle, "");
        }

        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Axis'),
                    description: data.createDisplayNameGetter('Role_DisplayName_AxisDescription')
                },
                {
                    name: 'Values',
                    kind: VisualDataRoleKind.Measure,
                    displayName: data.createDisplayNameGetter('Role_DisplayName_Value'),
                    requiredTypes: [{ numeric: true }],
                },
                {
                    name: 'Series',
                    kind: powerbi.VisualDataRoleKind.Grouping,
                    displayName: 'Series'
                },
            ],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        formatString: {
                            type: { formatting: { formatString: true } },
                        },
                    },
                },
                box: {
                    displayName: "Box Options",
                    properties: {
                        q1: {
                            displayName: "1st Quantile",
                            description: "Default 0.05",
                            type: { numeric: true },
                        },
                        q2: {
                            displayName: "2nd Quantile",
                            description: "Default 0.25",
                            type: { numeric: true }

                        },
                        q3: {
                            displayName: "3rd Quantile",
                            description: "Default 0.75",
                            type: { numeric: true }
                        },
                        q4: {
                            displayName: "4th Quantile",
                            description: "Default 0.95",
                            type: { numeric: true }
                        },
                        outlierFactor: {
                            displayName: "Outlier Multipler",
                            description: "Highlight IF (val <q1 - OM || val >q3 + OM ) where OM= X * (q2 - q1)",
                            type: { numeric: true }
                        },
                        yTitle: {
                            displayName: "Y Axis Title",
                            type: { numeric: false }
                        }
                    },
                },
                series: {
                    displayName: "Time Slot",
                    properties: {
                        timebucket: {
                            displayName: "Time Bucket",
                            description: "Time Bucket",
                            type: { numeric: true },
                            placeHolderText: "60",
                            suppressFormatPainterCopy: true,
                        },
                    }
                }
            },
            dataViewMappings: [
                {
                    conditions: [
                        { 'Category': { max: 1 }, 'Values': { min: 0 } },
                    ],
                    categorical: {
                        categories: {
                            for: { in: "Category" },
                            dataReductionAlgorithm: { top: {} }
                        },
                        values: {
                            group: {
                                by: 'Series',
                                select: [{ for: { in: 'Values' } }],
                            }

                        },
                        rowCount: { preferred: { min: 2 }, supported: { min: 2 } }
                    },
                }
            ],
            suppressDefaultTitle: true,
        };
        public init(options: VisualInitOptions) {
            this.root = d3.select(options.element.get(0));
            this.colors = options.style.colorPalette.dataColors;
            this.hostService = options.host;
        }

        public update(options: VisualUpdateOptions): void {
            this.root.selectAll("div").remove();
            this.hostService.setWarnings(null);
            if (options.dataViews.length === 0) { return; }
            this.dataView = options.dataViews[0];
            this.currentTimeBucket = this.getTimeBucket(this.dataView);
            var categoryIndex = null;

            var axisIndex = 0;
            var valueIndex = 1;
            if (options.dataViews[0].categorical &&
                options.dataViews[0].categorical.categories &&
                options.dataViews[0].categorical.categories.length > 0 &&
                options.dataViews[0].categorical.categories[0] &&
                options.dataViews[0].categorical.categories[0].source &&
                options.dataViews[0].categorical.categories[0].source.roles &&
                options.dataViews[0].categorical.categories[0].source.roles["Values"]) {
                axisIndex = 1;
                valueIndex = 0;
            }

            // we must have at least one row of values
            if (!options.dataViews[0].categorical ||
                (!options.dataViews[0].categorical.values &&
                    !(options.dataViews[0].categorical &&
                        options.dataViews[0].categorical.categories &&
                        options.dataViews[0].categorical.categories[valueIndex] &&
                        options.dataViews[0].categorical.categories[valueIndex].source &&
                        options.dataViews[0].categorical.categories[valueIndex].source.roles &&
                        options.dataViews[0].categorical.categories[valueIndex].source.roles["Values"]))) {
                return;
            }

            if (options.dataViews[0].categorical.categories) {
                options.dataViews[0].categorical.categories.forEach(function (col, index) {
                    if (col.source.roles && col.source.roles["Values"]) { // skip category creation when it's index 0
                        return;
                    } else {
                        categoryIndex = axisIndex;
                    }
                });
            }
         
            // check that we have the correct data
              
            var appendTo = this.root[0][0];

            var viewport = options.viewport;

            var dataPoints: boolean = true;
            // options
            var YAxisTitle = this.getYTitle(this.dataView);
            var XAxisTitle = "";
            var title = "";
            var outlierFactor = this.getOutlierFactor(this.dataView);
            var labels = true; // show the text labels beside individual boxplots?
            var q1quantile = this.getQ2(this.dataView);
            var q2quantile = this.getQ3(this.dataView);
            var lowWhiskerQuantile = this.getQ1(this.dataView);
            var highWhiskerQuantile = this.getQ4(this.dataView);
            var valueFormat = "0";
            var pData: BoxWhiskerData[] = [];

            if (lowWhiskerQuantile < 0 || lowWhiskerQuantile > 1 || lowWhiskerQuantile > q1quantile
                || q1quantile < 0 || q1quantile > 1 || q1quantile > q2quantile
                || q2quantile < 0 || q2quantile > 1 || q2quantile > highWhiskerQuantile
                || highWhiskerQuantile < 0 || highWhiskerQuantile > 1
                || highWhiskerQuantile < 0 || highWhiskerQuantile > 1
                ) {
                var visualMessage: IVisualErrorMessage = {
                    message: 'Quantiles need to be between 0 and 1 and in increasing order from 1st to 4th',
                    title: 'Invalid Quantile Multiplier',
                    detail: '',
                };
                var warning: IVisualWarning = {
                    code: 'UnexpectedValueType',
                    getMessages: () => visualMessage,
                };
                this.hostService.setWarnings([warning]);

                return;
            }

            // start converter
            var catDV: DataViewCategorical = this.dataView.categorical;
            var cat = catDV.categories[0];
            var catValues = cat.values;
            var values = catDV.values;
            var dataPoints1: any[][] = [];
            if (1 == 2) {

                var legendData: LegendData = {
                    dataPoints: [],
                    title: values[0].source.displayName
                };
                for (var i = 0, iLen = values.length; i < iLen; i++) {
                    dataPoints1.push([]);
                    legendData.dataPoints.push({
                        label: values[i].source.groupName,
                        color: this.colors.getColorByIndex(i).value,
                        icon: LegendIcon.Box,
                        selected: false,
                        identity: null
                    });
                    for (var k = 0, klen = values[i].values.length; k < klen; k++) {
                        var id = SelectionIdBuilder
                            .builder()
                            .withSeries(this.dataView.categorical.values, this.dataView.categorical.values[i])
                            .createSelectionId();
                        dataPoints1[i].push({
                            x: k,
                            y: values[i].values[k],
                            identity: id
                        });
                    }
                }
            }
            // end converter
            
            var dataView = this.dataView;
            var baseCategoryData = null;
            if (categoryIndex !== null && this.dataView.categorical.values) {
                baseCategoryData = this.dataView.categorical.values;
            }
            // else if (categoryIndex != null && this.dataView.categorical.values === undefined) {
            //     var categoryCol = this.dataView.categorical.categories[categoryIndex];
            //     var categoryData = {};
            //     // normalize the data
            //     for (var k = 0; k < this.dataView.categorical.categories.length; k++) {
            //         if (k === categoryIndex) { continue; }
            //         for (var x = 0; x < this.dataView.categorical.categories[k].values.length; x++) {
            //             if (categoryData[categoryCol.values[x]] === undefined) {
            //                 categoryData[categoryCol.values[x]] = [];
            //             }
            //             categoryData[categoryCol.values[x]].push(this.dataView.categorical.categories[k].values[x]);
            //         }
            //         if (this.dataView.categorical.categories[k].source.format) {
            //             valueFormat = this.dataView.categorical.categories[k].source.format;
            //         }
            //     }

            //     baseCategoryData = [];
            //     // put it into category format
            //     Object.keys(categoryData).forEach(function (key) {
            //         baseCategoryData.push({ 'values': categoryData[key], 'name': key });
            //     });
            // } else {
            //     if (this.dataView.categorical.categories === undefined) {
            //         return;
            //     }
            //     baseCategoryData = this.dataView.categorical.categories;
            //     valueFormat = this.dataView.categorical.categories[0].source.format;
            // }
            var nan = false;
            var boxValues: number[][] = [];
            var labelNames: string[] = [];
            var ctb = this.currentTimeBucket;
            baseCategoryData.forEach(function (categoryValues, index) {
                                
                if(categoryValues.source.groupName%ctb!=0) return;

                // make sure all the data are parseable numbers
                categoryValues.values.forEach(function (value, index1) {
                    if (!boxValues[index1]) boxValues.push([]);

                    if (isNaN(value)) {
                        nan = true;
                        return;
                    } else {
                        boxValues[index1].push(value);
                    };
                });
                if (nan) { return; }

            });

            boxValues.forEach(function (values, index) {
                values = values.sort(d3.ascending).filter(function (d, i, a) {
                    if (i == 0) return true;
                    if (a[i - 1] == d) return false;
                    return true;
                });
                var outliers = [];
                var q1 = d3.quantile(values, q1quantile);
                var q2 = d3.quantile(values, q2quantile);
                var lowWhisker = d3.quantile(values, lowWhiskerQuantile);
                var highWhisker = d3.quantile(values, highWhiskerQuantile);
                var i = -1, j = values.length, of = (q2 - q1) * outlierFactor;
                while (values[++i] <= lowWhisker - of) {
                    outliers.push(values[i]);
                }
                while (values[--j] >= highWhisker + of) {
                    outliers.push(values[j]);
                }
                var outlierIndexes = [i, j];
                values.forEach(function (val) {
                    if (val <= lowWhisker || val >= highWhisker) {
                        outliers.push(val);
                    }
                });

                var med = d3.median(values);
                var average = d3.mean(values);
                if (valueFormat === undefined) {
                    if (med < 1000 || highWhisker - lowWhisker < 100) {
                        average = Number(average.toFixed(2));
                        med = Number(med.toFixed(2));
                        lowWhisker = Number(lowWhisker.toFixed(2));
                        highWhisker = Number(highWhisker.toFixed(2));
                    }
                    else if (med.toString.length > 10) {
                        average = Math.round(average * 10) / 10;
                        med = Math.round(med * 10) / 10;
                        lowWhisker = Math.round(lowWhisker * 10) / 10;
                        highWhisker = Math.round(highWhisker * 10) / 10;
                    } else {
                        valueFormat = "0";
                    }
                }
                var bwData = {
                    Label: catValues[index],
                    Q1: q1,
                    Median: med,
                    Q3: q2,
                    Minimum: parseInt(d3.min(values).toString(), null),
                    Maximum: parseInt(d3.max(values).toString(), null),
                    Mean: average,
                    LowWhisker: lowWhisker,
                    HighWhisker: highWhisker,
                    NumDataPoints: values.length,
                    Points: values,
                    Outliers: outliers,
                    OutlierIndexes: outlierIndexes,
                    OutlierObjects: null
                };
                pData.push(bwData);

            });
            if (nan) {
                return; // our dataset has non numerical data 
            }
            var plotData =
                {
                    Title: title, XAxisTitle: XAxisTitle, YAxisTitle: YAxisTitle,
                    PlotData: pData,
                    Goal: null
                };

            var margin = { top: 5, right: 5, bottom: 40, left: 60 },
                h = Math.max(100, viewport.height - margin.top - margin.bottom - 8); // 8 for scrollbar

            var pdata = plotData.PlotData;
            var scaleData = this.createPlotAndAxesScales(plotData, h, margin.top);
            var formatter = valueFormatter.create({ format: valueFormat });
            margin.left = 50 + scaleData["boxRange"][1].toString.length * 5;
            var topLen = scaleData["boxRange"][1].toString.length * 20; // how many chars in the longest val
            var minWidth = (100 + topLen) * pData.length;
            var w = Math.max(minWidth, viewport.width - margin.left - margin.right);

            var chart = d3.box()
                .height(h)
                .width(w)
                .domain(scaleData["boxDomain"])
                .range(scaleData["boxRange"])
                .showLabels(labels)
                .showDataPoints(dataPoints)
                .tickFormat(formatter.format);

            //d3.select(appendTo.parentNode).attr("class", "boxWhisker visual ng-isolate-scope");
            if (d3.select(appendTo.parentNode).attr("class").indexOf("boxWhiskerScroll") < 0) {
                d3.select(appendTo.parentNode).attr("class", d3.select(appendTo.parentNode).attr("class") + " boxWhiskerScroll");
            }

            var svg = d3.select(appendTo)
                .attr("class", "boxWhisker")
                .append("div")
                .append("svg")
                .attr("width", w + margin.left + margin.right)
                .attr("height", h + margin.top + margin.bottom)
                .attr("class", "box")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                
            // the x-axis
            var xaxisScale = d3.scale.ordinal()
                .domain(pdata.map(function (d) { return d.Label; }))
                .rangeRoundBands([0, w], 0.7, 0.3);

            var xAxis = d3.svg.axis()
                .scale(xaxisScale)
                .orient("bottom");

            // the y-axis
            var y = d3.scale.linear()
                .domain(scaleData["yAxesDomain"])
                .range(scaleData["yAxesRange"]);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickFormat(formatter.format);
                
            // draw the boxplots
            svg.selectAll(".box")
                .data(pdata)
                .enter().append("g")
                .attr("transform", function (d) {
                return "translate(" + xaxisScale(d.Label) + "," + margin.top + ")";
            })
                .attr("data", function (d) {
                return d.Label;
            })
                .call(chart.width(xaxisScale.rangeBand()));

            var outliers = svg.selectAll("circle.outlier");
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(outliers,(tooltipEvent: TooltipEvent) => {
                var displayName = tooltipEvent.context.parentNode.attributes["data"].value;
                return [
                    {
                        displayName: displayName,
                        value: formatter.format(tooltipEvent.data),
                    }
                ];
            }, true);

            var datapoints = svg.selectAll("circle.datapoint");
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(datapoints,(tooltipEvent: TooltipEvent) => {
                var displayName = tooltipEvent.context.parentNode.attributes["data"].value;
                return [
                    {
                        displayName: displayName,
                        value: formatter.format(tooltipEvent.data),
                    }
                ];
            }, true);

            function addOrd(n) {
                var ords = [, 'st', 'nd', 'rd'];
                var m = n % 100;
                return n + ((m > 10 && m < 14) ? 'th' : ords[m % 10] || 'th');
            }

            var box = svg.selectAll("rect.box");
            TooltipManager.addTooltip(box,(tooltipEvent: TooltipEvent) => {

                return [
                    {
                        displayName: addOrd(q2quantile * 100) + " quantile",
                        value: formatter.format(tooltipEvent.data[2]),
                    },
                    {
                        displayName: "median",
                        value: formatter.format(tooltipEvent.data[1]),
                    },
                    {
                        displayName: addOrd(q1quantile * 100) + " quantile",
                        value: formatter.format(tooltipEvent.data[0]),
                    }
                ];
            }, true);

            var meanPoint = svg.selectAll("circle.mean");
            // meanPoint.text((data => {
            //     if (valueFormat == undefined) {
            //         valueFormat = "0";
            //     }
            //     var txt = visuals.valueFormatter.create({ format: valueFormat }).format(data);
            //     return txt;
            // }));
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(meanPoint,(tooltipEvent: TooltipEvent) => {
                return [
                    {
                        displayName: 'Mean',
                        value: valueFormatter.create({ format: valueFormat }).format(tooltipEvent.data),
                    }
                ];
            }, true);

            var whiskerTick = svg.selectAll("text.whisker");
            
            
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(whiskerTick,(tooltipEvent: TooltipEvent) => {
                var quartileString = '';
                if (tooltipEvent.index % 2 === 0) {
                    quartileString = addOrd(lowWhiskerQuantile * 100);
                } else {
                    quartileString = addOrd(highWhiskerQuantile * 100);
                }
                return [
                    {
                        displayName: quartileString + " quantile",
                        value: valueFormatter.create({ format: valueFormat }).format(tooltipEvent.data),
                    }
                ];
            }, true);

            var whiskerTick = svg.selectAll("line.whisker");
          
            // Add Power BI tooltip info   
            TooltipManager.addTooltip(whiskerTick,(tooltipEvent: TooltipEvent) => {
                var quartileString = '';
                if (tooltipEvent.index % 2 === 0) {
                    quartileString = addOrd(lowWhiskerQuantile * 100);
                } else {
                    quartileString = addOrd(highWhiskerQuantile * 100);
                }
                return [
                    {
                        displayName: quartileString + " quantile",
                        value: valueFormatter.create({ format: valueFormat }).format(tooltipEvent.data),
                    }
                ];
            }, true);
         
            // draw y axis
            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text") // and text1
                .attr("transform", "rotate(-90)")
                .attr("y", -60)
                .attr("x", -1 * (h + margin.top + margin.bottom) / 2)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .style("font-size", "16px")
                .text(plotData.YAxisTitle);

            // draw x axis
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + (h + margin.top + 10) + ")")
                .call(xAxis)
                .selectAll("text")
                .style("text-anchor", "middle")
                .attr("transform", function (d) {
                //return "rotate(45)";
            });

            // draw goal line if goal is set
            if (plotData.Goal && plotData.Goal !== 0) {
                svg.append("g")
                    .attr("class", "goal")
                    .append("line")             // text label for the x axis
                    .attr("x1", 0)
                    .attr("y1", y(plotData.Goal))
                    .attr("x2", w)
                    .attr("y2", y(plotData.Goal));
            }
            chart.duration(1000);
        }

        /**
         * The function calculates the mapping for data points to screen pixels for the boxes and the y axes.
         * The scaling function is really simple, it uses the median of all median values and finds the ratio
         * between that and the maximum value. This ratio is used to determine how much area is going to be used
         * to draw up to the median. If the raio is less than 20%, 20% is used
         * The data is partitioned into three domains ( min -> median of medians -> max)
         * The range is partitioned into three as well (y-axes is inverted) ( height, height - (height * scale), 0)
         * 
         */
        public createPlotAndAxesScales(plotData: IBoxWhiskerPlotData, height: number, topMargin: number) {
            var min = plotData.Goal != null ? plotData.Goal : Infinity,
                max = plotData.Goal != null ? plotData.Goal : -Infinity,
                highWhisker = plotData.PlotData[0].HighWhisker;
            var data = plotData.PlotData;
            var medians = [];

            // TODO: replace this with d3.extent
            for (var i in data) {
                var rowMax = data[i].Maximum;
                var rowMin = data[i].Minimum;
                var rowWhisker = data[i].HighWhisker;

                medians.push(data[i].Median);

                if (rowMax > max) max = rowMax;
                if (rowWhisker > highWhisker) highWhisker = rowWhisker;
                if (rowMin < min) min = rowMin;
            }

            var medianofMedians = d3.median(medians.sort(d3.ascending));
            var heightWithMargin = height + topMargin;
            var scale = medianofMedians / max;
            if (scale < 0.30) {
                scale = 0.30;
            }

            var top = Math.min(max, 0.5 * (highWhisker - medianofMedians) + highWhisker);

            // Please make sure that the domain and ranges have the same number of elements in their arrays. Otherwise the 
            // plot will be all wrong with much head scratching required. This sets up a polylinear scale 
            // ( more at https://github.com/mbostock/d3/wiki/Quantitative-Scales#linear) which requires the same number of elements
            // for ranges.
            //return {
            //    "boxDomain": [min, medianofMedians, max],
            //    "boxRange": [height, height - (height * scale), 0],
            //    "yAxesDomain": [min, medianofMedians, max],
            //    "yAxesRange": [heightWithMargin, heightWithMargin - (heightWithMargin * scale), 0 + topMargin]
            //};
            return {
                "boxDomain": [min, top],
                "boxRange": [height, 0],
                "yAxesDomain": [min, top],
                "yAxesRange": [heightWithMargin, 0 + topMargin]
            };
        }

        // This function retruns the values to be displayed in the property pane for each object.
        // Usually it is a bind pass of what the property pane gave you, but sometimes you may want to do
        // validation and return other values/defaults
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];
            switch (options.objectName) {
                case 'box':
                    var box: VisualObjectInstance = {
                        objectName: 'box',
                        displayName: 'Box',
                        selector: null,
                        properties: {
                            q1: this.getQ1(this.dataView),
                            q2: this.getQ2(this.dataView),
                            q3: this.getQ3(this.dataView),
                            q4: this.getQ4(this.dataView),
                            outlierFactor: this.getOutlierFactor(this.dataView),
                            yTitle: this.getYTitle(this.dataView),
                        }
                    };
                    instances.push(box);
                    break;
                case "series":
                    var series: VisualObjectInstance = {
                        objectName: "series",
                        displayName: "Time Slot",
                        selector: null,
                        properties: {
                            timebucket: this.getTimeBucket(this.dataView) ? this.getTimeBucket(this.dataView) : 60,
                        }
                    };
                    instances.push(series);
                    break;
            }

            return instances;
        }
    }
}
