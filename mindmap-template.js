function setupMindmap(diagram, $) {
    diagram.layout = $(go.TreeLayout, {
        angle: 90,
        arrangement: go.TreeLayout.ArrangementFixedRoots,
        // properties for most of the tree:
        compaction: go.TreeLayout.CompactionNone,
        layerSpacing: 35,
        // properties for the "subtrees":
        alternateAngle: 90,
        alternateAlignment: go.TreeLayout.AlignmentBus,
        alternateNodeSpacing: 20
    });

    // This function is responsible for splitting the children of the root node
    // into two separate branches, left and right.
    function CustomTreeLayout() {
        go.TreeLayout.call(this);
    }
    go.Diagram.inherit(CustomTreeLayout, go.TreeLayout);

    CustomTreeLayout.prototype.makeNetwork = function(coll) {
        const net = go.TreeLayout.prototype.makeNetwork.call(this, coll);
        const root = net.findVertex(this.diagram.findNodeForKey(0));
        if (root !== null) {
            // split the children of the root node into two groups
            const children = root.children;
            let right = [];
            let left = [];
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                const dir = child.node.data.dir;
                if (dir === "left") {
                    left.push(child);
                } else {
                    right.push(child);
                }
            }
            // re-assign the children of the root node
            root.children = right.concat(left);
        }
        return net;
    };

    CustomTreeLayout.prototype.assignTreeVertexValues = function(v) {
        // for the root node, assign the angle based on the child's "dir" property
        if (v.node && v.parent === null) {
            v.children.forEach(c => {
                c.angle = (c.node.data.dir === "left") ? 180 : 0;
            });
        }
        go.TreeLayout.prototype.assignTreeVertexValues.call(this, v);
    };

    diagram.layout = new CustomTreeLayout();

    diagram.nodeTemplate =
        $(go.Node, "Auto",
            { locationSpot: go.Spot.Center },
            $(go.Shape, "RoundedRectangle",
                {
                    fill: "white", // default color
                    strokeWidth: 0,
                    stroke: "#ad8585ff"
                },
                new go.Binding("fill", "brush")
            ),
            $(go.TextBlock,
                { margin: 10, font: "bold 14px sans-serif", stroke: "#333", editable: true },
                new go.Binding("text").makeTwoWay()
            )
        );

    diagram.linkTemplate =
        $(go.Link,
            {
                routing: go.Link.Orthogonal,
                corner: 10,
                fromShortLength: -2,
                toShortLength: -2,
                reshapable: true,
                resegmentable: true
            },
            $(go.Shape, { strokeWidth: 2, stroke: "#555" })
        );
}

