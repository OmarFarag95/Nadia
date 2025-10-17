function setupPieChart(myDiagram, $) {
    const pieRadius = 150;

    myDiagram.nodeTemplate =
      $(go.Node, 'Vertical', { 
          deletable: false,
          locationSpot: go.Spot.Center 
        },
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.TextBlock, {
            font: 'bold 18px Source Sans 3, sans-serif',
            margin: 10,
            stroke: 'var(--dark-text)',
            editable: true
          })
          .bind('text'),
        $(go.Panel, 'Horizontal',
          $(go.Panel, 'Position', {
              name: 'PIE',
              desiredSize: new go.Size(pieRadius * 2.2, pieRadius * 2.2),
              itemTemplate:
                $(go.Panel, {
                    click: (e, slice) => {
                        const sliceShape = slice.findObject('SLICE');
                        myDiagram.skipsUndoManager = true;
                        if (sliceShape.stroke === 'transparent') {
                            sliceShape.stroke = go.Brush.darkenBy(slice.data.color, 0.4);
                            const nodedata = findNodeDataForSlice(slice.data);
                            if (nodedata) {
                                const sliceindex = nodedata.slices.indexOf(slice.data);
                                const angles = getAngles(nodedata, sliceindex);
                                if (angles.sweep !== 360) {
                                    const angle = angles.start + angles.sweep / 2;
                                    let offsetPoint = new go.Point(pieRadius / 10, 0);
                                    slice.position = offsetPoint.rotate(angle).offset(pieRadius / 10, pieRadius / 10);
                                }
                            }
                        } else {
                            sliceShape.stroke = 'transparent';
                            slice.position = new go.Point(pieRadius / 10, pieRadius / 10);
                        }
                        myDiagram.skipsUndoManager = false;
                    },
                    toolTip:
                        $('ToolTip',
                            $(go.TextBlock, { font: '10pt Source Sans 3, sans-serif', margin: 4 })
                            .bind('text', '', data => {
                                const nodedata = findNodeDataForSlice(data);
                                if (nodedata) {
                                    const percent = Math.round((data.count / getTotalCount(nodedata)) * 10000) / 100;
                                    return `${data.text}: ${percent}%`;
                                }
                                return '';
                            })
                        )
                })
                .bind('position', '', positionSlice)
                .add(
                    $(go.Shape, { name: 'SLICE', strokeWidth: 2, stroke: 'transparent', isGeometryPositioned: true })
                    .bind('fill', 'color')
                    .bind('geometry', '', makeGeo)
                )
            })
            .bind('itemArray', 'slices'),
          $(go.Panel, 'Table', {
              margin: 5,
              itemTemplate:
                $(go.Panel, 'TableRow',
                    $(go.TextBlock, { column: 0, font: '10pt Source Sans 3, sans-serif', alignment: go.Spot.Left, margin: 5 })
                        .bind('text'),
                    $(go.Panel, 'Auto', { column: 1 },
                        $(go.Shape, { fill: '#F2F2F2' }),
                        $(go.TextBlock, { font: '10pt Source Sans 3, sans-serif', textAlign: 'right', margin: 2, wrap: go.Wrap.None, width: 40, editable: true, isMultiline: false, textValidation: (tb, oldstr, newstr) => !isNaN(parseInt(newstr, 10)) && parseInt(newstr, 10) >= 0 })
                            .bindTwoWay('text', 'count', null, count => parseInt(count, 10))
                    ),
                    $(go.Panel, 'Horizontal', { column: 2 },
                        $('Button', { click: incrementCount }, $(go.Shape, 'PlusLine', { margin: 3, desiredSize: new go.Size(7, 7) })),
                        $('Button', { click: decrementCount }, $(go.Shape, 'MinusLine', { margin: 3, desiredSize: new go.Size(7, 7) }))
                    )
                )
            })
            .bind('itemArray', 'slices')
        )
    );
    
    myDiagram.model.addChangedListener(e => {
        if (e.change === go.ChangeType.Property && e.propertyName === 'count') {
            const slicedata = e.object;
            const nodedata = findNodeDataForSlice(slicedata);
            if (nodedata) {
                myDiagram.model.updateTargetBindings(nodedata, 'count');
                const sliceindex = nodedata.slices.indexOf(slicedata);
                const slice = myDiagram.findNodeForKey(nodedata.key).findObject('PIE').elt(sliceindex);
                const sliceshape = slice.findObject('SLICE');
                sliceshape.visible = slicedata.count > 0;
            }
        }
    });

    function findNodeDataForSlice(slice) {
        const arr = myDiagram.model.nodeDataArray;
        for (let i = 0; i < arr.length; i++) {
            const data = arr[i];
            if (data.slices && data.slices.indexOf(slice) >= 0) return data;
        }
    }

    function getTotalCount(nodedata) {
        let total = 0;
        nodedata.slices.forEach(s => total += s.count);
        return total;
    }

    function getAngles(nodedata, index) {
        let total = getTotalCount(nodedata);
        if (total === 0) return { start: -90, sweep: 0 };
        let startAngle = -90;
        for (let i = 0; i < index; i++) {
            startAngle += (360 * nodedata.slices[i].count) / total;
        }
        return { start: startAngle, sweep: (360 * nodedata.slices[index].count) / total };
    }

    function makeGeo(data) {
        const nodedata = findNodeDataForSlice(data);
        const sliceindex = nodedata.slices.indexOf(data);
        const angles = getAngles(nodedata, sliceindex);
        return new go.Geometry()
            .add(new go.PathFigure(pieRadius, pieRadius)
                .add(new go.PathSegment(go.SegmentType.Arc, angles.start, angles.sweep, pieRadius, pieRadius, pieRadius, pieRadius).close()));
    }

    function positionSlice(data, obj) {
        const nodedata = findNodeDataForSlice(data);
        const sliceindex = nodedata.slices.indexOf(data);
        const angles = getAngles(nodedata, sliceindex);
        const selected = obj.findObject('SLICE').stroke !== 'transparent';
        if (selected && angles.sweep !== 360) {
            let offsetPoint = new go.Point(pieRadius / 10, 0);
            offsetPoint = offsetPoint.rotate(angles.start + angles.sweep / 2);
            offsetPoint = offsetPoint.offset(pieRadius / 10, pieRadius / 10);
            return offsetPoint;
        }
        return new go.Point(pieRadius / 10, pieRadius / 10);
    }

    function incrementCount(e, obj) {
        myDiagram.model.commit(m => {
            const slicedata = obj.panel.panel.data;
            m.set(slicedata, 'count', slicedata.count + 1);
        }, 'increment count');
    }

    function decrementCount(e, obj) {
        myDiagram.model.commit(m => {
            const slicedata = obj.panel.panel.data;
            if (slicedata.count > 0) m.set(slicedata, 'count', slicedata.count - 1);
        }, 'decrement count');
    }
}
