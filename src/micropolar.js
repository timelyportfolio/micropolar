micropolar = {version: '0.1.1'};

micropolar.Axis = function module() {
    var config = {
        geometry: [],
        data: null,
        height: 500,
        width: 500,
        radialDomain: null,
        angularDomain: null,
        angularTicksStep: 1,
        flip: true,
        originTheta: 0,
        labelOffset: 10,
        radialAxisTheta: -45,
        radialTicksSuffix: '',
        angularTicksSuffix: '',
        hideFirstTick: true,
        angularTicks: null,
        showRadialAxis: true,
        showRadialCircle: true,
        minorTicks: 0,
        tickLength: null,
        rewriteTicks: null,
        angularTickOrientation: 'horizontal', // 'radial', 'angular', 'horizontal'
        radialTickOrientation: 'horizontal', // 'angular', 'horizontal'
        containerSelector: 'body',
        margin: 25,
        additionalAngularEndTick: true
    };
    var dispatch = d3.dispatch('hover'),
    	radialScale, angularScale;

    function exports(){
        d3.select(config.containerSelector)
            .datum(config.data)
            .each(function(_data, _index) {


                // Scales
                ////////////////////////////////////////////////////////////////////

                var radius = Math.min(config.width, config.height) / 2 - config.margin;
                var extent = d3.extent(_data.map(function(d, i){ return d[1]; }));
                radialScale = d3.scale.linear()
                    .domain(config.radialDomain || extent)
                    .range([0, radius]);

                var angularExtent = d3.extent(_data.map(function(d, i){ return d[0]; }));
               	var angularDomain = config.angularDomain || angularExtent;
               	var angularScaleIsOrdinal = typeof angularDomain[0] == 'string';
                if(!angularScaleIsOrdinal){
                    if(!angularDomain[2]) angularDomain[2] = config.angularTicksStep;
                    angularDomain[2] /= (config.minorTicks + 1);
                }
                else angularDomain = [0, angularDomain.length * (config.minorTicks + 1)];
                if(config.additionalAngularEndTick) angularDomain[1] += 1;
                var angularAxisRange = d3.range.apply(this, angularDomain);
                // Workaround for rounding errors
                if(!angularScaleIsOrdinal) angularAxisRange = angularAxisRange.map(function(d, i){ return parseFloat(d.toPrecision(12)) });

                angularScale = d3.scale.linear()
                    .domain(angularDomain.slice(0, 2))
                    .range(config.flip? [0, 360] : [360, 0]);


                // CHart skeleton
                ////////////////////////////////////////////////////////////////////

                var skeleton = '<svg class="chart"> \
                        <g class="chart-group"> \
                            <circle class="background-circle"></circle> \
                            <g class="angular axis"></g> \
                           <g class="geometry"></g> \
                           <g class="radial axis"> \
                                <circle class="outside-circle"></circle> \
                            </g> \
                            <g class="guides"><line></line><circle></circle></g> \
                        </g> \
                    </svg>';

                var lineStyle = {fill: 'none', stroke: 'silver'};
                var fontStyle = {'font-size': 11, 'font-family': 'Tahoma, sans-serif'};

                var container = d3.select(this)
                    .selectAll('div.chart-container')
                    .data([0]);
                container.enter()
                    .append('div')
                    .classed('chart-container', true)
                    .html(skeleton);
                
                var svg = container.select('svg');
                svg.attr({width: config.width, height: config.height})
                    .style({'pointer-events': 'none'});

                var chartGroup = svg.select('.chart-group')
                    .attr('transform', 'translate(' + config.width / 2 + ',' + config.height / 2 + ')');


                // Radial axis
                ////////////////////////////////////////////////////////////////////

                var radialAxis = svg.select('.radial.axis');
                if(config.showRadialCircle){
                    var gridCircles = radialAxis.selectAll('circle.grid-circle')
                        .data(radialScale.ticks(5));
                    var gridCirclesEnter = gridCircles.enter().append('circle')
                        .attr({'class': 'grid-circle'})
                        .style(lineStyle);
                    gridCircles.attr('r', radialScale);
                    gridCircles.exit().remove();
                }

                radialAxis.select('circle.outside-circle').attr({r: radius}).style(lineStyle);
                svg.select('circle.background-circle').attr({r: radius}).style(lineStyle);

                var currentAngle = function(d, i){ return (angularScale(angularScaleIsOrdinal? i : d) + config.originTheta) % 360; };

                if(config.showRadialAxis){
                    var axis = d3.svg.axis()
                        .scale(radialScale)
                        .ticks(5)
                        .tickSize(5);
                    var radialAxis = svg.select('.radial.axis').call(axis)  
                        .attr({transform: 'rotate('+ (config.radialAxisTheta) +')'});
                    radialAxis.selectAll('.domain').style(lineStyle);
                    radialAxis.selectAll('g>text')
                        .text(function(d, i){ return this.textContent + config.radialTicksSuffix; })
                    	.style(fontStyle)
                        .style({
                            'text-anchor': 'start'
                        })
                    	.attr({
                            x: 0,
                            y: 0,
                            dx: 0,
                            dy: 0,
                    		transform: function(d, i){ 
                                if(config.radialTickOrientation === 'horizontal') return 'rotate(' + (-config.radialAxisTheta) + ') translate(' + [0, fontStyle['font-size']] + ')';
                                else return 'translate(' + [0, fontStyle['font-size']] + ')';
                    		}
                    	});
                    radialAxis.selectAll('g>line')
                        .style({stroke: 'black'});
                }


                // Angular axis
                ////////////////////////////////////////////////////////////////////
 
                var angularAxis = svg.select('.angular.axis')
                  .selectAll('g.angular-tick')
                    .data(angularAxisRange);
                var angularAxisEnter = angularAxis.enter().append('g')
                    .attr({
                        'class': 'angular-tick',
                        transform: function(d, i) { return 'rotate(' + currentAngle(d, i) + ')'; } 
                    });
                angularAxis.exit().remove();

                angularAxisEnter.append('line')
                    .attr({'class': 'grid-line'})
                    .classed('major', function(d, i){ return (i % (config.minorTicks+1) == 0) })
                    .classed('minor', function(d, i){ return !(i % (config.minorTicks+1) == 0) })
                    .style(lineStyle);

                angularAxisEnter.append('text')
                    .attr({'class': 'axis-text'})
                    .style(fontStyle);

                svg.selectAll('line.grid-line')
                    .attr({
                        x1: config.tickLength ? radius - config.tickLength : 0,
                        x2: radius
                    });

                var ticks = svg.selectAll('text.axis-text')
                    .attr({
                        x: radius + config.labelOffset,
                        dy: '.35em',
                        transform: function(d, i) { 
                            var angle = currentAngle(d, i);
                            var rad = radius + config.labelOffset;
                            var orient = config.angularTickOrientation;
                            if(orient == 'horizontal') return 'rotate(' + (-angle) + ' ' + rad + ' 0)';
                            else if(orient == 'radial') return (angle < 270 && angle > 90) ? 'rotate(180 ' + rad + ' 0)' : null;
                            else return 'rotate('+ ((angle <= 180 && angle > 0) ? -90 : 90) +' ' + rad + ' 0)';
                        }
                    })
                    .style({'text-anchor': 'middle' })
                    .text(function(d, i) { 
                        if(angularScaleIsOrdinal) return (i % (config.minorTicks + 1) == 0)? config.angularDomain[i / (config.minorTicks+1)] + config.angularTicksSuffix : '';
                        else return (i % (config.minorTicks + 1) == 0)? d + config.angularTicksSuffix : '';
                    })
                    .style(fontStyle);

                if (config.rewriteTicks) ticks.text(function(d, i){ return config.rewriteTicks(this.textContent, i); })


                // Geometry
                ////////////////////////////////////////////////////////////////////

                var that = this;
                config.geometry.forEach(function(d, i){ 
                    d.config({
                        axisConfig: config, 
                        radialScale: radialScale, 
                        angularScale: angularScale,
                        containerSelector: that
                    })();
                });

                // Hover guides
                ////////////////////////////////////////////////////////////////////

                //TODO: get this out
                function getMousePos(){ 
            		var mousePos = d3.mouse(svg.node());
                    var mouseX = mousePos[0] - config.width / 2;
                    var mouseY = mousePos[1] - config.height / 2;
                    var mouseAngle = (Math.atan2(mouseY, mouseX) + Math.PI) / Math.PI * 180;
                    var r = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
                	return {angle: mouseAngle, radius: r}; 
                }
                svg.select('.geometry').style({'pointer-events': 'visible'});
                var guides = svg.select('.guides');
                chartGroup.on('mousemove.angular-guide', function(d, i){ 
                        var mouseAngle = getMousePos().angle;
                        guides.select('line')
                            .attr({x1: 0, y1: 0, x2: -radius, y2: 0, transform: 'rotate('+mouseAngle+')'})
                            .style({stroke: 'grey', opacity: 1});
                     })
                    .on('mouseout.angular-guide', function(d, i){ guides.select('line').style({opacity: 0}); });

                chartGroup.on('mousemove.radial-guide', function(d, i){
                        var r = getMousePos().radius;
                        guides.select('circle')
                            .attr({r: r})
                            .style({stroke: 'grey', fill: 'none', opacity: 1});
                     })
                    .on('mouseout.radial-guide', function(d, i){ 
                        guides.select('circle').style({opacity: 0}); 
                    });

            });
    }
    exports.config = function(_x) {
        if (!arguments.length) return config;
        micropolar._override(_x, config);
        return this;
    };
    exports.radialScale = function(_x){  
        return radialScale;
    };
    exports.angularScale = function(_x){  
        return angularScale;
    };
    d3.rebind(exports, dispatch, 'on');
    return exports;
};
//TODO: make it immutable
micropolar._override = function(_objA, _objB){ for(x in _objA) if(x in _objB) _objB[x] = _objA[x]; };

