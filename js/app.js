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
            folderImages: 'ui-images/',
        },

        // Defaults
        // Todo: check if these defaults are still needed and acurate.
        // Todo: remove commented-out default properties in the rest of this codebase
        default: {
            networkDirection : "Z",
            strConfig : null,
            flowDirection: null,
            buoyageDirection: null
            // dvoNumbering: "default",
            // buoys: "show",
            // streamDirection: "up"
        },

        // Behaviour
        draggableOptions : {connectToSortable: null, helper: "clone", revert: "invalid"},
        scale: "3", // How much should the tiles be scaled down when used in the toolbar? 3 means 33% of the original

        // Variables
        networkDirection : null,
        flowDirection: null,
        buoyageDirection: null,

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
        overlays: [],
        L : 0,
        strConfig: "",
        height: 700,
        overlayNames: [],
        extraImages: [],

        // Assets
        ui_images : [
            ["#bridges-diagram",["network-n-z.svg","rood-groen.svg","omlaag.svg"]],
            [".btn-remove","delete-forever.svg"],
            [".btn-remove:hover","delete-forever-hover.svg"],

            ["#label-dir-n","network-direction-north.svg"],
            ["#label-dir-e","network-direction-east.svg"],
            ["#label-dir-s","network-direction-south.svg"],
            ["#label-dir-w","network-direction-west.svg"],

            ["#label-flow-direction-down","flow-direction-down.svg"],
            ["#label-flow-direction-up","flow-direction-up.svg"],

            ["#label-flow-direction-north","flow-direction-north.svg"],
            ["#label-flow-direction-east","flow-direction-east.svg"],
            ["#label-flow-direction-south","flow-direction-south.svg"],
            ["#label-flow-direction-west","flow-direction-west.svg"],
            ["#label-buoyage-direction-north-redright","buoyage-direction-north-redright.svg"],
            ["#label-buoyage-direction-north-redleft","buoyage-direction-north-redleft.svg"],
            ["#label-buoyage-direction-north-none","buoyage-direction-none.svg"],
            ["#label-buoyage-direction-east-redright","buoyage-direction-east-redright.svg"],
            ["#label-buoyage-direction-east-redleft","buoyage-direction-east-redleft.svg"],
            ["#label-buoyage-direction-east-none","buoyage-direction-none.svg"],
            ["#label-buoyage-direction-south-redright","buoyage-direction-south-redright.svg"],
            ["#label-buoyage-direction-south-redleft","buoyage-direction-south-redleft.svg"],
            ["#label-buoyage-direction-south-none","buoyage-direction-none.svg"],
            ["#label-buoyage-direction-west-redright","buoyage-direction-west-redright.svg"],
            ["#label-buoyage-direction-west-redleft","buoyage-direction-west-redleft.svg"],
            ["#label-buoyage-direction-west-none","buoyage-direction-none.svg"],
        ],

        /**
         * Set the paths used within the app.
         *
         * Argument is an object that can contain zero or more of the following
         * properties (with their default value)
         * - folderAssets: "assets/"
         * - fileCatalogue: "catalogue/elements.yaml"
         * - folderPartials: "partials/"
         * - folderImages: 'ui-images/'
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

            var images = l.ui_images;

            for(var i=0; i<images.length; i++){
                strSelector = images[i][0];

                if ( images[i][1].constructor === Array) {
                    strRule = "background-image:" + images[i][1].map(l.getCssUrl).join((", "));
                } else {
                    strRule = "background-image: " + l.getCssUrl( images[i][1] );
                }

                l.addCSSRule(sheet, strSelector, strRule );
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

            $.get(l.path.fileCatalogue, null, l.loadElements);

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

            // jQuery-UI interactions: allow for drag-and-drop and duplication of  elements
            l.$diagram.sortable({
                revert: true,
                receive: libConfigBridges.elementDropped,
                stop: this.diagramChanged,
                forcePlaceholderSize: true
            });

            // Create some extra HTML elements:

            // ... diagram-wrapper: contains the diagram, compass rose and options
            l.$diagram.wrap('<div id="bridges-diagram-wrapper" />');
            l.$diagramWrapper = l.$diagram.find("#bridges-diagram-wrapper");

            // ... options: contains a series of options that can be set on the diagram
            l.$options =
                $("<ul id='bridges-options' />")
                    .prependTo("#bridges-diagram-wrapper");

            // ...load a series of partials into the options-div

            $.get(l.path.folderPartials + "option-network-direction.partial.html", function (data) {
                $(data).appendTo(l.$options)
                    .find("input").on("change", libConfigBridges.optionChanged); // set event handler for the on-change event

                $.get(l.path.folderPartials + "option-flow-and-buoyage-direction.partial.html", function (data) {
                    $(data).appendTo(l.$options)
                        .find("input").on("change", libConfigBridges.optionChanged); // set event handler for the on-change event

                    $("#flow-and-buoyage-direction").find("input").prop("disabled",true);
                    $("#flow-direction, #buoyage-direction").find("legend").addClass("disabled");
                });
            });

            // ...  invisible div containing the SVG just before it gets downloaded
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
                l.networkDirection,
                L.dvoNumbering,
                ")"
            ].join(" ");

            for (var i = 0; i < l.L; i++) {
                l.strConfig += l.element[i]['symbol'];

                if ( typeof l.overlays[i] !== "undefined" ){
                    l.strConfig += l.overlays[i];
                }
            }

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
                var w = l.scale * parseFloat($svg.attr("width"));
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

            /*
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
            */

            // Add the background images as SVG
            $(l.extraImages['network-dir-n']).appendTo(l.$result);

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

            // Check if the config string is empty. If so, re-install defaults.
            if (strConfig == "") {
                for (var property in l.default ) {
                    if (l.default.hasOwnProperty(property)) {
                        l[property] = l.default[property];
                    }
                }
                return;
            }

            var matches = strConfig.match(/\((.*?)\)/g);
            var strPre;

            // Split the string into three parts and keep the middle part
            if (matches.length > 0) {
                strPre = matches[0];

                strConfig = strConfig.replace(strPre, "");

                // From the first part,
                // ... remove all the spaces and brackets
                strPre = strPre.replace(/\s/gi, "");
                strPre = strPre.replace("(", "");
                strPre = strPre.replace(")", "");

                // ... and extract network direction
                l.setNetworkDirection(strPre.match(/[NOZW]/)[0]);
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
            if (!(l.$diagram instanceof jQuery)) {
                console.warn("No DOM-object assigned to contain the diagram.");
                return;
            }
            if (l.elementCatalogue.length == 0) {
                console.warn("No element catalogue found.");
                return;
            }

            // Clear the diagram
            l.$diagram.html("");
            l.element = [];
            l.shifts = [];
            l.overlays = [];

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
                        l.overlays[index-1] = value.symbol;
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

            // Determine the content of the labels and annotate the elements that have a label:
            l.annotate();
        },

        // Iterate over the elements array and add the drawings to the toolbar
        addElementsToToolbar: function() {
            var l = libConfigBridges;
            var arrOverlays = []
            l.countElementsLoaded = 0;

            $.each( l.elementCatalogue, function (key, val) {
                var id = val.name;
                var tooltip = val.tooltip;
                var $li = null;
                var draggableOptionsElement = null;
                var varName = "test";

                // Overlays may be draggable, but should not be allowed to end up in the diagram as separate entities
                draggableOptionsElement = l.draggableOptions;
                if ( val.overlay === true ) {
                    delete draggableOptionsElement.connectToSortable;
                    l.overlayNames.push(val.name);
                }

                // If the element is a symbol, load it into the toolbar.
                // ... otherwise, load it into an array

                if (val.symbol === false ) {
                    $.get( l.path.folderAssets + id + ".svg", function(data){
                        l.extraImages[id] = data;
                    }, "text" );
                } else {
                    $li = $('<li class="element"></li>').appendTo(libConfigBridges.$toolbar)
                        .attr({"title": tooltip, "data-ref": key})
                        .addClass(val.name)
                        .disableSelection()
                        .draggable(l.draggableOptions)
                        .load(l.path.folderAssets + id + ".svg", libConfigBridges.elementLoaded);

                    // rework the SVG after all the SVG's are rendered
                    libConfigBridges.observer.observe($li[0], {childList: true});
                }
            });

            console.log(l.extraImages);
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
            l.addElementsToToolbar();
            l.preloadExtraImages();
        },

        // preload some extra images that are added to the final SVG
        preloadExtraImages: function () {
            l = libConfigBridges;

            $.get("ui-images/network-dir-n-brug.svg", function (data) {
                l.extraImages['network-dir-n'] = data;
            }, 'text');

        },

        // Scale the SVG-elements, so they take up less space
        elementRendered: function(mutationRecords) {
            var $li = $(mutationRecords["0"].target);
            var $svg = $li.find("svg");
            var id = $svg.attr("id");
            var l = libConfigBridges;

            // Scale the element down and remove height-attribute
            var w = $svg.attr("width");
            $svg.attr('width', w / l.scale );
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

            l.annotate();

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

            var strOverlaysSelector = "." + l.overlayNames.join(", .");

            // Allow for an overlay to be dropped on the element.
            $target.droppable(
                {
                    drop: libConfigBridges.receiveDropOnElement,
                    accept: strOverlaysSelector
                }
            );
        },

        // event-handler for receiving an overlay dropped on a ui-element
        receiveDropOnElement: function(event, ui){
            libConfigBridges.drawOverlay($(event.target),$(ui.helper));
        },

        // Draw an overlay over the target element
        drawOverlay: function($target, $overlay) {
            var l = libConfigBridges;
            var viewBox;

            // Determine the right DOM-elements to include.
            var $svg = $target.find("svg");
            var $overlayGroup = $overlay.find("[data-name=\'overlay']");
            var i = $target.index();

            // Calculate the position
            var pxTargetWidth = l.scale * parseFloat($svg.attr("width"));
            var pxOverlayWidth = l.scale * parseFloat($overlay.find("svg").attr("width"));
            var pxCentre = (pxTargetWidth - pxOverlayWidth) / 2;

            // Change the DOM of the receiving element
            $svg.append($overlayGroup);

            // ... positioning the overlay nicely in the centre
            if (pxCentre != 0 ) {
                $svg.find("[data-name='overlay']").attr("transform", "translate(" + pxCentre + ",0)");
            }

            // Change the 'overlay' value of the element
            l.overlays[i] =  l.elementCatalogue[$overlay.attr('data-ref')]['symbol'];

            // Update drawing
            libConfigBridges.diagramChanged();
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
        annotate: function() {
            var l = libConfigBridges;
            var labelNumber = 0;
            var hasLabel = false;
            var $svg = null;

            if (l.flowDirection !== null ) {

                var suffix = {
                    "north": " W",
                    "east": " N",
                    "south": " O",
                    "west": " Z"
                }[l.flowDirection];

                // Fill the text element with the DVO number
                for (i = 0; i < l.L; i++) {
                    hasLabel = l.element[i]['hasLabel'];
                    $svg = l.arr$SVG[i];
                    console.log(i,hasLabel);

                    if (hasLabel === true) {
                        labelNumber++;

                        $svg.find("text").first().html(labelNumber + suffix);

                        if (l.element[i].name == "draai") {
                            labelNumber++;
                            $svg.find("text").last().html(labelNumber + suffix);
                        }
                    }
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
        },

        // Set the configuration strings options
        optionChanged: function() {
            var l = libConfigBridges;
            var $me = $(this);
            var varName = $me.attr("name");
            var value = $me.val();

            switch (varName ){
                case "network-direction":
                    l.networkDirection = value;
                    l.flowDirection = null;
                    $("[name='flow-direction']").prop("checked",false);
                    break;
                case "flow-direction":
                    l.flowDirection = value;
                    l.buoyageDirection = null;
                    $("[name='buoyage-direction']").prop("checked",false);
                    break;
                case "buoyage-direction":
                    l.buoyageDirection = value;
            }

            // Enable / Disable the flow direction buttons, depending on whether network direction is set
            if (l.networkDirection == null ){
                $("#flow-direction").find("input").prop("disabled",true);
                $("#flow-direction").find("legend").addClass("disabled");
            } else {
                $("#flow-direction").find("input").prop("disabled",false);
                $("#flow-direction").find("legend").removeClass("disabled");

            }

            // Hide the flow direction buttons that are irrelevant to the given network-direction
            if (l.networkDirection !== null){
                switch (l.networkDirection){
                    case "north":
                    case "south":
                        $("#label-flow-direction-north, #label-flow-direction-south").show();
                        $("#label-flow-direction-east, #label-flow-direction-west").hide();
                        break;
                    case "east":
                    case "west":
                        $("#label-flow-direction-north, #label-flow-direction-south").hide();
                        $("#label-flow-direction-east, #label-flow-direction-west").show();
                        break;
                }
            }
            // Enable / Disabe buoyage direction, depending on whether flow direction is set
            if (l.flowDirection == null ){
                $("#buoyage-direction").find("input").prop("disabled",true);
                $("#buoyage-direction").find("legend").addClass("disabled");

            } else {
                $("#buoyage-direction").find("input").prop("disabled", false);
                $("#buoyage-direction").find("legend").removeClass("disabled");

            }

            // Hide the buoyage direction buttons that are irrelevant to the given network-direction
            if (l.networkDirection !== null){
                switch (l.networkDirection){
                    case "north":
                    case "south":
                        $("#buoyage-direction-east, #buoyage-direction-west").hide();
                        $("#buoyage-direction-north, #buoyage-direction-south").show();
                        break;
                    case "east":
                    case "west":
                        $("#buoyage-direction-north, #buoyage-direction-south").hide();
                        $("#buoyage-direction-east, #buoyage-direction-west").show();
                        break;
                }
            }



            // Disable the buoyage buttons that are irrelevant to the chosen flow-direction
            if (l.flowDirection !== null ){
                console.log("#buoyage-direction-" + l.flowDirection);
                $("[id*='buoyage-direction-'] input").prop("disabled",true);
                $("#buoyage-direction-" + l.flowDirection + " input").prop("disabled",false);
            }

            l.drawDiagramBackground();
            l.diagramChanged();
        },

        // Draw backgrounds depending on the various options
        drawDiagramBackground: function () {
            var l = libConfigBridges;
            var images = [];

            images[0] = {
                "N": "network-n-z.svg",
                "W": "network-w-o.svg",
                "O": "network-o-w.svg",
                "Z":"network-z-n.svg"
            }[l.networkDirection];

            images[1] = {
                "up": "omhoog.svg",
                "down": "omlaag.svg"
            }[l.streamDirection];

            if (l.buoys){
                images[2] = {
                    "up": "rood-groen.svg",
                    "down": "groen-rood.svg"
                }[l.streamDirection];
            }

            l.$diagram.css("background-image", images.map(l.getCssUrl).join((", ")));
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
