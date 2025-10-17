function setupLogicCircuit(diagram, $) {
    const red = '#ef4444';
    const green = '#22c55e';
    const gray = '#e5e7eb';
    const darkGray = '#6b7280';

    diagram.linkTemplate = $(go.Link, { 
            routing: go.Routing.Orthogonal, 
            curve: go.Curve.JumpOver, 
            corner: 5, 
            reshapable: true, 
            relinkableFrom: true, 
            relinkableTo: true 
        },
        new go.Shape({ name: 'SHAPE', strokeWidth: 2, stroke: red }));

    const nodeStyle = () => ({ locationSpot: go.Spot.Center, selectionAdorned: false });
    const portStyle = (input, spot) => ({ figure: 'Rectangle', desiredSize: new go.Size(6, 6), fill: darkGray, fromLinkable: !input, fromSpot: spot, toLinkable: input, toSpot: spot, toMaxLinks: input ? 1 : Infinity, cursor: "pointer" });
    const shapeStyle = () => ({ name: 'NODESHAPE', fill: 'white', stroke: darkGray, desiredSize: new go.Size(40, 40), strokeWidth: 2 });
    const outBrush = new go.Brush('Radial', { 0.0: 'rgba(255, 255, 255, 0.2)', 0.5: 'rgba(34, 197, 94, 0.8)', 0.75: 'rgba(34, 197, 94, 0.5)', 0.85: 'rgba(34, 197, 94, 0.2)', 0.95: 'rgba(34, 197, 94, 0.1)', 1: 'rgba(34, 197, 94, 0)', start: new go.Spot(0.5, 0.8) });

    diagram.nodeTemplateMap.add("input",
        $(go.Node, "Spot", nodeStyle(), { click: (e, obj) => { e.diagram.startTransaction("toggle input"); e.diagram.model.setDataProperty(obj.part.data, "isOn", !obj.part.data.isOn); e.diagram.commitTransaction("toggle input"); } },
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, "Circle", { ...shapeStyle(), desiredSize: new go.Size(50, 50)}, new go.Binding("fill", "isOn", on => on ? "#dcfce7" : "#fee2e2")),
        $(go.TextBlock, { font: "bold 12px sans-serif", editable: true, stroke: "#374151" }, new go.Binding("text", "text")),
        $(go.Shape, "Rectangle", { ...portStyle(false, go.Spot.Right), portId: "" })
    ));

    diagram.nodeTemplateMap.add("output",
        $(go.Node, "Spot", nodeStyle(), new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            $(go.Panel, "Spot",
                $(go.Shape, "RoundedRectangle", { fill: 'transparent', parameter1: Infinity, parameter2: 0b0011, width: 25, height: 22, strokeWidth: 2, stroke: darkGray }),
                $(go.Shape, "Rectangle", { alignment: go.Spot.Bottom, alignmentFocus: new go.Spot(0.5, 0.8), strokeWidth: 0, fill: null, width: 40, height: 43 }, new go.Binding("fill", "isOn", isOn => isOn ? outBrush : "transparent")),
                $(go.Shape, "Rectangle", { ...shapeStyle(), width: 32, height: 15, alignment: go.Spot.Bottom, alignmentFocus: new go.Spot(0.5, 0, 0, 2)})
            ),
            $(go.TextBlock, { font: "bold 12px sans-serif", editable: true, stroke: "#374151", alignment: new go.Spot(0.5, 0.3) }, new go.Binding("text", "text")),
            $(go.Shape, portStyle(true, go.Spot.Left)).set({ portId: '', alignment: go.Spot.Left })
    ));

    diagram.nodeTemplateMap.add("switch",
        $(go.Node, "Vertical", nodeStyle(), { click: (e, obj) => { e.diagram.startTransaction("toggle switch"); e.diagram.model.setDataProperty(obj.part.data, "isOn", !obj.part.data.isOn); e.diagram.commitTransaction("toggle switch"); } },
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.TextBlock, { font: "bold 12px sans-serif", editable: true, margin: new go.Margin(0,0,4,0), stroke: "#374151" }, new go.Binding("text", "text")),
        $(go.Panel, "Auto",
            $(go.Shape, "Rectangle", { stroke: darkGray, strokeWidth: 1, fill: "white", width: 30, height: 50 }),
            $(go.Shape, "Rectangle", { stroke: darkGray, strokeWidth: 1, width: 20, height: 20 },
                new go.Binding("fill", "isOn", on => on ? "#86efac" : "#e5e7eb"),
                new go.Binding("alignment", "isOn", on => on ? go.Spot.Top : go.Spot.Bottom)
            )
        ),
        $(go.Shape, "Rectangle", { ...portStyle(false, go.Spot.Bottom), portId: "out" })
    ));

    const makeGateTemplate = (shape, text) => {
        const node = $(go.Node, "Spot", nodeStyle(), new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            $(go.Shape, shape, { ...shapeStyle(), desiredSize: new go.Size(60, 40) }),
            $(go.TextBlock, text, { font: "bold 11px sans-serif", stroke: "#374151" }),
            $(go.Shape, "Rectangle", { ...portStyle(true, go.Spot.Left), portId: "in1", alignment: new go.Spot(0, 0.3) }),
            $(go.Shape, "Rectangle", { ...portStyle(false, go.Spot.Right), portId: "out" })
        );
        if (text !== "NOT") { node.add($(go.Shape, "Rectangle", { ...portStyle(true, go.Spot.Left), portId: "in2", alignment: new go.Spot(0, 0.7) })); }
        return node;
    };

    diagram.nodeTemplateMap.add("and", makeGateTemplate("AndGate", "AND"));
    diagram.nodeTemplateMap.add("or", makeGateTemplate("OrGate", "OR"));
    diagram.nodeTemplateMap.add("not", makeGateTemplate("Inverter", "NOT"));
    diagram.nodeTemplateMap.add("xor", makeGateTemplate("XorGate", "XOR"));
    diagram.nodeTemplateMap.add("nand", makeGateTemplate("NandGate", "NAND"));
    diagram.nodeTemplateMap.add("nor", makeGateTemplate("NorGate", "NOR"));
    diagram.nodeTemplateMap.add("xnor", makeGateTemplate("XnorGate", "XNOR"));

    function updateLogic() {
        diagram.skipsUndoManager = true;
        diagram.nodes.each(node => {
            const data = node.data; if (!data) return;
            let linksInto = node.findLinksInto(); let result = false;
            const linkIsTrue = (link) => link.findObject("SHAPE").stroke === green;
            switch (data.category) {
                case "and": result = linksInto.count > 0 && linksInto.all(linkIsTrue); break;
                case "or": result = linksInto.any(linkIsTrue); break;
                case "xor": result = linksInto.filter(linkIsTrue).count % 2 === 1; break;
                case "nand": result = !(linksInto.count > 0 && linksInto.all(linkIsTrue)); break;
                case "nor": result = !linksInto.any(linkIsTrue); break;
                case "xnor": result = linksInto.filter(linkIsTrue).count % 2 === 0; break;
                case "not": result = !linksInto.any(linkIsTrue); break;
                case "output": if (data.isOn !== linksInto.any(linkIsTrue)) { diagram.model.setDataProperty(data, "isOn", linksInto.any(linkIsTrue)); } return;
                case "input": case "switch": result = data.isOn; break;
            }
            node.findLinksOutOf().each(l => { const newStroke = result ? green : red; if (l.findObject("SHAPE").stroke !== newStroke) { l.findObject("SHAPE").stroke = newStroke; } });
        });
        diagram.skipsUndoManager = false;
    }

    diagram.addDiagramListener("ChangedSelection", updateLogic);
    diagram.addModelChangedListener( e => { if (e.isTransactionFinished) { updateLogic(); } });
    
    function loop() { setTimeout(() => { updateLogic(); loop(); }, 250); }
    loop();
    
    diagram.layout = $(go.LayeredDigraphLayout, { direction: 0, layerSpacing: 50 });
}