micropolar._rndSnd = function(){
    return (Math.random()*2-1)+(Math.random()*2-1)+(Math.random()*2-1);
};
function linePlot(_config){

    if(_config && _config.size){
        _config.width = _config.height = _config.size;
    }

    var polarPlot = micropolar.LinePlot();

    var config = {
        geometry: [polarPlot],
        data: d3.range(0, 721, 1).map(function(deg, index){ return [deg, index/720*2]; }),
        height: 250, 
        width: 250, 
        angularDomain: [0, 360],
        additionalAngularEndTick: false,
        angularTicksStep: 30,
        angularTicksSuffix: 'º',
        minorTicks: 1,
        flip: false,
        originTheta: 0,
        radialAxisTheta: -30,
        containerSelector: 'body'
    };

    micropolar._override(_config, config);

    var polarAxis = micropolar.Axis().config(config);
    polarAxis();
}

function dotPlot(_config){

    if(_config && _config.size){
        _config.width = _config.height = _config.size;
    }

    var polarPlot = micropolar.DotPlot();

    var scaleRandom = d3.scale.linear().domain([-3, 3]).range([0, 1]);
    var config = {
        geometry: [polarPlot],
        data: d3.range(0, 100).map(function(deg, index){ 
            return [~~(scaleRandom(micropolar._rndSnd()) * 1000), ~~(scaleRandom(micropolar._rndSnd()) * 100)]; 
        }),
        height: 250, 
        width: 250, 
        angularDomain: [0, 1000],
        additionalAngularEndTick: false,
        angularTicksStep: 100,
        minorTicks: 1,
        flip: false,
        originTheta: 0,
        radialAxisTheta: -15,
        containerSelector: 'body'
    };

    micropolar._override(_config, config);

    var polarAxis = micropolar.Axis().config(config);
    polarAxis();
}

