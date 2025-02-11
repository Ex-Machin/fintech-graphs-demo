const {
    SciChartDefaults,
    SciChartSurface,
    CategoryAxis,
    NumericAxis,
    FastCandlestickRenderableSeries,
    OhlcDataSeries,
    SciChartJsNavyTheme,
    makeIncArray,
    ECoordinateMode,
    EAxisAlignment,
    FastColumnRenderableSeries,
    XyDataSeries,
    ENumericFormat,
    NumberRange,
    MouseWheelZoomModifier,
    ZoomPanModifier,
    ZoomExtentsModifier,
    IFillPaletteProvider,
    DefaultPaletteProvider,
    parseColorToUIntArgb,
    EAutoRange,
    EXyDirection
} = SciChart;

// Helper class to colour column series according to price up or down
class VolumePaletteProvider extends DefaultPaletteProvider {
    constructor(masterData, upColor, downColor) {
        super();
        this.upColorArgb = parseColorToUIntArgb(upColor);
        this.downColorArgb = parseColorToUIntArgb(downColor);
        this.ohlcDataSeries = masterData;
    }

    overrideFillArgb(xValue, yValue, index, opacity, metadata) {
        const isUpCandle =
            this.ohlcDataSeries.getNativeOpenValues().get(index) >=
            this.ohlcDataSeries.getNativeCloseValues().get(index);
        return isUpCandle ? this.upColorArgb : this.downColorArgb;
    }

    overrideStrokeArgb(xValue, yValue, index, opacity, metadata) {
        return this.overrideFillArgb(xValue, yValue, index, opacity, metadata);
    }
}

// Market data manager for WebSocket handling
class MarketDataManager {
    constructor(sciChartSurface, wasmContext, candlestickSeries, volumeSeries) {
        this.sciChartSurface = sciChartSurface;
        this.wasmContext = wasmContext;
        this.candlestickSeries = candlestickSeries;
        this.volumeSeries = volumeSeries;
        this.ws = null;
        this.currentCandle = null;
        this.currentMinute = null;
        this.volumeProfile = {};
        this.binSize = 25.0;
        
        this.connectWebSocket();
    }

    connectWebSocket() {
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onopen = () => {
            console.log('WebSocket Connected');
        };
        
        this.ws.onmessage = async (event) => {
            // Convert Blob to text and then parse as JSON
            const text = await event.data.text();
            const message = JSON.parse(text);
            this.processMessage(message);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket Disconnected');
            setTimeout(() => this.connectWebSocket(), 5000);
        };
    }

    getBin(price, binSize) {
        return Math.floor(price / binSize) * binSize;
    }

    distributeVolume(high, low, volume) {
        const startBin = this.getBin(low, this.binSize);
        const endBin = this.getBin(high, this.binSize);
        
        let totalBins = (endBin - startBin) / this.binSize + 1;
        const volumePerBin = volume / totalBins;

        for (let bin = startBin; bin <= endBin; bin += this.binSize) {
            if (this.volumeProfile[bin]) {
                this.volumeProfile[bin] += volumePerBin;
            } else {
                this.volumeProfile[bin] = volumePerBin;
            }
        }
    }

    processMessage(message) {
        if (message.type === 'l1-update' && message.last) {
            const timestamp = new Date(message.last.timestamp);
            const minuteTimestamp = Math.floor(timestamp.getTime() / 60000) * 60000;
            const price = message.last.price * 1000;
            const volume = message.last.volume / 1000;

            if (this.currentMinute !== minuteTimestamp) {
                if (this.currentCandle) {
                    this.appendCandle(this.currentCandle);
                    this.distributeVolume(
                        this.currentCandle.high,
                        this.currentCandle.low,
                        this.currentCandle.volume
                    );
                    this.updateVolumeProfile();
                }
                
                this.currentCandle = {
                    timestamp: minuteTimestamp / 1000,
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                    volume: volume
                };
                this.currentMinute = minuteTimestamp;
            } else {
                this.currentCandle.high = Math.max(this.currentCandle.high, price);
                this.currentCandle.low = Math.min(this.currentCandle.low, price);
                this.currentCandle.close = price;
                this.currentCandle.volume += volume;
            }

            this.updateLastCandle();
        }
    }

    appendCandle(candle) {
        this.candlestickSeries.dataSeries.append(
            candle.timestamp,
            candle.open,
            candle.high,
            candle.low,
            candle.close
        );
        this.volumeSeries.dataSeries.append(
            candle.timestamp,
            candle.volume
        );
    }

    updateLastCandle() {
        console.log(this.currentCandle);
        
        if (this.currentCandle) {
            const lastIndex = this.candlestickSeries.dataSeries.count() - 1;
            if (lastIndex >= 0) {
                this.candlestickSeries.dataSeries.update(
                    lastIndex,
                    this.currentCandle.timestamp,
                    this.currentCandle.open,
                    this.currentCandle.high,
                    this.currentCandle.low,
                    this.currentCandle.close
                );
                this.volumeSeries.dataSeries.update(
                    lastIndex,
                    this.currentCandle.timestamp,
                    this.currentCandle.volume
                );
            } else {
                this.appendCandle(this.currentCandle);
            }
        }
    }

