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

        // Defaults if no config string is given
        default: {
            networkDirection : "z",
            flowDirection: "n",
            buoyage: "rood-rechts"
        },

        // Behaviour
        draggableOptions : {connectToSortable: null, helper: "clone", revert: "invalid"},
        scale: "3", // How much should the tiles be scaled down when used in the toolbar? 3 means 33% of the original

        // Variables
        networkDirection : null,
        flowDirection: null,
        buoyage: null,

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
        height: 720,
        overlayNames: [],
        extraImages: [],
        extraImagesCount: 0,

        // Assets
        ui_images : [
            ["#bridges-diagram",["network-n-z.svg","rood-groen.svg","omlaag.svg"]],
            [".btn-remove","delete-forever.svg"],
            [".btn-remove:hover","delete-forever-hover.svg"],

            ["#label-network-direction-n","network-direction-n.svg"],
            ["#label-network-direction-o","network-direction-o.svg"],
            ["#label-network-direction-z","network-direction-z.svg"],
            ["#label-network-direction-w","network-direction-w.svg"],
            
            ["#label-flow-direction-n","flow-direction-n.svg"],
            ["#label-flow-direction-o","flow-direction-o.svg"],
            ["#label-flow-direction-z","flow-direction-z.svg"],
            ["#label-flow-direction-w","flow-direction-w.svg"],
            
            ["#label-buoyage-direction-n-rood-rechts","buoyage-direction-n-rood-rechts.svg"],
            ["#label-buoyage-direction-n-rood-links","buoyage-direction-n-rood-links.svg"],
            ["#label-buoyage-direction-n-geen","buoyage-direction-geen.svg"],
            ["#label-buoyage-direction-o-rood-rechts","buoyage-direction-o-rood-rechts.svg"],
            ["#label-buoyage-direction-o-rood-links","buoyage-direction-o-rood-links.svg"],
            ["#label-buoyage-direction-o-geen","buoyage-direction-geen.svg"],
            ["#label-buoyage-direction-z-rood-rechts","buoyage-direction-z-rood-rechts.svg"],
            ["#label-buoyage-direction-z-rood-links","buoyage-direction-z-rood-links.svg"],
            ["#label-buoyage-direction-z-geen","buoyage-direction-geen.svg"],
            ["#label-buoyage-direction-w-rood-rechts","buoyage-direction-w-rood-rechts.svg"],
            ["#label-buoyage-direction-w-rood-links","buoyage-direction-w-rood-links.svg"],
            ["#label-buoyage-direction-w-geen","buoyage-direction-geen.svg"],
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
        setDiagram: function (strSelector) {
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


                    /*
                    $("#flow-and-buoyage-direction").find("input").prop("disabled", true);
                    $("#flow-direction, #buoyage-direction").find("legend").addClass("disabled");
                    */

                    // Update the GUI to reflect settings from the configstring
                    l.setGUIState();
                    l.updateGUI();

                });
            });

            l.createResultWrapper();
        },

        // Create  invisible div containing the SVG just before it gets downloaded
        createResultWrapper: function(){
            var $resultWrapper =
                $('<div id="bridges-result"></div>')
                    .insertAfter("#bridges-diagram-wrapper");

            var svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            l.$result = $(svgElement);

            l.$result
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
                l.networkDirection === l.flowDirection ? "tegen" : "mee",
                l.buoyage,
                ")"
            ].join(" ");

            for (var i = 0; i < l.L; i++) {

                l.strConfig += " " + l.element[i]['symbol'];

                if ( typeof l.overlays[i] !== "undefined" ){
                    l.strConfig += " " + l.overlays[i];
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

            // Add some extra images
            // ... wind points

            flowIndex = ["n", "o", "z", "w"].indexOf(l.flowDirection);

            images = l.arrayRotate(["n", "o", "z", "w"], flowIndex);

            windPoints = {
                $top: $(l.extraImages[images[0]]).appendTo(l.$result),
                $right: $(l.extraImages[images[1]]).appendTo(l.$result),
                $bottom: $(l.extraImages[images[2]]).appendTo(l.$result),
                $left: $(l.extraImages[images[3]]).appendTo(l.$result)
            };

            $.each(windPoints, function(index, $windpoint){
                $windpoint.attr({width: 24, height: 24});
            });

            windPoints.$top.attr({x: w/2-12, y: 6});
            windPoints.$right.attr({x: w-30, y: h/2});
            windPoints.$bottom.attr({x: w/2-12, y: h-30});
            windPoints.$left.attr({x: 6, y: h/2});

            // ... flow direction
            $(l.extraImages['stroomafwaarts']).appendTo(l.$result).attr({
                x: 0.60*w-84,
                y: h-24-6,
                width: 168,
                height: 24
            });

            // ..."Afvaart" en "Opvaart
            if (l.buoyage !== null) {
                switch (l.buoyage) {
                    case "geen":
                    case "rood-rechts":
                        $afvaart = $(l.extraImages['afvaart-omhoog']).appendTo(l.$result);
                        break;
                    case "rood-links":
                        $afvaart = $(l.extraImages['afvaart-omlaag']).appendTo(l.$result);
                }
            }

            $afvaart.attr({
               x: 0.4*w-48,
               y: h-24-6,
               width: 96,
               height: 24
            });

            // ... buoyns
            if (l.buoyage !== null && l.buoyage !== "geen"){
                switch(l.buoyage){
                    case "rood-rechts":
                        $buoyns = $(l.extraImages['betonning-rood-rechts']).appendTo(l.$result);
                        break;
                    case "rood-links":
                        $buoyns = $(l.extraImages['betonning-rood-links']).appendTo(l.$result);
                        break;
                }
            }

            $buoyns.attr({
                x: w/2-180,
                y: margin,
                width: 360,
                height: 720
            });

            // Adjust width and height
            l.$result.attr("viewBox",[0,0,w,h].join(" ") );

            // Offer the download
            libConfigBridges.offerDownload(l.$result[0].outerHTML, strFileName );
        },

        /**
         * Set the configuration string within the editor.
         * @param {string} strConfig A complete configuration string
         * @memberof libConfig
         */
        setConfigString: function(strConfig){
            var l = libConfigBridges;
            var arrPre = [];
            var strPre = "";
            var flowChoice = null;

            // Check if the config string is empty. If so, re-install defaults.
            if (strConfig == "") {
                for (var property in l.default ) {
                    if (l.default.hasOwnProperty(property)) {
                        l[property] = l.default[property];
                    }
                }
                return;
            }

            arrPre = strConfig.match(/\((.*?)\)/g);

            // Split the string into two parts: the pre fix and the sequence of symbols
            if (arrPre.length > 0) {
                strPre = arrPre[0];

                // strip the config string from it's prefix
                strConfig = strConfig.replace(strPre, "");

                // From the first part,
                // ... remove the spaces and convert to lower case
                strPre = strPre.replace("(", "");
                strPre = strPre.replace(")", "");
                strPre = strPre.toLowerCase();

                // .. split into parts
                arrParts = strPre.split(" ");

                // ... and extract the fairway options:
                // ... ... network direction
                if ( arrParts.length > 0 ) {
                    l.networkDirection = arrParts[0];
                }

                // ... .. flow direction
                if ( arrParts.length > 1 ){
                    l.flowDirection = {
                        'mee': {
                            'n': 'z',
                            'o': 'w',
                            'z': 'n',
                            'w': 'o'
                        },
                        'tegen': {
                            'n': 'n',
                            'o': 'o',
                            'z': 'z',
                            'w': 'w'
                        }
                    }[arrParts[1]][l.networkDirection];
                }

                if (  arrParts.length > 2 ) {
                    l.buoyage = arrParts[2];
                }
            }

            // What remains is the 'actual' config string, the part
            // that contains all the symbols

            l.strConfig = strConfig;
        },

        /**
         * set the Network direction.
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
            var configstring = l.strConfig;
            var elements = [];
            var fill = "";
            var pos = "";
            var symbol = "";
            var name = "";
            var htmlDiagram = "";
            var i;
            var catalogue = null;
            var index = 0;

            // Pre-flight check
            if (!(l.$diagram instanceof jQuery)) {
                console.warn("No DOM-object assigned to contain the diagram.");
                return;
            }
            if (l.elementCatalogue.length == 0) {
                console.warn("No element catalogue found.");
                return;
            }

            if (l.detectIE()){
                alert(
                    "Het lijkt erop dat u Internet Explorer gebruikt. De werking van deze" +
                    "pagina is niet gegarandeerd onder deze browser. Probeer een andere browser," +
                    "zoals Chrome of Firefox."
                )
            }

            // Clear the diagram
            l.$diagram.html("");
            l.element = [];
            l.shifts = [];
            l.overlays = [];

            // Make a local copy of the catalogue
            catalogue = l.elementCatalogue.slice();

            // Sort the local catalogue by string length of the symbol, from long to small
            catalogue.sort(compare);

            function compare(a,b) {
                if (a.symbol.length > b.symbol.length)
                    return -1;
                if (a.symbol.length < b.symbol.length)
                    return 1;
                return 0;
            }

            // Find occurrences of every symbol in the config-string and store them in an array
            for (i=0; i<catalogue.length; i++ ){

                symbol = catalogue[i].symbol;
                name = catalogue[i].name;

                pos = configstring.indexOf( symbol );

                while (pos !== -1) {
                    elements[pos] = catalogue[i];
                    elements[pos]['ref'] = i;
                    fill = "".padStart(symbol.length,"@");
                    configstring = configstring.replace( symbol, fill );
                    pos = configstring.indexOf(symbol, pos + 1 );
                }
            }

            // Copy the array to the global elements array, removing empty slots on the fly
           index = 0;
           $.each(elements, function (i, value) {
                if (value !== undefined) {
                    if ( value.overlay === true) {
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
                    }, "html" );
                    l.extraImagesCount++;
                } else {
                    $li = $('<li class="element"></li>').appendTo(libConfigBridges.$toolbar)
                        .attr({"title": tooltip, "data-ref": key})
                        .addClass(val.name)
                        .disableSelection()
                        .draggable(l.draggableOptions)
                        .load(l.path.folderAssets + id + ".svg", libConfigBridges.elementLoaded);

                    // rework the SVG after all the SVG's are rendered
                    l.observer.observe($li[0], {childList: true});
                }
            });
        },

        // run drawDiagram when after all the elements have been loaded
        elementLoaded: function(){
            var l = libConfigBridges;

            l.countElementsLoaded++;

            if (l.countElementsLoaded == (l.elementCatalogue.length - l.extraImagesCount )){
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
        },

        // invoked after each element has rendered:
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

            if (i in l.overlays ){
                // remove overlay, but not the underlying element
                $li.find("g[data-name='overlay']").remove();
                delete l.overlays[i];
            } else {
                // remove the element
                l.overlays.splice(i,1);
                $li.remove();
                l.diagramChanged();
            }

        },

        // Put a label under each DVO
        annotate: function() {
            var l = libConfigBridges;
            var labelNumber = 0;
            var hasLabel = false;
            var $svg = null;

            if (l.flowDirection !== null ) {

                var suffix = {
                    "n": " W",
                    "o": " N",
                    "z": " O",
                    "w": " Z"
                }[l.flowDirection];

                // Fill the text element with the DVO number
                for (i = 0; i < l.L; i++) {
                    hasLabel = l.element[i]['hasLabel'];
                    $svg = l.arr$SVG[i];

                    if (hasLabel === true) {
                        labelNumber++;

                        $svg.find("text").first().html(labelNumber + suffix);

                        if (l.element[i].name == "draai") {
                            labelNumber++;
                            $svg.find("text").last().html(labelNumber + suffix);
                        }
                    }
                }

                // If there's only one DVO, remove the suffix again
                if ( labelNumber == 1){
                    $svg.find("text").first().html("1");
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

        // Set the configuration strings options. Handle the logic of showing and hiding the UI-elements
        optionChanged: function() {
            var l = libConfigBridges;
            var $me = $(this);
            var varName = $me.attr("name");
            var value = $me.val();

            switch (varName) {
                case "network-direction":
                    l.networkDirection = value;
                    l.flowDirection = null;
                    $("[name='flow-direction']").prop("checked", false);
                    break;
                case "flow-direction":
                    l.flowDirection = value;
                    l.buoyage = null;
                    $("[name='buoyage-direction']").prop("checked", false);
                    break;
                case "buoyage-direction":
                    l.buoyage = value;
            }

            l.updateGUI();
        },

        setGUIState: function () {

            // Network direction
            var windpoint = l.networkDirection;

            if (l.networkDirection !== null) {
                $("#network-direction-" + windpoint ).prop("checked", true);
            }

            // Flow direction
            var flow=  l.flowDirection;
            if (l.flowDirection !== null) {
                $("#flow-direction-" + flow ).prop("checked", true);
            }

            // Buoyage
            var buoyn = l.buoyage;
            if (l.buoyage !== null ){
                $("#buoyage-direction-"+ flow + "-" + buoyn).prop("checked",true);
            }

        },

        updateGUI: function(){

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
                    case "n":
                    case "z":
                        $("#label-flow-direction-n, #label-flow-direction-z").show();
                        $("#label-flow-direction-o, #label-flow-direction-w").hide();
                        break;
                    case "o":
                    case "w":
                        $("#label-flow-direction-n, #label-flow-direction-z").hide();
                        $("#label-flow-direction-o, #label-flow-direction-w").show();
                        break;
                }
            }

            // Enable / Disable buoyage direction, depending on whether flow direction is set
            if (l.flowDirection == null ){
                $("#buoyage-direction").find("input").prop("disabled",true);
                $("#buoyage-direction").find("legend").addClass("disabled");
            } else {
                $("#buoyage-direction").find("input").prop("disabled", false);
                $("#buoyage-direction").find("legend").removeClass("disabled");
            }

            // Hide the buoyage direction buttons that are irrelevant to the given flow direction
            if (l.networkDirection !== null){
                switch (l.networkDirection){
                    case "n":
                    case "z":
                        $("#buoyage-direction-o, #buoyage-direction-w").hide();
                        $("#buoyage-direction-n, #buoyage-direction-z").show();
                        break;
                    case "o":
                    case "w":
                        $("#buoyage-direction-n, #buoyage-direction-z").hide();
                        $("#buoyage-direction-o, #buoyage-direction-w").show();
                        break;
                }
            }

            // Disable the buoyage buttons that are irrelevant to the chosen flow-direction
            var flow = l.flowDirection;
            if (l.flowDirection !== null ){
                $("[id*='buoyage-direction-'] input").prop("disabled",true);
                $("#buoyage-direction-" + flow + " input").prop("disabled",false);
            }

            l.drawExtraImages();
            l.diagramChanged();
        },

        // Draw backgrounds depending on the various options
        drawExtraImages: function () {
            var l = libConfigBridges;
            var images = [];
            var positions = []
            var sizes = [];
            var flowIndex = null;

            // Wind points
            if (l.flowDirection !== null ) {
                flowIndex = ["n", "o", "z", "w"].indexOf(l.flowDirection);

                images = l.arrayRotate(["n.svg", "o.svg", "z.svg", "w.svg"], flowIndex);
                positions = ["top", "right", "bottom", "left"];
                sizes = ["24px 24px", "24px 24px", "24px 24px", "24px 24px"];

                // Buoyns
                if (l.buoyage !== null && l.buoyage !== "geen"){
                    switch(l.buoyage){
                        case "rood-rechts":
                            pushImage("betonning-rood-rechts.svg", "contain","center")

                            break;
                        case "rood-links":
                            pushImage("betonning-rood-links.svg", "contain","center")

                            break;
                    }
                }

                // "Afvaart" en "Opvaart
                if (l.buoyage !== null) {
                    switch (l.buoyage) {
                        case "geen":
                        case "rood-rechts":
                            pushImage("afvaart-omhoog.svg", "96px 24px", "left 40% bottom 6px");
                            break;
                        case "rood-links":
                            pushImage("afvaart-omlaag.svg", "96px 24px", "left 40% bottom 6px");
                    }
                }
            }

            // Flow direction
            pushImage("stroomafwaarts.svg","168px 24px","right 35% bottom 6px");

            l.$diagram.css({
                "background-image": images.map(l.getCssAssetsUrl).join((", ")),
                "background-position": positions.join(","),
                "background-size": sizes.join(",")
            });

            // Helper function, pushes an image onto the image-stack
            function pushImage(name,size,position){
                images.push(name);
                sizes.push(size);
                positions.push(position);
            }
        },


        // HELPER FUNCTIONS

        // Helper function to construct a css-style url for an ui-image.
        getCssUrl: function (filename){
            var l = libConfigBridges;

            // Returns for example: url("to/images/folder/filename.jpg")
            return "url("+l.path.folderImages + filename + ")";
        },

        // Helper function to construct a css-style url for an assets. (also an image)
        getCssAssetsUrl: function(filename){
            return "url("+l.path.folderAssets + filename + ")";
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
        },

        // Helper function to rotate an array
        arrayRotate: function(array, n) {
            return array.slice(n, array.length).concat(array.slice(0, n));
        },

        /**
         * detect IE
         * returns version of IE or false, if browser is not Internet Explorer
         */
        detectIE: function() {
            var ua = window.navigator.userAgent;

            var msie = ua.indexOf('MSIE ');
            if (msie > 0) {
                // IE 10 or older => return version number
                return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
            }

            var trident = ua.indexOf('Trident/');
            if (trident > 0) {
                // IE 11 => return version number
                var rv = ua.indexOf('rv:');
                return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
            }

            var edge = ua.indexOf('Edge/');
            if (edge > 0) {
                // Edge (IE 12+) => return version number
                return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
            }

            // other browser
            return false;
        }
    }
})(window);