function barChart(_config){

    if(_config && _config.size){
        _config.width = _config.height = _config.size;
    }

    var polarPlot = micropolar.BarChart();

    var scaleRandom = d3.scale.linear().domain([-3, 3]).range([0, 1]);
    var config = {
        geometry: [polarPlot],
        data: d3.range(0, 20).map(function(deg, index){
          return [deg * 50, Math.ceil(Math.random() * (index+1) * 5)];
        }),
        height: 250, 
        width: 250, 
        radialDomain: [-60, 100], 
        angularDomain: [0, 1000],
        angularTicksStep: 50,
        minorTicks: 1,
        flip: true,
        originTheta: 0,
        radialAxisTheta: -10,
        containerSelector: 'body'
    };

    micropolar._override(_config, config);

    var polarAxis = micropolar.Axis().config(config);
    polarAxis();
}

function areaChart(_config){

	if(_config && _config.size){
        _config.width = _config.height = _config.size;
    }

    var polarPlot = micropolar.AreaChart();

    var scaleRandom = d3.scale.linear().domain([-3, 3]).range([0, 1]);
    var config = {
        geometry: [polarPlot],
        data: d3.range(0, 12).map(function(deg, index){
          return [deg * 50 + 50, ~~(Math.random() * 10 + 5)];
        }),
        height: 250, 
        width: 250, 
        radialDomain: [0, 20], 
        angularDomain: ['North', 'East', 'South', 'West'], 
        additionalAngularEndTick: false,
        minorTicks: 2,
        flip: true,
        originTheta: -90,
        radialAxisTheta: -30,
        radialTicksSuffix: '%',
        containerSelector: 'body'
    };

    micropolar._override(_config, config);

    var polarAxis = micropolar.Axis().config(config);
    polarAxis();
}

