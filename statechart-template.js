function setupStateChart(diagram, $) {
    const colors = { pink: '#fecdd3', blue: '#dbeafe', green: '#d1fae5', yellow: '#fef3c7' };

    diagram.nodeTemplate =
        $(go.Node, "Auto",
            { isShadowed: true, shadowBlur: 1, shadowOffset: new go.Point(2, 2), shadowColor: "rgba(0,0,0,.1)" },
            new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
            $(go.Shape, "RoundedRectangle", {
                strokeWidth: 1.5, fill: colors.blue, portId: "",
                fromLinkable: true, fromLinkableSelfNode: true, fromLinkableDuplicates: true,
                toLinkable: true, toLinkableSelfNode: true, toLinkableDuplicates: true,
                cursor: "pointer"
            },
                new go.Binding("fill", "type", type => (type === "Start") ? colors.green : (type === "End") ? colors.pink : colors.blue),
                new go.Binding("figure", "type", type => (type === "Start" || type === "End") ? "Circle" : "RoundedRectangle")
            ),
            $(go.TextBlock,
                { margin: 10, font: "bold 14px sans-serif", stroke: '#374151', editable: true },
                new go.Binding("text").makeTwoWay())
        );

    diagram.nodeTemplate.selectionAdornmentTemplate =
        $(go.Adornment, "Spot",
            $(go.Panel, "Auto",
                $(go.Shape, "RoundedRectangle", { fill: null, stroke: "#2563eb", strokeWidth: 3 }),
                $(go.Placeholder)
            ),
            $("Button",
                { alignment: go.Spot.TopRight, click: addNodeAndLinkStateChart },
                new go.Shape("PlusLine", { width: 8, height: 8, stroke: "black", strokeWidth: 2 }))
        );

    diagram.linkTemplate =
        $(go.Link,
            { curve: go.Curve.Bezier, adjusting: go.LinkAdjusting.Stretch, reshapable: true, relinkableFrom: true, relinkableTo: true, fromShortLength: 8 },
            new go.Binding("points").makeTwoWay(),
            $(go.Shape, { strokeWidth: 2, stroke: "#9ca3af" }),
            $(go.Shape, { toArrow: "Standard", stroke: null, fill: "#9ca3af", scale: 1.5 }),
            $(go.Panel, "Auto", { cursor: "pointer" },
                $(go.Shape, "RoundedRectangle", { fill: "#f3f4f6", strokeWidth: 0 }),
                $(go.TextBlock,
                    { textAlign: "center", font: "12px sans-serif", stroke: "#374151", margin: 4, editable: true },
                    new go.Binding("text", "text").makeTwoWay())
            )
        );

    diagram.layout = $(go.ForceDirectedLayout);
}

function addNodeAndLinkStateChart(e, obj) {
    const adornment = obj.part;
    const diagram = e.diagram;
    diagram.startTransaction('Add State');
    const fromNode = adornment.adornedPart;
    const fromData = fromNode.data;
    const toData = { text: 'new state' };
    const p = fromNode.location.copy();
    p.x += 200;
    toData.loc = go.Point.stringify(p);
    const model = diagram.model;
    model.addNodeData(toData);
    const linkdata = {
        from: model.getKeyForNodeData(fromData),
        to: model.getKeyForNodeData(toData),
        text: 'transition'
    };
    model.addLinkData(linkdata);
    const newnode = diagram.findNodeForData(toData);
    diagram.select(newnode);
    diagram.commitTransaction('Add State');
    if (!diagram.viewportBounds.containsRect(newnode.actualBounds)) {
        diagram.commandHandler.scrollToPart(newnode);
    }
}
