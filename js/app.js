/**
 * Created by M. H. van der Velde (ideogram.nl) on 08/09/2017.
 */

var libConfigBridges;

(function (window) {
    /**
     * Module libConfig
     * @exports libConfig
     * @namespace libConfig
     */

    libConfigBridges = {
        // Settings
        path: {
            folderAssets: "assets/",
            fileCatalogue: "catalogue/elements.yaml",
            folderPartials: "partials/",
            folderImages: 'images/',
        },

        // Defaults
        chamberID: "0000",
        networkDirection : "N",
        gateNumbering : "ABC",
        draggableOptions : {connectToSortable: null, helper: "clone", revert: "invalid"},

        // Variables
        diagramTool: {},
        $toolbar: null,
        $diagram: null,
        observer: null,
        elementCatalogue : [],
        countElementsRendered : 0,
        countElementsLoaded: null,
        $diagramElement: null,
        element : [],
        arr$SVG : [],
        shifts : [],
        bridges: [],
        L : 0,
        strConfig: "",
        height: 528,
        svgArrowLeft: null,
        svgArrowRight: null,

        /**
         * Set the paths used within the app.
         *
         * Argument is an object that can contain zero or more of the following
         * properties (with their default value)
         * - folderAssets: "assets/"
         * - fileCatalogue: "catalogue/elements.yaml"
         * - folderPartials: "partials/"
         * - folderImages: 'images/'
         *
         * @param {object} objPathOptions Object containing the various paths
         * @memberof libConfig
         */
        setPaths: function (objPathOptions) {
            var l = libConfigBridges;
            // use the jQuery extend option to override the default path settings:
            jQuery.extend(l.path, objPathOptions);
            libConfigBridges.loadImagesUI();
        },

        /**
         * Force loading of the images of the GUI. This is only needed if 'setPaths' is never called
         */
        loadImagesUI: function(){
            var l = libConfigBridges;
            var sheet = libConfigBridges.addStyleSheet();

            var strSelector, strRule = "";

            var images = [
                ["#bridges-diagram","network-n-z.svg"],
                [".btn-remove","delete-forever.svg"],
                [".btn-remove:hover","delete-forever-hover.svg"],
                ["#label-dir-n","network-dir-n-brug.svg"],
                ["#label-dir-o","network-dir-o-brug.svg"],
                ["#label-dir-z","network-dir-z-brug.svg"],
                ["#label-dir-w","network-dir-w-brug.svg"],
            ];

            for(var i=0; i<images.length; i++){
                strSelector = images[i][0];
                strRule = "background-image: " + libConfigBridges.getCssUrl( images[i][1] );
                libConfigBridges.addCSSRule(sheet, strSelector, strRule );
            }
        },

        /**
         * Assign a DOM-element as container for the catalogue of DOM-elements
         * @param {string} strSelector jQuery/CSS style selector
         * @memberof libConfig
         */
        setToolbar: function (strSelector ) {

            libConfigBridges.$toolbar = $(strSelector);

            // Prepare a special welcome for our SVG-elements by calling the elementRendered function.
            libConfigBridges.observer = new MutationObserver(this.elementRendered);
            $.fx.off = true;

            libConfigBridges.$toolbar.find("li").disableSelection();
        },

        /**
         * Initiate the drawing GUI by loading the catalogue and all the assets.
         * @memberof libConfig
         */
        loadAssetsAndCatalogue: function(){
            l = libConfigBridges;

            // Load the YAML-configuration file containig names and properties of the lock-elements
            // and add them to our UI

            $.get(l.path.fileCatalogue, null, libConfigBridges.loadElements);

        },

        /**
         * Assign a DOM-element as container for the diagram.
         * @param {string} strSelector jQuery/CSS style selector
         * @memberof libConfig
         */
        setDiagram: function(strSelector) {
            var l = libConfigBridges;
            l.$diagram = $(strSelector);

            l.draggableOptions.connectToSortable = strSelector;

            // jQuery-UI interactions: allow for drag-and-drop and duplication of lock elements
            l.$diagram.sortable({
                revert: true,
                receive: libConfigBridges.elementDropped,
                stop: this.diagramChanged,
                forcePlaceholderSize: true
            });

            // Create some extra HTML elements:

            // .. diagram-wrapper: contains the diagram, compass rose and options
            l.$diagram.wrap('<div id="bridges-diagram-wrapper" />');
            l.$diagramWrapper = l.$diagram.find("#bridges-diagram-wrapper");

            // ... options: contains a series of options that can be set on the diagram
            l.$options =
                $("<ul id='bridges-options' />")
                    .prependTo("#bridges-diagram-wrapper");

            var strOptions = [
                 'network-direction'
            ];

            for (var i = 0; i < strOptions.length; i++) {

                $.get(l.path.folderPartials + "option-" + strOptions[i] + ".partial.html", function (data) {
                    $(data).appendTo(l.$options)
                        .find("input").on("change", libConfigBridges.optionChanged);
                });
            }

            // ... result: invisible div containing the SVG before it gets downloaded
            var $resultWrapper =
                $('<div id="bridges-result"></div>')
                    .insertAfter("#bridges-diagram-wrapper");

            l.$result = $('<svg></svg>')
                .appendTo($resultWrapper)
                .attr({
                    "xmlns": "http://www.w3.org/2000/svg",
                    "xmlns:xlink": "http://www.w3.org/1999/xlink"
                });

        },

        /**
         * Re-build and return the configuration string
         * @returns {string} String containig kolk-id, network direction, gate numbering, chamber configuration and comment
         * @memberof libConfig
         */
        getConfigString: function () {
            var l = libConfigBridges;

            l.strConfig = "";

            l.strConfig = [
                "(",
                l.chamberID,
                l.networkDirection,
                l.gateNumbering,
                ")"
            ].join(" ");

            for (var i = 0; i < l.L; i++) {
                l.strConfig += l.element[i]['symbol'];

                if ( typeof l.bridges[i] !== "undefined" ){
                    l.strConfig += l.bridges[i];
                }

            }

            l.strConfig += "(" + l.strComment + ")";

            return l.strConfig;

        },

        /**
         * Make the SVG from the diagram available as a download.
         * @param {string} strFileName Filename for the SVG to be offered as download
         * @memberof libConfig
         */
        composeSVG: function(strFileName) {
            var l = libConfigBridges;
            var margin = 32;
            var h = l.height + 2*margin;
            var strLeft, strRight;
            var textStyle = {
                "font-family": "sans-serif",
                "font-size": 24,
                "text-anchor": "middle",
                "fill": "#9ACAE8"
            };

            // Fill the 'result'-SVG  with the bridge-elements
            l.$result.html("");

            var x = 0;
            for (var i = 0; i < l.L; i++) {
                var $svg = l.arr$SVG[i];
                var html = $svg.html();
                var w = 2 * parseFloat($svg.attr("width"));
                var viewBox = $svg.attr("viewBox");
                var y = 0;

                // Remove the viewbox and wrap the element in a <g>-tag instead
                if (viewBox !== undefined) {
                    viewBox = viewBox.split(" ");
                    y = viewBox[1];

                    $g = $("<g>" + html + "</g>").appendTo(l.$result);

                    $g.attr("transform", "translate(" + (x - i + margin ) + "," + (-y+margin) + ")");
                    // ( We substract i from x to make the elements overlap by one pixel )
                }
                x += (w-1);
            }

            w = (x+2*margin);

            // Show  N, W, O or Z on top and bottom
            switch (l.networkDirection){
                case "N":
                    strTop= "N"; strBottom = "Z";
                    break;
                case "Z":
                    strTop= "Z"; strBottom = "N";
                    break;
                case "O":
                    strTop= "O"; strBottom = "W";
                    break;
                case "W":
                    strTop= "W"; strBottom = "O";
                    break;
            }

            $("<text />").appendTo(l.$result).attr({
                x: x/2 + margin/2,
                y: h-24})
                .attr(textStyle)
                .html( strTop );

            $("<text />").appendTo(l.$result).attr({
                x: x/2 + margin/2,
                y: 24})
                .attr(textStyle)
                .html( strBottom );


            // Adjust width and heigth

            l.$result.attr("width", w + "px");
            l.$result.attr("height", h + "px");

            // Offer the download
            libConfigBridges.offerDownload(l.$result[0].outerHTML, strFileName );
        },

        /**
         * Set the configuration string. The chamber-id, network direction, gate numbering and comments are also set
         * @param {string} strConfig A complete configuration string
         * @memberof libConfig
         */
        setConfigString: function(strConfig){
            var l = libConfigBridges;
            var matches = strConfig.match(/\((.*?)\)/g);
            var strPre, strComment;

            // Split the string into three parts and keep the middle part
            if (matches.length > 0) {
                strPre = matches[0];

                strConfig = strConfig.replace(strPre, "");

                // From the first part,
                // ... remove all the spaces and brackets
                strPre = strPre.replace(/\s/gi,"");
                strPre = strPre.replace("(","");
                strPre = strPre.replace(")","");

                // ... and extract network direction
                l.setNetworkDirection( strPre.match(/[NOZW]/)[0] );

            }

            // What remains is the 'actual' config string, the part
            // that contains all the symbols, like e.g. <S.<.   .>
            l.strConfig = strConfig;


        },

        /**
         * set the Network direction. This represents the direction of the entrance of the chamber according to RWS network direction
         * @param {string} value Either "N","Z","O" or "W"
         * @memberof libConfig
         */
        setNetworkDirection : function( value ){
            var l = libConfigBridges;
            l.networkDirection = value;
        },

        /**
         * Returns the networkwork direction.
         * @returns {string} Either "N","Z","O" or "W"
         * @memberof libConfig
         */
        getNetworkDirection : function(  ){
            var l = libConfigBridges;
            return l.networkDirection;
        },

        /**
         * Set gate numbering direction. "CBA" should practically never be needed.
         * @param {string} value Either "ABC" or "CBA"
         * @memberof libConfig
         */
        setGateNumbering: function( value ){
            var l = libConfigBridges;
            l.gateNumbering = value;
        },

        /**
         * Returns  gate numbering
         * @returns {string} Either "ABC" or "CBA"
         * @memberof libConfig
         */
        getGateNumbering: function(){
            var l = libConfigBridges;
            return l.gateNumbering;
        },

        /**
         * Draws the diagram. Call if the diagram is not updated automatically
         * @memberof libConfig
         */
        drawDiagram: function () {
            var l = libConfigBridges;
            var s = l.strConfig;
            var elements = [];
            var fill = "";
            var pos = "";
            var symbol = "";
            var name = "";
            var htmlDiagram = "";
            var i;

            // Pre-flight check
            if ( !(l.$diagram instanceof jQuery) ) console.error("No DOM-object assigned to contain the diagram.");
            if ( l.elementCatalogue.length == 0 ) console.error("No element catalogue found.");

            // Clear the diagram
            l.$diagram.html("");
            l.element = [];
            l.shifts = [];
            l.bridges = [];

            // Make a local copy of the catalogue
            var c = l.elementCatalogue.slice();

            // Sort the local catalogue by string length of the symbol, from long to small
            c.sort(compare);

            function compare(a,b) {
                if (a.symbol.length > b.symbol.length)
                    return -1;
                if (a.symbol.length < b.symbol.length)
                    return 1;
                return 0;
            }

            // Find occurrences of every symbol in the config-string and store them in an array
            for (i=0; i<c.length; i++ ){

                symbol = c[i].symbol;
                name = c[i].name;

                pos = s.indexOf( symbol );

                while (pos !== -1) {
                    elements[pos] = c[i];
                    elements[pos]['ref'] = i;
                    fill = "".padStart(symbol.length,"@");
                    s = s.replace( symbol, fill );
                    pos = s.indexOf(symbol, pos + 1 );
                }
            }

            var index = 0;

            // Copy the array to the global elements array, removing empty slots on the fly
            $.each(elements, function (i, value) {
                if (value !== undefined) {
                    if ( value.symbol == "#" || value.symbol == ":") {
                        l.bridges[index-1] = value.symbol;
                    } else {
                        l.element.push(value);
                        index++;
                    }
                }
            });

            // Fill the diagram with copies of the elements in the toolbar
            for(i=0; i<l.element.length; i++){
                name = l.element[i].name;
                $e = l.$toolbar.find("."+name);
                htmlDiagram +=  $e[0].outerHTML;
            }

            l.$diagram.html(htmlDiagram);

            l.$diagramElements = l.$diagram.find(".element");

            l.$diagramElements.each(function (i) {
                var $me = $(this);
                l.arr$SVG[i] = $me.find("svg");
                libConfigBridges.prepareForDiagramLife($me);
            });

            l.L = l.$diagramElements.length;

            // With this information, we can do a series of manipulations:
            l.annotateDVOs();
        },

        // Iterate over the elements array and add the drawings to the toolbar
        addElementsToToolbar: function() {
            var l = libConfigBridges;
            l.countElementsLoaded = 0;

            $.each( l.elementCatalogue, function (key, val) {
                var id = val.name;
                var tooltip = val.tooltip;

                var $li = $('<li class="element"></li>' ).
                    appendTo(libConfigBridges.$toolbar)
                        .attr({"title": tooltip, "data-ref": key})
                        .addClass(val.name)
                        .disableSelection()
                        .draggable(l.draggableOptions)
                        .load(l.path.folderAssets + id + ".svg", libConfigBridges.elementLoaded);

                // After the SVG is rendered, rework the SVG
                libConfigBridges.observer.observe($li[0], {childList: true});
            });
        },

        // Keeps track of the number of elements loaded
        elementLoaded: function(){
            var l = libConfigBridges;
            l.countElementsLoaded++;

            if (l.countElementsLoaded == l.elementCatalogue.length){

                if ( l.strConfig != null ){
                    libConfigBridges.drawDiagram();
                }
            }
        },

        // Loads all the separate elements into an array and add them to the toolbar
        loadElements: function(data) {
            l = libConfigBridges;
            l.elementCatalogue = jsyaml.load(data);
            libConfigBridges.addElementsToToolbar();
        },

        // Scale the SVG-elements, so they take up less space
        elementRendered: function(mutationRecords) {
            var $li = $(mutationRecords["0"].target);
            var $svg = $li.find("svg");
            var id = $svg.attr("id");
            var l = libConfigBridges;

            // Use half the width and remove the height
            var w = $svg.attr("width");
            $svg.attr('width', w / 2);
            $svg.removeAttr("height");

            l.countElementsRendered++;
            if (l.countElementsRendered == l.elementCatalogue.length) {
                l.observer.disconnect();
            }
        },

        // Update the diagram after adding, removing or re-arranging elements
        diagramChanged: function() {
            var l = libConfigBridges;

            // Store the element-information from the palette
            // into a an array connected to every element in the #diagram

            // Erase anything previously stored:
            l.element = [];
            l.arr$SVG = [];
            l.shifts = [];

            l.$diagramElements = l.$diagram.find(".element");

            l.L = l.$diagramElements.length;

            l.$diagramElements.each(function (i) {
                var $me = $(this);
                l.element[i] = l.elementCatalogue[$me.attr("data-ref")];
                l.arr$SVG[i] = $me.find("svg");
            });

            l.annotateDVOs();

        },

        // Event-handler for when an element from the toolbar is dropped on the diagram
        elementDropped: function(event, ui) {
            libConfigBridges.prepareForDiagramLife( $(ui.helper) );
        },

        // Preparing an element for it's life inside the diagram
        prepareForDiagramLife: function( $target ){
            var l = libConfigBridges;

            // Add a button to erase the element from the diagram again
            var $btnRemove = $("<a></a>").appendTo($target).addClass("btn-remove");

            $btnRemove.on("click", libConfigBridges.removeElement );

        },

        // Remove an element from the diagram
        removeElement: function(){
            var $me = $(this);
            var $li = $me.closest("li");
            var i = $li.index();

            $li.remove();
            l.diagramChanged();
        },

        // Put a label under each DVO
        annotateDVOs: function() {
            var l = libConfigBridges;
            var gateCount = 0;
            var totalGates = 0;
            var gate = false;
            var $svg = null;

            // First, find the total amount of gates
            for (i = 0; i < l.L; i++) {

                gate = l.element[i]['gate'];

                console.log(gate);

                if (gate != false) {

                    totalGates++;

                    if ( gate == "D" ){
                        totalGates++;
                    }
                }
            }

            // Fill the text element with the DVO number
            for (i = 0; i < l.L; i++) {
                gate = l.element[i]['gate'];
                $svg = l.arr$SVG[i];

                var suffix = {
                    "N" : "O",
                    "O" : "Z",
                    "Z" : "W",
                    "W" : "N"
                };

                if (gate == true ) {
                    gateCount++;
                    $svg.find("text").html( gateCount + suffix[l.networkDirection] );

                }
            }
        },

        // offer a string containing SVG as download
        offerDownload: function(strDownload, fileName) {
            var str_preface = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
            var svgData = str_preface + strDownload;
            var svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
            var svgUrl = URL.createObjectURL(svgBlob);
            var downloadLink = document.createElement("a");
            downloadLink.href = svgUrl;
            downloadLink.download = fileName + ".svg";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            // document.body.removeChild(downloadLink);
        },

        // Set the configuration strings options
        optionChanged: function() {
            var l = libConfigBridges;
            var $me = $(this);
            var value = $me.val();

            l.networkDirection = value;
            libConfigBridges.drawNetworkLetter(value);

            l.diagramChanged();
        },

        // Draw network-arrow on top of the diagram
        drawNetworkLetter: function(value) {
            var l = libConfigBridges;


            switch (value){
                case "N":
                    l.$diagram.css("background-image", libConfigBridges.getCssUrl("network-n-z.svg"));
                    break;

                case "W":
                    l.$diagram.css("background-image", libConfigBridges.getCssUrl("network-w-o.svg"));
                    break;

                case "O":
                    l.$diagram.css("background-image", libConfigBridges.getCssUrl("network-o-w.svg"));
                    break;

                case "Z":
                    l.$diagram.css("background-image", libConfigBridges.getCssUrl("network-z-n.svg"));
                    break;
            }
        },

        setChamberID: function(value){
            libConfigBridges.chamberID = value;
        },

        // --- CSS Helper functions ---
        // Helper function to construct a css-style url for an image.
        getCssUrl: function (filename){
            var l = libConfigBridges;

            // Returns for example: url("to/images/folder/filename.jpg")
            return "url("+l.path.folderImages + filename + ")";
        },

        // Create a stylesheet. Returns a reference to the stylesheet
        addStyleSheet: function () {
            var style = document.createElement("style");

            // WebKit hack :(
            style.appendChild(document.createTextNode(""));

            // Add the <style> element to the page
            document.head.appendChild(style);

            return style.sheet;
        },

        // Add a CSS rule
        addCSSRule: function (sheet, selector, rules, index) {
            if ("insertRule" in sheet) {
                sheet.insertRule(selector + "{" + rules + "}", index);
            }
            else if ("addRule" in sheet) {
                sheet.addRule(selector, rules, index);
            }
        }
    }
})(window);