function areaStackedChart(_config){

	if(_config && _config.size){
        _config.width = _config.height = _config.size;
    }

    var polarPlot = micropolar.AreaStackedChart();

    var scaleRandom = d3.scale.linear().domain([-3, 3]).range([0, 1]);
    var config = {
        geometry: [polarPlot],
        data: d3.range(0, 12).map(function(deg, index){
          return [deg * 50 + 50, ~~(Math.random() * 10 + 5)];
        }),
        height: 250, 
        width: 250, 
        radialDomain: [0, 20], 
        angularDomain: ['North', 'East', 'South', 'West'], 
        additionalAngularEndTick: false,
        minorTicks: 2,
        flip: true,
        originTheta: -90,
        radialAxisTheta: -30,
        radialTicksSuffix: '%',
        containerSelector: 'body'
    };

    micropolar._override(_config, config);

    var dataStacked = d3.nest().key(function (d) { return d[3] }).entries(_config.data);
    dataStacked.forEach(function (d) {
      d.values.forEach(function (val) {
        val.x = val[0];
        val.y = +val[1];
      })
    });
    var stacked = d3.layout.stack();
    stacked(dataStacked.map(function (d) {
      return d.values;
    }));

    config.data = [].concat.apply([],dataStacked.map(function(d){return d.values}));

    var polarAxis = micropolar.Axis().config(config);
    polarAxis();
}

function clock(_config){

	if(_config && _config.size){
        _config.width = _config.height = _config.size;
    }

    var polarPlot = micropolar.Clock();

    var scaleRandom = d3.scale.linear().domain([-3, 3]).range([0, 1]);
    var config = {
        geometry: [polarPlot],
        data: [12, 4, 8],
        height: 250, 
        width: 250, 
        angularDomain: [0, 12],
        additionalAngularEndTick: false,
        minorTicks: 9,
        flip: true,
        originTheta: -90,
        showRadialAxis: false,
        showRadialCircle: false,
        rewriteTicks: function(d, i){ return (d === '0')? '12': d; },
        labelOffset: -15,
        tickLength: 5,
        containerSelector: 'body'
    };

    micropolar._override(_config, config);

    var polarAxis = micropolar.Axis().config(config);
    polarAxis();
}


micropolar.preset = {
    linePlot: linePlot,
    dotPlot: dotPlot,
    barChart: barChart,
    areaChart: areaChart,
    areaStackedChart: areaStackedChart,
    clock: clock
 };
