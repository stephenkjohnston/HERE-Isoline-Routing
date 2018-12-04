// @flow
import { PureComponent, createRef, createElement } from 'react';

// constants
import {
    APP_ID,
    APP_CODE
} from 'constants/api';

// utils
import { toLineString } from 'utils/map';

// types
import { GeoPoint } from 'types/geo-point';

type MapProps = {};

const H = window.H;

export default class Map extends PureComponent<MapProps> {
    _center: GeoPoint = { lat: 47.622451, lng: -122.352033 };
    _mapRef: { current: null | HTMLDivElement } = createRef();
    _platform: H.map.Platform;
    _router: H.service.RoutingService;
    _map: H.Map;
    _ui: H.ui.UI;
    _behavior: H.mapevents.Behavior;
    _isolines = [
        { range:  "5", rgba: {r: 255, g: 241, b: 102, a: 0.5}, hex: "#fff166", text: "In 5 min."},
        { range:  "10", rgba: {r: 248, g: 177, b: 117, a: 0.5}, hex: "#f8b175", text: "10 min."},
        { range:  "15", rgba: {r: 244, g: 114, b: 131, a: 0.5}, hex: "#f27283", text: "15 min."},
        { range:  "20", rgba: {r: 175, g:  54, b: 120, a: 0.5}, hex: "#af3678", text: "20 min."}
    ];
    _ranges = this._isolines.map(color => color.range);

    componentDidMount() {
        this._platform = new H.service.Platform({
            app_id: APP_ID,
            app_code: APP_CODE
        });

        this._router = this._platform.getRoutingService();

        const defaultLayers = this._platform.createDefaultLayers();
        this._map = new H.Map(
            this._mapRef.current,
            defaultLayers.normal.map,
            {
                zoom: 13,
                center: this._center
            }
        );
        
        this._ui = H.ui.UI.createDefault(this._map, defaultLayers);
        this._behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this._map));

        this._ranges = this._isolines.map(color => color.range);

        window.addEventListener('resize', () => this._map.getViewPort().resize());
        this.getIsolines();
    }

    render() {
        return createElement('div', {
            id: 'map',
            ref: this._mapRef,
            style: {
                width: '100vw',
                height: '100vh'
            }
        });
    }

    getIsolines() {
        const { lat, lng } = this._center;
        let params = {
            "mode": "fastest;car;traffic:enabled",
            "start": `${lat},${lng}`,
            "range": this._ranges.map(range => ~~range * 60).join(','),
            "rangetype": "time",
            "departure": "now"
        }
        this._map.removeObjects(this._map.getObjects());
        this._router.calculateIsoline(
            params,
            data => {
                if(data.response) {
                    let center = new H.geo.Point(data.response.center.latitude, data.response.center.longitude);
                    let isolineCoords = this._ranges.map((range, i) => {
                            return data.response.isoline[i].component[0].shape
                        });
                    let isolineCenter;
                    
                    const isolinePolygons = this._ranges.map((range, i) => {
                        const color = this._isolines.find(c => Number(c.range) * 60 === data.response.isoline[i].range).rgba;
                        const shapeHoles = isolineCoords[i - 1];
                        const shapePolygon = i > 0 ? new H.geo.Polygon(
                            toLineString(isolineCoords[i]),
                            shapeHoles ? [toLineString(shapeHoles)] : ''
                        ) : toLineString(isolineCoords[i]);
                        const isolinePolygon = new H.map.Polygon(
                            shapePolygon,
                            {
                                style: {
                                    fillColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
                                    strokeColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a + 0.1})`,
                                    lineWidth: 1
                                } 
                            }
                        );

                        return isolinePolygon;
                    });
                    
                    isolineCenter = new H.map.Marker(this._center);
                    isolinePolygons.reverse().forEach(polygon => {
                        this._map.addObject(polygon);
                    });
                    this._map.addObject(isolineCenter);
                }
            },
            error => {
                console.error(error)
            }
        );
    }
}