    updateVolumeProfile() {
        const xVolValues = [];
        const yVolValues = [];

        for (const [price, volume] of Object.entries(this.volumeProfile)) {
            xVolValues.push(parseFloat(price));
            yVolValues.push(volume);
        }

        // Update the volume profile series if it exists
        if (this.sciChartSurface.renderableSeries.get("volumeProfileSeries")) {
            const volumeProfileSeries = this.sciChartSurface.renderableSeries.get("volumeProfileSeries");
            volumeProfileSeries.dataSeries.clear();
            volumeProfileSeries.dataSeries.appendRange(xVolValues, yVolValues);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Initializes a volume profile chart with SciChart.js
async function volumeProfile(divElementId) {
    SciChartDefaults.performanceWarnings = false;
    const { wasmContext, sciChartSurface } = await SciChartSurface.create(divElementId, {
        theme: new SciChartJsNavyTheme()
    });

    sciChartSurface.xAxes.add(new NumericAxis(wasmContext, {
        labelFormat: ENumericFormat.Date_HHMMSS
    }));

    const priceYAxis = new NumericAxis(wasmContext, {
        labelPrefix: "$",
        labelPrecision: 2
    });
    sciChartSurface.yAxes.add(priceYAxis);

    const volumeYAxis = new NumericAxis(wasmContext, {
        id: "volumeAxisId",
        isVisible: false,
        growBy: new NumberRange(0, 4)
    });
    sciChartSurface.yAxes.add(volumeYAxis);

    // Create data series
    const candleDataSeries = new OhlcDataSeries(wasmContext);
    const candlestickSeries = new FastCandlestickRenderableSeries(wasmContext, {
        strokeThickness: 1,
        dataSeries: candleDataSeries,
        dataPointWidth: 0.7,
        brushUp: "#33ff3377",
        brushDown: "#ff333377",
        strokeUp: "#77ff77",
        strokeDown: "#ff7777",
    });
    sciChartSurface.renderableSeries.add(candlestickSeries);

    const volumeDataSeries = new XyDataSeries(wasmContext);
    const volumeSeries = new FastColumnRenderableSeries(wasmContext, {
        dataPointWidth: 0.7,
        strokeThickness: 0,
        dataSeries: volumeDataSeries,
        yAxisId: "volumeAxisId",
        paletteProvider: new VolumePaletteProvider(
            candleDataSeries,
            "#33ff3377",
            "#ff333377"
        ),
    });
    sciChartSurface.renderableSeries.add(volumeSeries);

    // Create the transposed volume axes
    const volXAxis = new NumericAxis(wasmContext, {
        id: "VolX",
        axisAlignment: EAxisAlignment.Right,
        flippedCoordinates: true,
        isVisible: false,
    });
    sciChartSurface.xAxes.add(volXAxis);

    sciChartSurface.yAxes.add(new NumericAxis(wasmContext, {
        id: "VolY",
        axisAlignment: EAxisAlignment.Bottom,
        isVisible: false,
        growBy: new NumberRange(0, 3)
    }));

    // Update volume X-axis range when price Y-axis changes
    priceYAxis.visibleRangeChanged.subscribe(args => {
        volXAxis.visibleRange = new NumberRange(args.visibleRange.min, args.visibleRange.max)
    });

    // Create volume profile series
    const volumeProfileSeries = new FastColumnRenderableSeries(wasmContext, {
        id: "volumeProfileSeries",
        dataSeries: new XyDataSeries(wasmContext),
        dataPointWidth: 0.5,
        opacity: 0.33,
        fill: "White",
        strokeThickness: 0,
        xAxisId: "VolX",
        yAxisId: "VolY"
    });
    sciChartSurface.renderableSeries.add(volumeProfileSeries);

    // Initialize market data manager
    const marketDataManager = new MarketDataManager(
        sciChartSurface,
        wasmContext,
        candlestickSeries,
        volumeSeries
    );

    // Add chart modifiers
    sciChartSurface.chartModifiers.add(new MouseWheelZoomModifier({ 
        excludedYAxisIds: ["volumeAxisId", "VolY"], 
        xyDirection: EXyDirection.XDirection 
    }));
    sciChartSurface.chartModifiers.add(new ZoomPanModifier({ 
        excludedYAxisIds: ["volumeAxisId", "VolY"] 
    }));
    sciChartSurface.chartModifiers.add(new ZoomExtentsModifier());

    sciChartSurface.zoomExtents();

    // Return cleanup function
    return () => {
        marketDataManager.disconnect();
        sciChartSurface.delete();
    };
}

// Initialize the chart
volumeProfile("scichart-root");